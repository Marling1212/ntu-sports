"use server";

import { createClient } from "@/lib/supabase/server";
import { getSportMatches } from "@/lib/utils/getSportEvent";
import { computeLockedSeeds, computeStandings, normalizeTiebreakerConfig } from "@/lib/standings";

const DECIDED = new Set(["completed", "forfeit", "walkover"]);

/**
 * Run lock detection and persist (seed, group) → playoff match slots.
 * Mid-season: only mathematically locked seeds get real names; others stay empty (UI shows Seed N Group G).
 * After every regular-season game is decided: fill all seed slots from final standings.
 * True structural byes (one side has no seed slot) still auto-advance.
 */
export async function syncLockedPlayoffSeeds(eventId: string): Promise<void> {
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("tournament_type, tiebreaker_config, playoff_qualifiers_per_group, registration_type, sport")
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

  const allRegularComplete =
    regularForLock.length > 0 && regularForLock.every((m) => DECIDED.has(m.status));

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
      sport: (event as any).sport as string | undefined,
    }
  );

  const qualifiersPerGroup = (event as any).playoff_qualifiers_per_group || 8;
  const playoffMatches = dbMatches.filter((m: any) => m.round >= 1) as any[];

  const tiebreakerCfg = normalizeTiebreakerConfig((event as any).tiebreaker_config);
  const isAdminDecide = tiebreakerCfg.final_tiebreaker === "admin_decide";

  let maxSeedNeeded = qualifiersPerGroup;
  for (const m of playoffMatches) {
    if (m.slot1_seed != null && m.slot1_seed > maxSeedNeeded) maxSeedNeeded = m.slot1_seed;
    if (m.slot2_seed != null && m.slot2_seed > maxSeedNeeded) maxSeedNeeded = m.slot2_seed;
  }

  let seedGroupToPlayer = new Map<string, string>();
  const isStandingTie = (a: any, b: any) => {
    return (
      a?.points === b?.points &&
      a?.goalDiff === b?.goalDiff &&
      (a?.goalsFor ?? 0) === (b?.goalsFor ?? 0) &&
      (a?.fairPlayPoints ?? 0) === (b?.fairPlayPoints ?? 0)
    );
  };
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

        if (!isAdminDecide) {
          rows.forEach((row: { player?: { id: string } }, idx: number) => {
            if (row?.player?.id && idx < maxSeedNeeded) seedGroupToPlayer.set(`${idx + 1},${groupNum}`, row.player.id);
          });
          continue;
        }

        // admin_decide: when a seed position falls inside an unresolved tie group,
        // keep that seed slot empty (player_id stays null) so we can show "XXX/YYY" in public UI.
        let i = 0;
        while (i < rows.length) {
          let j = i;
          while (j + 1 < rows.length && isStandingTie(rows[j], rows[j + 1])) j++;
          const tieSize = j - i + 1;

          if (tieSize === 1) {
            const idx = i;
            if ((rows[idx] as any)?.player?.id && idx < maxSeedNeeded) {
              seedGroupToPlayer.set(`${idx + 1},${groupNum}`, (rows[idx] as any).player.id);
            }
          }

          i = j + 1;
        }
      }
    } else if (Array.isArray(standingsResult)) {
      const rows = standingsResult as any[];
      if (!isAdminDecide) {
        rows.forEach((row: { player?: { id: string } }, idx: number) => {
          if (row?.player?.id && idx < maxSeedNeeded) seedGroupToPlayer.set(`${idx + 1},1`, row.player.id);
        });
      } else {
        let i = 0;
        while (i < rows.length) {
          let j = i;
          while (j + 1 < rows.length && isStandingTie(rows[j], rows[j + 1])) j++;
          const tieSize = j - i + 1;
          if (tieSize === 1) {
            const idx = i;
            if (rows[idx]?.player?.id && idx < maxSeedNeeded) {
              seedGroupToPlayer.set(`${idx + 1},1`, rows[idx].player.id);
            }
          }
          i = j + 1;
        }
      }
    }
  } catch (_) {
    /* standings failed */
  }

  const resolveSlot = (seed: number, group: number): string | null => {
    const k = `${seed},${group}`;
    const fromLock = locked.get(k);
    if (fromLock) return fromLock;
    if (allRegularComplete) return seedGroupToPlayer.get(k) ?? null;
    return null;
  };

  const bothSeededSides = (m: any) =>
    m.slot1_seed != null &&
    m.slot1_group != null &&
    m.slot2_seed != null &&
    m.slot2_group != null;

  function slotSidesDefined(m: any): "both" | "one" | "neither" {
    const a = m.slot1_seed != null && m.slot1_group != null;
    const b = m.slot2_seed != null && m.slot2_group != null;
    if (a && b) return "both";
    if (a || b) return "one";
    return "neither";
  }

  async function clearAdvanceFromMatch(matches: any[], m: any, oldW: string) {
    const nextRound = m.round + 1;
    const nextMatchNum = Math.ceil(m.match_number / 2);
    const fromP1 = m.match_number % 2 === 1;
    const next = matches.find((n: any) => n.round === nextRound && n.match_number === nextMatchNum);
    if (!next) return;
    if (fromP1 && next.player1_id === oldW) {
      await supabase.from("matches").update({ player1_id: null }).eq("id", next.id);
      next.player1_id = null;
    }
    if (!fromP1 && next.player2_id === oldW) {
      await supabase.from("matches").update({ player2_id: null }).eq("id", next.id);
      next.player2_id = null;
    }
  }

  /** R2+: "bye" with a missing opponent is never valid — those are TBD feeder slots, not holes. */
  for (const m of playoffMatches) {
    if (Number(m.round) < 2 || m.status !== "bye") continue;
    if (!m.player1_id || !m.player2_id) {
      const oldW = m.winner_id;
      await supabase
        .from("matches")
        .update({ status: "upcoming", winner_id: null })
        .eq("id", m.id);
      m.status = "upcoming";
      m.winner_id = null;
      if (oldW) await clearAdvanceFromMatch(playoffMatches, m, oldW);
    }
  }

  /** status=bye with two real seed slots is wrong (TBD opponent is not a structural bye). */
  for (const m of playoffMatches) {
    if (m.status !== "bye" || !bothSeededSides(m)) continue;
    const oldW = m.winner_id;
    await supabase
      .from("matches")
      .update({ status: "upcoming", winner_id: null })
      .eq("id", m.id);
    m.status = "upcoming";
    m.winner_id = null;
    if (!oldW) continue;
    const nextRound = m.round + 1;
    const nextMatchNum = Math.ceil(m.match_number / 2);
    const next = playoffMatches.find((n: any) => n.round === nextRound && n.match_number === nextMatchNum);
    if (!next) continue;
    const fromP1 = m.match_number % 2 === 1;
    if (fromP1 && next.player1_id === oldW) {
      await supabase.from("matches").update({ player1_id: null }).eq("id", next.id);
      next.player1_id = null;
    }
    if (!fromP1 && next.player2_id === oldW) {
      await supabase.from("matches").update({ player2_id: null }).eq("id", next.id);
      next.player2_id = null;
    }
  }

  for (const m of playoffMatches) {
    const updates: { player1_id?: string | null; player2_id?: string | null; winner_id?: string | null; status?: string } =
      {};
    if (m.slot1_seed != null && m.slot1_group != null) {
      const resolved = resolveSlot(m.slot1_seed, m.slot1_group);
      // If admin already manually filled this slot, don't wipe it back to null.
      if (resolved !== null || !m.player1_id) updates.player1_id = resolved;
    }
    if (m.slot2_seed != null && m.slot2_group != null) {
      const resolved = resolveSlot(m.slot2_seed, m.slot2_group);
      if (resolved !== null || !m.player2_id) updates.player2_id = resolved;
    }
    const sides = slotSidesDefined(m);
    const r = Number(m.round);
    const p1 = updates.player1_id ?? m.player1_id;
    const p2 = updates.player2_id ?? m.player2_id;
    /** R1 + two seed columns: real matchup — TBD on either side => upcoming, never bye. */
    if (r === 1 && sides === "both") {
      const np1 = updates.player1_id !== undefined ? updates.player1_id : m.player1_id;
      const np2 = updates.player2_id !== undefined ? updates.player2_id : m.player2_id;
      if (!np1 || !np2) {
        updates.status = "upcoming";
        updates.winner_id = null;
      }
    } else if (r === 1 && sides === "one" && (p1 || p2)) {
      /** Only R1 with exactly one seed column = literal BYE hole in the draw. */
      const winnerId = (p1 as string) || (p2 as string);
      if (winnerId) {
        updates.winner_id = winnerId;
        updates.status = "bye";
      }
    } else if (r >= 2) {
      /** R2+: never auto-bye here (missing slot_* means feeder TBD, not a hole). */
      if (!p1 || !p2) {
        updates.status = "upcoming";
        updates.winner_id = null;
      }
    } else if (m.status === "bye" && r === 1 && sides === "one" && (updates.player1_id || updates.player2_id)) {
      updates.winner_id = (updates.player1_id ?? updates.player2_id) as string;
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
    if (Number(m.round) !== 1 || slotSidesDefined(m) !== "one") continue;
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
