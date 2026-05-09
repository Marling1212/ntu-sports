import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MatchDetailContent from "@/components/admin/MatchDetailContent";
import { buildPlayoffSlotPlayerResolver } from "@/lib/scheduling/playoffSlotPlayerResolver";

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

  // Get all players for this match (including team members if it's a team event)
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
      slot:event_slots(id, slot_date, start_time, end_time, code, court_id)
    `)
    .eq("event_id", eventId)
    .neq("status", "bye")
    .order("scheduled_time", { ascending: true, nullsFirst: false })
    .order("round", { ascending: true })
    .order("match_number", { ascending: true });
  if (matchDivisionId) scheduleMatchesQuery = scheduleMatchesQuery.eq("division_id", matchDivisionId);
  const { data: scheduleMatches } = await scheduleMatchesQuery;

  const { data: allEventPlayers } = await supabase
    .from("players")
    .select("*")
    .eq("event_id", eventId)
    .order("name", { ascending: true });

  const scheduleMatchIds = (scheduleMatches || []).map((m: { id: string }) => m.id).filter(Boolean);
  let scheduleMatchPlayerStats: any[] = [];
  if (scheduleMatchIds.length > 0) {
    const { data: schedStats } = await supabase.from("match_player_stats").select("*").in("match_id", scheduleMatchIds);
    scheduleMatchPlayerStats = schedStats || [];
  }
  let scheduleTeamMembersFlat: any[] = [];
  if (event?.registration_type === "team" && (allEventPlayers || []).length > 0) {
    const teamIds = (allEventPlayers || []).filter((p: any) => p.type === "team").map((p: any) => p.id);
    if (teamIds.length > 0) {
      const { data: schedMembers } = await supabase.from("team_members").select("id, player_id").in("player_id", teamIds);
      scheduleTeamMembersFlat = schedMembers || [];
    }
  }

  const regularForPostponeGrid = (scheduleMatches || [])
    .filter((m: any) => Number(m.round) === 0)
    .map((m: any) => ({
      player1_id: m.player1_id,
      player2_id: m.player2_id,
      winner_id: m.winner_id,
      score1: m.score1,
      score2: m.score2,
      status: m.status,
      round: 0,
      group_number: m.group_number,
    }));
  const playersForPostponeStandings = (allEventPlayers || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    seed: p.seed,
    school: p.department,
  }));
  const playoffRefsForPostpone = (scheduleMatches || [])
    .filter((m: any) => Number(m.round) >= 1)
    .map((m: any) => ({
      slot1_seed: m.slot1_seed,
      slot1_group: m.slot1_group,
      slot2_seed: m.slot2_seed,
      slot2_group: m.slot2_group,
    }));
  const resolvePostponePlayoffPlayerId =
    (event as any)?.tournament_type === "season_play" && regularForPostponeGrid.length > 0
      ? buildPlayoffSlotPlayerResolver({
          regularRounds: regularForPostponeGrid as any,
          playersForStandings: playersForPostponeStandings as any,
          tiebreakerConfig: (event as any)?.tiebreaker_config,
          playoffQualifiersPerGroup: (event as any)?.playoff_qualifiers_per_group ?? 8,
          matchPlayerStats: scheduleMatchPlayerStats,
          teamMembers: scheduleTeamMembersFlat,
          registrationType: ((event as any)?.registration_type as "player" | "team") || "player",
          sport: (event as any)?.sport,
          playoffMatches: playoffRefsForPostpone,
        })
      : (dbId: string | null | undefined, _s?: unknown, _g?: unknown) => (dbId ? String(dbId) : null);

  const { data: blackoutTemplates } = await supabase
    .from("team_blackout_templates")
    .select("player_id, day_of_week, start_time, end_time")
    .eq("event_id", eventId);

  const matchesForGrid = (scheduleMatches || []).map((m: any) => {
    const p1 = resolvePostponePlayoffPlayerId(m.player1_id, m.slot1_seed, m.slot1_group);
    const p2 = resolvePostponePlayoffPlayerId(m.player2_id, m.slot2_seed, m.slot2_group);
    return {
      id: m.id,
      player1_id: p1 ?? m.player1_id,
      player2_id: p2 ?? m.player2_id,
      slot_id: m.slot_id,
      scheduled_time: m.scheduled_time,
      status: m.status,
      round: m.round,
      match_number: m.match_number,
      player1: m.player1,
      player2: m.player2,
    };
  });

  return (
    <div className="container mx-auto px-4 py-12">
        <MatchDetailContent
          eventId={eventId}
          match={match}
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

