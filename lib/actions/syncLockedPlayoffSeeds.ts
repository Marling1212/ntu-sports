"use server";

import { createClient } from "@/lib/supabase/server";
import { getSportMatches } from "@/lib/utils/getSportEvent";
import { computeLockedSeeds, computeStandings } from "@/lib/standings";

/**
 * Run lock detection and persist (seed, group) → playoff match slots.
 * Call only from admin flows (e.g. after saving a regular-season result).
 * Public pages do not run this — viewers see data already written here.
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

  let regularForLock = dbMatches
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

  /** Playoff slots reference group 1..N; if bracket only uses group 1, missing group_number on round-0 is treated as one pool. */
  const groupsUsedInPlayoffs = new Set<number>();
  for (const m of dbMatches.filter((x: any) => x.round >= 1)) {
    const g1 = (m as any).slot1_group;
    const g2 = (m as any).slot2_group;
    if (g1 != null && Number(g1) > 0) groupsUsedInPlayoffs.add(Number(g1));
    if (g2 != null && Number(g2) > 0) groupsUsedInPlayoffs.add(Number(g2));
  }
  const maxPlayoffGroup =
    groupsUsedInPlayoffs.size > 0 ? Math.max(...groupsUsedInPlayoffs) : 1;

  const hasNullGroup = regularForLock.some((m) => m.group_number == null || m.group_number === "");
  if (hasNullGroup && maxPlayoffGroup <= 1) {
    regularForLock = regularForLock.map((m) => ({
      ...m,
      group_number: m.group_number != null && m.group_number !== "" ? Number(m.group_number) : 1,
    }));
    await supabase
      .from("matches")
      .update({ group_number: 1 })
      .eq("event_id", eventId)
      .eq("round", 0)
      .is("group_number", null);
  }

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

  const qualifiersPerGroup = (event as any).playoff_qualifiers_per_group || 8;
  const playoffMatches = dbMatches.filter((m: any) => m.round >= 1) as any[];

  let maxSeedNeeded = qualifiersPerGroup;
  for (const m of playoffMatches) {
    if (m.slot1_seed != null && m.slot1_seed > maxSeedNeeded) maxSeedNeeded = m.slot1_seed;
    if (m.slot2_seed != null && m.slot2_seed > maxSeedNeeded) maxSeedNeeded = m.slot2_seed;
  }

  let seedGroupToPlayer = new Map<string, string>();
  try {
    const standingsResult = computeStandings(regularForLock, playersForStandings, (event as any).tiebreaker_config, {
      matchPlayerStats,
      teamMembers,
      registrationType: ((event as any).registration_type as "player" | "team") || "player",
    });
    if (standingsResult && !Array.isArray(standingsResult) && typeof standingsResult === "object") {
      const standingsByGroup = standingsResult as Record<number, { player: { id: string } }[]>;
      for (const [g, rows] of Object.entries(standingsByGroup)) {
        const groupNum = parseInt(g, 10);
        if (Number.isNaN(groupNum) || !Array.isArray(rows)) continue;
        rows.forEach((row: { player?: { id: string } }, idx: number) => {
          if (row?.player?.id && idx < maxSeedNeeded) seedGroupToPlayer.set(`${idx + 1},${groupNum}`, row.player.id);
        });
      }
    } else if (Array.isArray(standingsResult)) {
      standingsResult.forEach((row: { player?: { id: string } }, idx: number) => {
        if (row?.player?.id && idx < maxSeedNeeded) seedGroupToPlayer.set(`${idx + 1},1`, row.player.id);
      });
    }
  } catch (_) {
    // standings failed — locked map still used
  }

  const resolveSlot = (seed: number, group: number) =>
    locked.get(`${seed},${group}`) ?? seedGroupToPlayer.get(`${seed},${group}`) ?? null;

  for (const m of playoffMatches) {
    const updates: { player1_id?: string; player2_id?: string; winner_id?: string; status?: string } = {};
    if (m.slot1_seed != null && m.slot1_group != null) {
      const id = resolveSlot(m.slot1_seed, m.slot1_group);
      if (id) updates.player1_id = id;
    }
    if (m.slot2_seed != null && m.slot2_group != null) {
      const id = resolveSlot(m.slot2_seed, m.slot2_group);
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

  const byRound = playoffMatches.sort((a: any, b: any) => a.round - b.round || a.match_number - b.match_number);
  for (const m of byRound) {
    const winnerId = m.winner_id ?? null;
    if (!winnerId) continue;
    const hasSlot1 = m.slot1_seed != null && m.slot1_group != null;
    const hasSlot2 = m.slot2_seed != null && m.slot2_group != null;
    if (hasSlot1 && hasSlot2) continue;
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
