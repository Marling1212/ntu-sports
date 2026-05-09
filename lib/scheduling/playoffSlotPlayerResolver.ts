import type { TiebreakerConfig } from "@/types/database";
import {
  computeLockedSeeds,
  computeStandings,
  normalizeTiebreakerConfig,
  type LockDetectionOptions,
  type MatchForStandings,
  type PlayerForStandings,
} from "@/lib/standings";

/** Align with syncLockedPlayoffSeeds / structural byes as decided. */
const DECIDED = new Set(["completed", "forfeit", "walkover", "bye"]);

export type RegularRowForPlayoffResolver = {
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
  score1: unknown;
  score2: unknown;
  status: string;
  round: number;
  /** DB / API may return string; normalize like syncLockedPlayoffSeeds */
  group_number: number | string | null;
};

export type PlayoffSlotRef = {
  slot1_seed?: number | null;
  slot1_group?: number | null;
  slot2_seed?: number | null;
  slot2_group?: number | null;
};

/**
 * Resolves (seed, group) playoff placeholders to concrete player ids for client checks
 * (e.g. blackout), using the same rules as syncLockedPlayoffSeeds.resolveSlot.
 */
export function buildPlayoffSlotPlayerResolver(input: {
  regularRounds: RegularRowForPlayoffResolver[];
  playersForStandings: PlayerForStandings[];
  tiebreakerConfig: TiebreakerConfig | null | undefined;
  playoffQualifiersPerGroup: number;
  matchPlayerStats: LockDetectionOptions["matchPlayerStats"];
  teamMembers: LockDetectionOptions["teamMembers"];
  registrationType: "player" | "team";
  sport?: string;
  playoffMatches?: PlayoffSlotRef[];
}): (dbId: string | null | undefined, seed: number | null | undefined, group: number | null | undefined) => string | null {
  const qualifiersPerGroup = input.playoffQualifiersPerGroup || 8;

  let regularForLock: RegularRowForPlayoffResolver[] = input.regularRounds.map((m) => ({ ...m }));

  const groupsUsedInPlayoffs = new Set<number>();
  for (const m of input.playoffMatches || []) {
    const g1 = m.slot1_group;
    const g2 = m.slot2_group;
    if (g1 != null && Number(g1) > 0) groupsUsedInPlayoffs.add(Number(g1));
    if (g2 != null && Number(g2) > 0) groupsUsedInPlayoffs.add(Number(g2));
  }
  const maxPlayoffGroup = groupsUsedInPlayoffs.size > 0 ? Math.max(...groupsUsedInPlayoffs) : 1;
  const hasNullGroup = regularForLock.some((m) => m.group_number == null || m.group_number === "");
  if (hasNullGroup && maxPlayoffGroup <= 1) {
    regularForLock = regularForLock.map((m) => ({
      ...m,
      group_number: m.group_number != null && m.group_number !== "" ? Number(m.group_number) : 1,
    }));
  }

  const allRegularComplete =
    regularForLock.length > 0 && regularForLock.every((m) => DECIDED.has(String(m.status || "")));

  const isGroupRegularComplete = (groupNum: number) => {
    const ms = regularForLock.filter((m) => Number(m.group_number) === groupNum);
    return ms.length > 0 && ms.every((m) => DECIDED.has(String(m.status || "")));
  };

  let maxSeedNeeded = qualifiersPerGroup;
  for (const m of input.playoffMatches || []) {
    if (m.slot1_seed != null && Number(m.slot1_seed) > maxSeedNeeded) maxSeedNeeded = Number(m.slot1_seed);
    if (m.slot2_seed != null && Number(m.slot2_seed) > maxSeedNeeded) maxSeedNeeded = Number(m.slot2_seed);
  }

  const locked = computeLockedSeeds(
    regularForLock as MatchForStandings[],
    input.playersForStandings,
    input.tiebreakerConfig,
    {
      maxSeed: maxSeedNeeded,
      matchPlayerStats: input.matchPlayerStats,
      teamMembers: input.teamMembers,
      registrationType: input.registrationType,
      sport: input.sport,
    }
  );

  const tiebreakerCfg = normalizeTiebreakerConfig(input.tiebreakerConfig);
  const isAdminDecide = tiebreakerCfg.final_tiebreaker === "admin_decide";

  let seedGroupToPlayer = new Map<string, string>();
  const isStandingTie = (a: any, b: any) =>
    a?.points === b?.points &&
    a?.goalDiff === b?.goalDiff &&
    (a?.goalsFor ?? 0) === (b?.goalsFor ?? 0) &&
    (a?.fairPlayPoints ?? 0) === (b?.fairPlayPoints ?? 0);

  try {
    const standingsResult = computeStandings(
      regularForLock as MatchForStandings[],
      input.playersForStandings,
      input.tiebreakerConfig,
      {
        matchPlayerStats: input.matchPlayerStats,
        teamMembers: input.teamMembers,
        registrationType: input.registrationType,
      }
    );
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
  } catch {
    /* standings failed */
  }

  const resolveSlot = (seed: number, group: number): string | null => {
    const g = Number(group);
    const s = Number(seed);
    const k = `${s},${g}`;
    if (allRegularComplete) {
      return seedGroupToPlayer.get(k) ?? null;
    }
    const lockedId = locked.get(k);
    if (lockedId) return lockedId;
    if (Number.isFinite(g) && isGroupRegularComplete(g)) {
      return seedGroupToPlayer.get(k) ?? null;
    }
    return null;
  };

  return (dbId, seed, group) => {
    if (dbId) return dbId;
    if (seed == null || group == null) return null;
    const s = Number(seed);
    const g = Number(group);
    if (!Number.isFinite(s) || !Number.isFinite(g)) return null;
    return resolveSlot(s, g);
  };
}
