import { createClient } from "@/lib/supabase/server";
import { Metadata } from "next";
import PublicNavbar from "@/components/PublicNavbar";
import MatchDetailView from "@/components/MatchDetailView";
import { notFound } from "next/navigation";
import { getMatchRefereesPublicDisplay } from "@/lib/utils/matchRefereesPublicDisplay";

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
      *,
      player1:players!matches_player1_id_fkey(name),
      player2:players!matches_player2_id_fkey(name)
    `)
    .eq("id", matchId)
    .single();

  if (!match) {
    return { title: 'Match Not Found | NTU Sports' };
  }

  const p1 = match.player1?.name || "TBD";
  const p2 = match.player2?.name || "TBD";
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
  const { getEventForPublicPage, getDivisionIdsForEventAndSport } = await import("@/lib/utils/getSportEvent");
  const event = await getEventForPublicPage(match.event_id, sportParam, { preview });
  if (!event) notFound();

  // For multi-sport events, match must belong to this sport's division(s)
  const divisionIds = await getDivisionIdsForEventAndSport(event.id, sportParam);
  if (divisionIds.length > 0 && match.division_id != null && !divisionIds.includes(match.division_id)) {
    notFound();
  }
  if (divisionIds.length === 0 && event.sport !== sportParam) notFound();

  // Get all players for this match
  const playerIds = [match.player1_id, match.player2_id].filter(Boolean) as string[];
  
  const { data: players } = await supabase
    .from("players")
    .select("*")
    .in("id", playerIds);

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
          match={match}
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

