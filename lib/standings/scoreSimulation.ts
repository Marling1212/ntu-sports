/**
 * Helpers for playoff seed lock detection: score stress-tests and enumeration limits.
 * Goal: avoid false "locked" seeds when tiebreakers depend on goal totals / H2H mini-leagues.
 */

import type { TiebreakerCriteria } from "@/types/database";

/** Criteria where W/D/L alone is insufficient — score magnitudes can change ordering. */
const SCORE_SENSITIVE_CRITERIA = new Set<TiebreakerCriteria>([
  "goal_difference",
  "goals_for",
  "goals_against",
  "head_to_head",
]);

export function tiebreakerUsesScoreSensitiveCriteria(order: TiebreakerCriteria[]): boolean {
  return order.some((c) => SCORE_SENSITIVE_CRITERIA.has(c));
}

/**
 * Upper bound on goals/points per side in simulated remaining matches.
 * Override via LockDetectionOptions when the event uses custom caps.
 */
export function getSportMaxGoalsPerSide(sport: string | undefined | null, override?: number): number {
  if (override != null && override > 0) return Math.min(500, Math.floor(override));
  const s = (sport || "").toLowerCase();
  if (s.includes("basketball") || s === "basket") return 200;
  if (s.includes("volleyball") || s.includes("volley")) return 25;
  if (s.includes("tennis")) return 7;
  if (s.includes("badminton")) return 21;
  if (s.includes("table tennis") || s.includes("pingpong") || s.includes("桌球")) return 11;
  if (s.includes("football") || s.includes("soccer") || s.includes("足球")) return 15;
  if (s.includes("hockey") || s.includes("冰球")) return 12;
  if (s.includes("baseball")) return 20;
  return 99;
}

export interface SimulatedScoreOutcome {
  score1: number;
  score2: number;
  winnerId: string | null;
}

/**
 * Build a fixed set of per-match outcomes that stress goal difference, goals for/against,
 * and head-to-head mini-league stats. Not exhaustive over all scorelines (that would be infeasible),
 * but far stronger than a single 1-0 / 1-1 / 0-1 triplet.
 */
export function buildStressOutcomesForMatch(
  player1Id: string,
  player2Id: string,
  maxGoalsPerSide: number
): SimulatedScoreOutcome[] {
  const M = Math.max(1, Math.floor(maxGoalsPerSide));
  const mid = Math.max(1, Math.min(M, Math.floor((M + 1) / 2)));

  return [
    // Player 1 wins — tight margin, blowout, high-scoring win, "typical" close win
    { score1: 1, score2: 0, winnerId: player1Id },
    { score1: M, score2: 0, winnerId: player1Id },
    { score1: M, score2: Math.max(0, M - 1), winnerId: player1Id },
    { score1: mid + 1, score2: mid, winnerId: player1Id },
    // Draws — different GF/GA totals
    { score1: 0, score2: 0, winnerId: null },
    { score1: 1, score2: 1, winnerId: null },
    { score1: M, score2: M, winnerId: null },
    // Player 2 wins
    { score1: 0, score2: 1, winnerId: player2Id },
    { score1: 0, score2: M, winnerId: player2Id },
    { score1: Math.max(0, M - 1), score2: M, winnerId: player2Id },
    { score1: mid, score2: mid + 1, winnerId: player2Id },
  ];
}

/** Classic three outcomes when points / W-D-L alone decide the table (no score-magnitude criteria). */
export function buildSimpleOutcomesForMatch(player1Id: string, player2Id: string): SimulatedScoreOutcome[] {
  return [
    { score1: 1, score2: 0, winnerId: player1Id },
    { score1: 1, score2: 1, winnerId: null },
    { score1: 0, score2: 1, winnerId: player2Id },
  ];
}

/** Max matches in a full round-robin for n teams (single: n(n-1)/2, double: n(n-1)). */
export function maxMatchesInRoundRobinGroup(
  teamCount: number,
  mode: "single" | "double"
): number {
  const n = teamCount;
  if (n < 2) return 0;
  return mode === "double" ? n * (n - 1) : (n * (n - 1)) / 2;
}

/**
 * Largest number of *remaining* undecided matches we can fully enumerate:
 * - Cannot exceed the maximum possible undecided matches in the group's schedule (round-robin bound).
 * - Cannot exceed floor(log_branching(budget)) so total outcomes <= budget.
 */
export function maxRemainingMatchesForEnumeration(args: {
  teamCount: number;
  branchingFactor: number;
  enumerationBudget: number;
  roundRobinMode: "single" | "double";
}): number {
  const { teamCount, branchingFactor, enumerationBudget, roundRobinMode } = args;
  const scheduleCap = maxMatchesInRoundRobinGroup(teamCount, roundRobinMode);
  const budget = Math.max(2, enumerationBudget);
  // branching=1 happens when there are 0 remaining matches (no per-match outcomes); avoid log(1).
  if (branchingFactor < 2) {
    return scheduleCap <= 0 ? 1_000_000 : scheduleCap;
  }
  const b = branchingFactor;
  const maxByBudget = Math.floor(Math.log(budget) / Math.log(b));
  if (scheduleCap <= 0) return maxByBudget;
  return Math.min(scheduleCap, maxByBudget);
}
