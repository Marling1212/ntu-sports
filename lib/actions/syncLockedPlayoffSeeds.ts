"use server";

import { createClient } from "@/lib/supabase/server";
import { getSportMatches } from "@/lib/utils/getSportEvent";
import { computeLockedSeeds } from "@/lib/standings";

/**
 * Run lock detection and persist any newly locked (seed, group) into playoff match slots.
 * Call this after updating a regular-season match result (e.g. from MatchesTable).
 */
export async function syncLockedPlayoffSeeds(eventId: string): Promise<void> {
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("tournament_type, tiebreaker_config, playoff_qualifiers_per_group, registration_type")
    .eq("id", eventId)
    .single();

  if (!event || (event as any).tournament_type !== "season_play") return;

  const dbMatches = await getSportMatches(eventId);
  if (!dbMatches?.length) return;

  const { data: dbPlayers } = await supabase
    .from("players")
    .select("id, name, seed, department")
    .eq("event_id", eventId)
    .order("name");

  let matchPlayerStats: any[] = [];
  let teamMembers: any[] = [];

  const { data: stats } = await supabase
    .from("match_player_stats")
    .select("*")
    .in("match_id", dbMatches.map((m: any) => m.id));
  matchPlayerStats = stats || [];

  if ((event as any).registration_type === "team" && dbPlayers?.length) {
    const teamIds = dbPlayers.filter((p: any) => p.type === "team").map((p: any) => p.id);
    if (teamIds.length > 0) {
      const { data: members } = await supabase
        .from("team_members")
        .select("id, player_id")
        .in("player_id", teamIds);
      teamMembers = members || [];
    }
  }

  const regularForLock = dbMatches
    .filter((m: any) => m.round === 0)
    .map((m: any) => ({
      player1_id: m.player1_id,
      player2_id: m.player2_id,
      winner_id: m.winner_id,
      score1: m.score1,
      score2: m.score2,
      status: m.status,
      round: m.round,
      group_number: m.group_number,
    }));

  const playersForStandings = (dbPlayers || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    seed: p.seed,
    school: p.department,
  }));

  const locked = computeLockedSeeds(
    regularForLock,
    playersForStandings,
    (event as any).tiebreaker_config,
    {
      maxSeed: (event as any).playoff_qualifiers_per_group || 8,
      matchPlayerStats,
      teamMembers,
      registrationType: ((event as any).registration_type as "player" | "team") || "player",
    }
  );

  const playoffMatches = dbMatches.filter((m: any) => m.round >= 1) as any[];

  for (const m of playoffMatches) {
    const updates: { player1_id?: string; player2_id?: string; winner_id?: string; status?: string } = {};
    if (m.slot1_seed != null && m.slot1_group != null && !m.player1_id) {
      const id = locked.get(`${m.slot1_seed},${m.slot1_group}`);
      if (id) updates.player1_id = id;
    }
    if (m.slot2_seed != null && m.slot2_group != null && !m.player2_id) {
      const id = locked.get(`${m.slot2_seed},${m.slot2_group}`);
      if (id) updates.player2_id = id;
    }
    const hasSlot1 = m.slot1_seed != null && m.slot1_group != null;
    const hasSlot2 = m.slot2_seed != null && m.slot2_group != null;
    const isByeMatch = !hasSlot1 || !hasSlot2;
    if (isByeMatch && (updates.player1_id || updates.player2_id || m.player1_id || m.player2_id)) {
      const winnerId = updates.player1_id ?? updates.player2_id ?? m.player1_id ?? m.player2_id;
      if (winnerId) {
        updates.winner_id = winnerId;
        updates.status = "bye";
      }
    } else if (m.status === "bye" && (updates.player1_id || updates.player2_id)) {
      updates.winner_id = updates.player1_id ?? updates.player2_id!;
    }
    if (Object.keys(updates).length > 0) {
      await supabase.from("matches").update(updates).eq("id", m.id);
      Object.assign(m, updates);
    }
  }

  // Push BYE winners into the next round (so the bracket shows them advanced)
  const byRound = playoffMatches.sort((a: any, b: any) => a.round - b.round || a.match_number - b.match_number);
  for (const m of byRound) {
    const winnerId = m.winner_id ?? null;
    if (!winnerId) continue;
    const hasSlot1 = m.slot1_seed != null && m.slot1_group != null;
    const hasSlot2 = m.slot2_seed != null && m.slot2_group != null;
    if (hasSlot1 && hasSlot2) continue; // both sides filled = normal match, advancement handled elsewhere
    const nextRound = m.round + 1;
    const nextMatchNum = Math.ceil(m.match_number / 2);
    const isPlayer1Slot = m.match_number % 2 === 1;
    const nextMatch = playoffMatches.find((n: any) => n.round === nextRound && n.match_number === nextMatchNum);
    if (!nextMatch) continue;
    const nextUpdates: { player1_id?: string; player2_id?: string } = {};
    if (isPlayer1Slot && !nextMatch.player1_id) nextUpdates.player1_id = winnerId;
    if (!isPlayer1Slot && !nextMatch.player2_id) nextUpdates.player2_id = winnerId;
    if (Object.keys(nextUpdates).length > 0) {
      await supabase.from("matches").update(nextUpdates).eq("id", nextMatch.id);
      Object.assign(nextMatch, nextUpdates);
    }
  }
}
