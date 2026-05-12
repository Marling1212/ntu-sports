import { createClient } from "@/lib/supabase/server";
import { Metadata } from "next";
import PublicNavbar from "@/components/PublicNavbar";
import MatchDetailView from "@/components/MatchDetailView";
import { notFound } from "next/navigation";
import { getMatchRefereesPublicDisplay } from "@/lib/utils/matchRefereesPublicDisplay";
import { getEventForPublicPage, getDivisionIdsForEventAndSport } from "@/lib/utils/getSportEvent";
import { resolvePublicSeasonPlayMatchOpponentIds } from "@/lib/scheduling/publicSeasonPlayMatchOpponents";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sport: string; matchId: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const matchId = resolvedParams.matchId;
  const sportParam = (resolvedParams.sport || "").toLowerCase();
  const sportName = sportParam ? sportParam.charAt(0).toUpperCase() + sportParam.slice(1) : "";

  const supabase = await createClient();
  const { data: match } = await supabase
    .from("matches")
    .select(`
      event_id,
      round,
      player1_id,
      player2_id,
      slot1_seed,
      slot1_group,
      slot2_seed,
      slot2_group,
      player1:players!matches_player1_id_fkey(name),
      player2:players!matches_player2_id_fkey(name)
    `)
    .eq("id", matchId)
    .single();

  if (!match) {
    return { title: 'Match Not Found | NTU Sports' };
  }

  const m = match as any;
  let p1 = m.player1?.name || "TBD";
  let p2 = m.player2?.name || "TBD";
  if (p1 === "TBD" || p2 === "TBD") {
    const { data: eventRow } = await supabase
      .from("events")
      .select("tournament_type, tiebreaker_config, playoff_qualifiers_per_group, registration_type, sport")
      .eq("id", match.event_id)
      .single();
    if (eventRow && (eventRow as any).tournament_type === "season_play" && Number((match as any).round) >= 1) {
      const resolved = await resolvePublicSeasonPlayMatchOpponentIds({
        eventId: match.event_id,
        sportSlug: sportParam,
        match: match as any,
        event: eventRow as any,
      });
      const ids = [resolved.player1_id, resolved.player2_id].filter(Boolean) as string[];
      if (ids.length > 0) {
        const { data: nameRows } = await supabase.from("players").select("id, name").in("id", ids);
        const byId = Object.fromEntries((nameRows || []).map((r: { id: string; name: string }) => [r.id, r.name]));
        if (p1 === "TBD" && resolved.player1_id) p1 = byId[resolved.player1_id] || "TBD";
        if (p2 === "TBD" && resolved.player2_id) p2 = byId[resolved.player2_id] || "TBD";
      }
    }
  }
  const title = `${p1} vs ${p2} | NTU ${sportName}`;
  const description = `View match stats, details, and results for ${p1} vs ${p2} in NTU ${sportName}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
  };
}

export default async function MatchDetailPage(context: any) {
  const supabase = await createClient();
  const params = (await context?.params) || {};
  const searchParams = (await context?.searchParams) || {};
  const sportParam = (params.sport || "").toLowerCase();
  const matchId = params.matchId;
  const preview = searchParams?.preview;

  if (!matchId) {
    notFound();
  }

  // Fetch match by ID only - match may belong to any event of this sport (including older events)
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select(`
      *,
      player1:players!matches_player1_id_fkey(id, name, seed, department, type),
      player2:players!matches_player2_id_fkey(id, name, seed, department, type),
      winner:players!matches_winner_id_fkey(id, name, seed),
      slot:event_slots(
        id,
        slot_date,
        start_time,
        end_time,
        code,
        court_id,
        event_courts!event_slots_court_id_fkey(name)
      )
    `)
    .eq("id", matchId)
    .single();

  if (matchError || !match) {
    notFound();
  }

  // Fetch the event with preview support for hidden events when organizer uses ?preview=1
  const event = await getEventForPublicPage(match.event_id, sportParam, { preview });
  if (!event) notFound();

  // For multi-sport events, match must belong to this sport's division(s)
  const divisionIds = await getDivisionIdsForEventAndSport(event.id, sportParam);
  if (divisionIds.length > 0 && match.division_id != null && !divisionIds.includes(match.division_id)) {
    notFound();
  }
  if (divisionIds.length === 0 && event.sport !== sportParam) notFound();

  const resolvedIds = await resolvePublicSeasonPlayMatchOpponentIds({
    eventId: match.event_id,
    sportSlug: sportParam,
    match: match as any,
    event: event as any,
  });
  const effectiveP1 = resolvedIds.player1_id;
  const effectiveP2 = resolvedIds.player2_id;

  const playerIds = [effectiveP1, effectiveP2].filter(Boolean) as string[];
  let players: any[] = [];
  if (playerIds.length > 0) {
    const { data } = await supabase.from("players").select("*").in("id", playerIds);
    players = data || [];
  }

  const matchForView = {
    ...match,
    player1_id: effectiveP1,
    player2_id: effectiveP2,
    player1: (match as any).player1 ?? players.find((p) => p.id === effectiveP1) ?? null,
    player2: (match as any).player2 ?? players.find((p) => p.id === effectiveP2) ?? null,
  };

  // Get team members if this is a team event
  let teamMembers: Record<string, any[]> = {};
  if (event?.registration_type === 'team' && players) {
    const teamIds = players.filter(p => p.type === 'team').map(p => p.id);
    if (teamIds.length > 0) {
      const { data: members } = await supabase
        .from("team_members")
        .select("*")
        .in("player_id", teamIds)
        .order("jersey_number", { ascending: true, nullsFirst: true })
        .order("name", { ascending: true });

      if (members) {
        members.forEach(member => {
          if (!teamMembers[member.player_id]) {
            teamMembers[member.player_id] = [];
          }
          teamMembers[member.player_id].push(member);
        });
      }
    }
  }

  // Get match player stats
  const { data: matchStats } = await supabase
    .from("match_player_stats")
    .select("*")
    .eq("match_id", matchId);

  // Get stat definitions for this sport
  const { data: statDefinitions } = await supabase
    .from("sport_stat_definitions")
    .select("*")
    .eq("sport", event?.sport || "")
    .order("display_order", { ascending: true });

  const sportName = sportParam ? sportParam.charAt(0).toUpperCase() + sportParam.slice(1) : "";

  const matchReferees = await getMatchRefereesPublicDisplay(match.event_id, matchId);

  return (
    <>
      <PublicNavbar eventName={event?.name} tournamentType={event?.tournament_type} eventId={event?.id} />
      <div className="container mx-auto px-3 sm:px-4 pt-6 pb-24 sm:py-12 pb-[max(2rem,env(safe-area-inset-bottom)+100px)]">
        <MatchDetailView
          match={matchForView}
          event={event}
          players={players || []}
          teamMembers={teamMembers}
          statDefinitions={statDefinitions || []}
          matchStats={matchStats || []}
          sportName={sportName}
          matchReferees={matchReferees}
        />
      </div>
    </>
  );
}

