/**
 * Lock detection: determine if a (seed, group) position is mathematically locked
 * to a single team given all possible outcomes of remaining matches.
 */

import type { TiebreakerConfig } from "@/types/database";
import { computeStandings, type ComputeStandingsOptions } from "./compute";
import { normalizeTiebreakerConfig } from "./config";
import type { MatchForStandings, PlayerForStandings } from "./compute";

const MAX_REMAINING_FOR_ENUM = 12;

export interface LockDetectionOptions {
  matchPlayerStats?: ComputeStandingsOptions["matchPlayerStats"];
  teamMembers?: ComputeStandingsOptions["teamMembers"];
  registrationType?: "player" | "team";
  /** Max seed index to compute (e.g. 4 = seeds 1..4). Default 8. */
  maxSeed?: number;
}

function getPlayerId(m: MatchForStandings, side: 1 | 2): string | null {
  if (side === 1) return m.player1?.id ?? (m as any).player1_id ?? null;
  return m.player2?.id ?? (m as any).player2_id ?? null;
}

/** Returns map key "seed,group" -> player_id when that position is locked. */
export function computeLockedSeeds(
  regularSeasonMatches: MatchForStandings[],
  players: PlayerForStandings[],
  config: TiebreakerConfig | null | undefined,
  options: LockDetectionOptions = {}
): Map<string, string> {
  const cfg = normalizeTiebreakerConfig(config);
  const maxSeed = options.maxSeed ?? 8;
  const completed = regularSeasonMatches.filter((m) => m.status === "completed");
  const remaining = regularSeasonMatches.filter((m) => m.status !== "completed");
  const groupNumbers = [
    ...new Set(
      regularSeasonMatches
        .map((m) => (m as any).group_number as number | null)
        .filter((g): g is number => g != null)
    ),
  ].sort((a, b) => a - b);

  const locked = new Map<string, string>();

  for (const groupNum of groupNumbers) {
    const completedInGroup = completed.filter((m) => (m as any).group_number === groupNum);
    const remainingInGroup = remaining.filter((m) => (m as any).group_number === groupNum);

    if (remainingInGroup.length > MAX_REMAINING_FOR_ENUM) continue;

    const numOutcomes = Math.pow(3, remainingInGroup.length);
    const seedToTeamIds = new Map<number, Set<string>>();
    for (let s = 1; s <= maxSeed; s++) seedToTeamIds.set(s, new Set());

    for (let out = 0; out < numOutcomes; out++) {
      const simulated = remainingInGroup.map((m, idx) => {
        const choice = Math.floor(out / Math.pow(3, idx)) % 3;
        const p1 = getPlayerId(m, 1);
        const p2 = getPlayerId(m, 2);
        const clone = { ...m, status: "completed" as string };
        if (choice === 0) {
          (clone as any).winner_id = p1;
          (clone as any).score1 = "1";
          (clone as any).score2 = "0";
        } else if (choice === 1) {
          (clone as any).winner_id = null;
          (clone as any).score1 = "1";
          (clone as any).score2 = "1";
        } else {
          (clone as any).winner_id = p2;
          (clone as any).score1 = "0";
          (clone as any).score2 = "1";
        }
        (clone as any).score = `${(clone as any).score1}-${(clone as any).score2}`;
        return clone;
      });

      const syntheticMatches = [...completedInGroup, ...simulated];
      const rows = computeStandings(syntheticMatches, players, cfg, {
        groupNumber: groupNum,
        matchPlayerStats: options.matchPlayerStats,
        teamMembers: options.teamMembers,
        registrationType: options.registrationType ?? "player",
      }) as import("./compute").StandingRow[];

      for (let seed = 1; seed <= maxSeed && seed <= rows.length; seed++) {
        const teamId = rows[seed - 1].player.id;
        seedToTeamIds.get(seed)!.add(teamId);
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
