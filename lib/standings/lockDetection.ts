/**
 * Lock detection: determine if a (seed, group) position is mathematically locked
 * to a single team given all possible outcomes of remaining matches.
 *
 * Uses exhaustive enumeration when branching^remaining <= enumerationBudget.
 * Score-magnitude tiebreakers (GD, GF, GA, H2H) trigger multi-scoreline "stress" simulation.
 */

import type { TiebreakerConfig } from "@/types/database";
import {
  computeStandings,
  compareStandingRows,
  type CompareStandingRowsContext,
  type ComputeStandingsOptions,
  type StandingRow,
  type MatchForStandings,
  type PlayerForStandings,
} from "./compute";
import { normalizeTiebreakerConfig } from "./config";
import {
  tiebreakerUsesScoreSensitiveCriteria,
  getSportMaxGoalsPerSide,
  buildStressOutcomesForMatch,
  buildSimpleOutcomesForMatch,
  maxRemainingMatchesForEnumeration,
  type SimulatedScoreOutcome,
} from "./scoreSimulation";

const DEFAULT_ENUMERATION_BUDGET = 2_000_000;

export interface LockDetectionOptions {
  matchPlayerStats?: ComputeStandingsOptions["matchPlayerStats"];
  teamMembers?: ComputeStandingsOptions["teamMembers"];
  registrationType?: "player" | "team";
  /** Max seed index to compute (e.g. 4 = seeds 1..4). Default 8. */
  maxSeed?: number;
  /** Sport name (e.g. event.sport) — picks default max score per side for stress sims. */
  sport?: string;
  /** Override max goals/points per side in simulated remaining matches. */
  maxGoalsPerSide?: number;
  /**
   * Max total enumerated outcome combinations (branching^remaining).
   * Higher allows more remaining games; slower. Default 2_000_000.
   */
  enumerationBudget?: number;
  /**
   * Caps how many remaining matches are enumerable: at most n(n-1)/2 (single) or n(n-1) (double)
   * round-robin matches can exist in a group of n teams.
   */
  roundRobinMode?: "single" | "double";
  /** If set, used for schedule cap; else derived from matches in the group. */
  teamCountInGroup?: number;
}

function getPlayerId(m: MatchForStandings, side: 1 | 2): string | null {
  if (side === 1) return m.player1?.id ?? (m as any).player1_id ?? null;
  return m.player2?.id ?? (m as any).player2_id ?? null;
}

function countTeamsInGroup(matches: MatchForStandings[], groupNum: number): number {
  const ids = new Set<string>();
  for (const m of matches) {
    if ((m as any).group_number !== groupNum) continue;
    const p1 = getPlayerId(m, 1);
    const p2 = getPlayerId(m, 2);
    if (p1) ids.add(p1);
    if (p2) ids.add(p2);
  }
  return ids.size;
}

function seedCandidateIdsForRankIndex(
  rows: StandingRow[],
  rankIndex: number,
  ctx: CompareStandingRowsContext
): Set<string> {
  let start = rankIndex;
  while (start > 0 && compareStandingRows(rows[start - 1], rows[start], ctx) === 0) start--;
  let end = rankIndex;
  while (end + 1 < rows.length && compareStandingRows(rows[end], rows[end + 1], ctx) === 0) end++;
  const set = new Set<string>();
  for (let i = start; i <= end; i++) set.add(rows[i].player.id);
  return set;
}

