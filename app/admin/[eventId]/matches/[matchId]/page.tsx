import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MatchDetailContent from "@/components/admin/MatchDetailContent";
import { enrichSeasonPlayMatchesForAdmin } from "@/lib/scheduling/enrichSeasonPlayMatchesForAdmin";

export default async function MatchDetailPage({ 
  params 
}: { 
  params: Promise<{ eventId: string; matchId: string }> 
}) {
  const supabase = await createClient();
  const { eventId, matchId } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  // Check if user is an organizer for this event
  const { data: organizer } = await supabase
    .from("organizers")
    .select("*")
    .eq("user_id", user.id)
    .eq("event_id", eventId)
    .single();

  if (!organizer) {
    return (
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-red-600 mb-4">Access Denied</h1>
        <p>You are not an authorized organizer for this event.</p>
      </div>
    );
  }

  // Get event details
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  // Get match details with player information
  const { data: match } = await supabase
    .from("matches")
    .select(`
      *,
      player1:players!matches_player1_id_fkey(id, name, seed, department, type),
      player2:players!matches_player2_id_fkey(id, name, seed, department, type),
      winner:players!matches_winner_id_fkey(id, name, seed),
      slot:event_slots(id, slot_date, start_time, end_time, code, court_id)
    `)
    .eq("id", matchId)
    .single();

  if (!match) {
    return (
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-red-600 mb-4">Match Not Found</h1>
        <p>The match you are looking for does not exist.</p>
      </div>
    );
  }

  const { data: allEventPlayers } = await supabase
    .from("players")
    .select("*")
    .eq("event_id", eventId)
    .order("name", { ascending: true });

  const { data: allEventMatchesRaw } = await supabase
    .from("matches")
    .select(`
      *,
      player1:players!matches_player1_id_fkey(id, name, seed, department, type),
      player2:players!matches_player2_id_fkey(id, name, seed, department, type),
      winner:players!matches_winner_id_fkey(id, name, seed)
    `)
    .eq("event_id", eventId)
    .neq("status", "bye")
    .order("round", { ascending: true })
    .order("match_number", { ascending: true });

  let matchPlayerStatsForEnrich: unknown[] = [];
  if (event?.tournament_type === "season_play" && (allEventMatchesRaw?.length ?? 0) > 0) {
    const { data: stats } = await supabase
      .from("match_player_stats")
      .select("*")
      .in("match_id", (allEventMatchesRaw ?? []).map((m) => m.id));
    matchPlayerStatsForEnrich = stats || [];
  }

  let teamMembersFlatForEnrich: unknown[] = [];
  if (event?.registration_type === "team" && (allEventPlayers?.length ?? 0) > 0) {
    const teamIds = (allEventPlayers ?? []).filter((p) => p.type === "team").map((p) => p.id);
    if (teamIds.length > 0) {
      const { data: members } = await supabase.from("team_members").select("id, player_id").in("player_id", teamIds);
      teamMembersFlatForEnrich = members || [];
    }
  }

  const enrichedEventMatches =
    event?.tournament_type === "season_play" && (allEventMatchesRaw?.length ?? 0) > 0
      ? enrichSeasonPlayMatchesForAdmin(allEventMatchesRaw as any[], allEventPlayers ?? [], event as any, {
          matchPlayerStats: matchPlayerStatsForEnrich,
          teamMembers: teamMembersFlatForEnrich,
        })
      : allEventMatchesRaw ?? [];

  const enrichedMatch = enrichedEventMatches.find((m) => m.id === matchId);
  const matchForView = enrichedMatch ? { ...match, ...enrichedMatch } : match;

  const playerIds = [matchForView.player1_id, matchForView.player2_id].filter(Boolean) as string[];

  const { data: players } =
    playerIds.length > 0
      ? await supabase.from("players").select("*").in("id", playerIds)
      : { data: [] as any[] };

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

  // Get existing player stats for this match
  const { data: existingStats } = await supabase
    .from("match_player_stats")
    .select("*")
    .eq("match_id", matchId);

  // Get stat definitions for this sport
  const { data: statDefinitions } = await supabase
    .from("sport_stat_definitions")
    .select("*")
    .eq("sport", event?.sport || "")
    .order("display_order", { ascending: true });

  // Get courts
  const { data: courts } = await supabase
    .from("event_courts")
    .select("id, name")
    .eq("event_id", eventId)
    .order("name", { ascending: true });

  // Get slots (with court name for grid)
  const { data: slotsRaw } = await supabase
    .from("event_slots")
    .select("id, slot_date, start_time, end_time, code, court_id")
    .eq("event_id", eventId)
    .order("slot_date", { ascending: true })
    .order("start_time", { ascending: true });
  const courtsList = courts || [];
  type SlotRow = { id: string; slot_date: string; start_time: string; end_time: string; code?: string | null; court_id?: string | null };
  const slots = ((slotsRaw || []) as SlotRow[]).map((s) => ({
    id: s.id,
    slot_date: s.slot_date,
    start_time: s.start_time,
    end_time: s.end_time,
    code: s.code ?? undefined,
    court_id: s.court_id ?? undefined,
    court: s.court_id ? { name: courtsList.find((c: { id: string }) => c.id === s.court_id)?.name ?? "未指定" } : { name: "未指定" },
  }));

  // For postpone grid: all matches in same division + blackout templates
  const matchDivisionId = match.division_id ?? null;
  let scheduleMatchesQuery = supabase
    .from("matches")
    .select(`
      id, player1_id, player2_id, winner_id, score1, score2, group_number,
      slot_id, scheduled_time, status, round, match_number,
      slot1_seed, slot1_group, slot2_seed, slot2_group,
      player1:players!matches_player1_id_fkey(id, name, seed),
      player2:players!matches_player2_id_fkey(id, name, seed),
      winner:players!matches_winner_id_fkey(id, name, seed),
      slot:event_slots(id, slot_date, start_time, end_time, code, court_id)
    `)
    .eq("event_id", eventId)
    .neq("status", "bye")
    .order("scheduled_time", { ascending: true, nullsFirst: false })
    .order("round", { ascending: true })
    .order("match_number", { ascending: true });
  if (matchDivisionId) scheduleMatchesQuery = scheduleMatchesQuery.eq("division_id", matchDivisionId);
  const { data: scheduleMatches } = await scheduleMatchesQuery;

  const { data: blackoutTemplates } = await supabase
    .from("team_blackout_templates")
    .select("player_id, day_of_week, start_time, end_time")
    .eq("event_id", eventId);

  const scheduleIds = new Set((scheduleMatches || []).map((m: { id: string }) => m.id));
  const matchesForGrid = enrichedEventMatches
    .filter((m) => scheduleIds.has(m.id))
    .map((m) => ({
      id: m.id,
      player1_id: m.player1_id,
      player2_id: m.player2_id,
      slot_id: (m as any).slot_id,
      scheduled_time: (m as any).scheduled_time,
      status: m.status,
      round: m.round,
      match_number: m.match_number,
      player1: (m as any).player1,
      player2: (m as any).player2,
    }));

  return (
    <div className="container mx-auto px-4 py-12">
        <MatchDetailContent
          eventId={eventId}
          match={matchForView}
          event={event}
          players={players || []}
          teamMembers={teamMembers}
          statDefinitions={statDefinitions || []}
          existingStats={existingStats || []}
          courts={courts || []}
          slots={slots || []}
          scheduleMatchesForGrid={matchesForGrid}
          blackoutTemplates={blackoutTemplates || []}
        />
    </div>
  );
}