/** Returns map key "seed,group" -> player_id when that position is locked. */
export function computeLockedSeeds(
  regularSeasonMatches: MatchForStandings[],
  players: PlayerForStandings[],
  config: TiebreakerConfig | null | undefined,
  options: LockDetectionOptions = {}
): Map<string, string> {
  const cfg = normalizeTiebreakerConfig(config);
  const isAdminDecide = cfg.final_tiebreaker === "admin_decide";
  const maxSeed = options.maxSeed ?? 8;
  // Include structural byes as "decided" so points/W-D-L standings and lock detection
  // stay consistent. Otherwise, BYE wins can be dropped from enumeration inputs,
  // causing seeds to not lock even when the table clearly indicates they should.
  const decidedStatuses = ["completed", "forfeit", "walkover", "bye"];
  const completed = regularSeasonMatches.filter((m) => decidedStatuses.includes(m.status));
  const remaining = regularSeasonMatches.filter((m) => !decidedStatuses.includes(m.status));
  const groupNumbers = [
    ...new Set(
      regularSeasonMatches
        .map((m) => (m as any).group_number as number | null)
        .filter((g): g is number => g != null)
    ),
  ].sort((a, b) => a - b);

  const locked = new Map<string, string>();

  const orderNoFinal = cfg.order.filter((c) => c !== "final");
  const stressScores = tiebreakerUsesScoreSensitiveCriteria(orderNoFinal);
  const maxGoalsM = getSportMaxGoalsPerSide(options.sport ?? null, options.maxGoalsPerSide);
  const budget = options.enumerationBudget ?? DEFAULT_ENUMERATION_BUDGET;
  const rrMode = options.roundRobinMode ?? "single";

  for (const groupNum of groupNumbers) {
    const completedInGroup = completed.filter((m) => (m as any).group_number === groupNum);
    const remainingInGroup = remaining.filter((m) => (m as any).group_number === groupNum);
    const remainingPlayable = remainingInGroup.filter((m) => getPlayerId(m, 1) && getPlayerId(m, 2));

    const teamCount = options.teamCountInGroup ?? countTeamsInGroup(regularSeasonMatches, groupNum);

    const outcomesPerMatch: SimulatedScoreOutcome[][] = remainingPlayable.map((m) => {
      const p1 = getPlayerId(m, 1)!;
      const p2 = getPlayerId(m, 2)!;
      return stressScores ? buildStressOutcomesForMatch(p1, p2, maxGoalsM) : buildSimpleOutcomesForMatch(p1, p2);
    });

    const branching =
      outcomesPerMatch.length === 0
        ? 1
        : outcomesPerMatch.every((o) => o.length === outcomesPerMatch[0]!.length)
          ? outcomesPerMatch[0]!.length
          : 0;

    if (branching === 0) continue;

    const maxR = maxRemainingMatchesForEnumeration({
      teamCount,
      branchingFactor: branching,
      enumerationBudget: budget,
      roundRobinMode: rrMode,
    });

    if (remainingPlayable.length > maxR) continue;

    const r = remainingPlayable.length;
    let numOutcomes = 1;
    for (let i = 0; i < r; i++) {
      numOutcomes *= branching;
      if (numOutcomes > budget) {
        numOutcomes = budget + 1;
        break;
      }
    }
    if (numOutcomes > budget) continue;

    const seedToTeamIds = new Map<number, Set<string>>();
    for (let s = 1; s <= maxSeed; s++) seedToTeamIds.set(s, new Set());

    for (let out = 0; out < numOutcomes; out++) {
      const simulated: MatchForStandings[] = remainingPlayable.map((m, idx) => {
        const choice = Math.floor(out / Math.pow(branching, idx)) % branching;
        const o = outcomesPerMatch[idx]![choice]!;
        const clone = { ...m, status: "completed" as string };
        (clone as any).winner_id = o.winnerId;
        (clone as any).score1 = String(o.score1);
        (clone as any).score2 = String(o.score2);
        (clone as any).score = `${o.score1}-${o.score2}`;
        return clone;
      });

      const syntheticMatches = [...completedInGroup, ...simulated];
      const rows = computeStandings(syntheticMatches, players, cfg, {
        groupNumber: groupNum,
        matchPlayerStats: options.matchPlayerStats,
        teamMembers: options.teamMembers,
        registrationType: options.registrationType ?? "player",
      }) as StandingRow[];

      const table = new Map(rows.map((row) => [row.player.id, row]));
      const ctx: CompareStandingRowsContext = {
        order: orderNoFinal,
        useFinalAlphabetical: cfg.final_tiebreaker === "alphabetical",
        byGroup: syntheticMatches,
        table,
        allRows: rows,
        pointsWin: cfg.points_win ?? 3,
        pointsDraw: cfg.points_draw ?? 1,
      };

      for (let seed = 1; seed <= maxSeed && seed <= rows.length; seed++) {
        const idx = seed - 1;
        if (!isAdminDecide) {
          const teamId = rows[idx].player.id;
          seedToTeamIds.get(seed)!.add(teamId);
          continue;
        }

        const candidates = seedCandidateIdsForRankIndex(rows, idx, ctx);
        candidates.forEach((id) => seedToTeamIds.get(seed)!.add(id));
      }
    }

    for (let seed = 1; seed <= maxSeed; seed++) {
      const set = seedToTeamIds.get(seed)!;
      if (set.size === 1) {
        locked.set(`${seed},${groupNum}`, [...set][0]);
      }
    }
  }

  return locked;
}
