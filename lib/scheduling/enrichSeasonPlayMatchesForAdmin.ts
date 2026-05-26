import type { TiebreakerConfig } from "@/types/database";
import { buildPlayoffSlotPlayerResolver } from "@/lib/scheduling/playoffSlotPlayerResolver";
import {
  applyPlayoffFeederAdvancement,
  type MatchRowForFeederAdvancement,
} from "@/lib/scheduling/applyPlayoffFeederAdvancement";

export type AdminEventForPlayoffEnrich = {
  tournament_type?: string | null;
  tiebreaker_config?: TiebreakerConfig | null;
  playoff_qualifiers_per_group?: number | null;
  registration_type?: string | null;
  sport?: string | null;
};

export type AdminMatchForPlayoffEnrich = MatchRowForFeederAdvancement & {
  [key: string]: unknown;
};

type PlayerRow = { id: string; name: string; seed?: number | null; department?: string | null };

/**
 * Resolve season_play playoff player ids/names for admin UIs (matches table, dispatch, match detail).
 * Uses the same seed-lock + feeder-winner rules as the public schedule/bracket.
 */
export function enrichSeasonPlayMatchesForAdmin(
  matches: AdminMatchForPlayoffEnrich[],
  players: PlayerRow[],
  event: AdminEventForPlayoffEnrich,
  options?: {
    matchPlayerStats?: unknown[];
    teamMembers?: unknown[];
  }
): AdminMatchForPlayoffEnrich[] {
  if (event.tournament_type !== "season_play" || matches.length === 0) {
    return matches;
  }

  const playersById = new Map(players.map((p) => [p.id, { id: p.id, name: p.name, seed: p.seed ?? null }]));

  const regularForStandings = matches
    .filter((m) => Number(m.round) === 0)
    .map((m) => ({
      player1_id: (m.player1_id as string | null) ?? null,
      player2_id: (m.player2_id as string | null) ?? null,
      winner_id: (m.winner_id as string | null) ?? null,
      score1: (m as any).score1,
      score2: (m as any).score2,
      status: String(m.status || ""),
      round: 0,
      group_number: (m as any).group_number ?? null,
    }));

  const playoffRefs = matches
    .filter((m) => Number(m.round) >= 1)
    .map((m) => ({
      slot1_seed: m.slot1_seed,
      slot1_group: m.slot1_group,
      slot2_seed: m.slot2_seed,
      slot2_group: m.slot2_group,
    }));

  const resolveSlotId =
    regularForStandings.length > 0
      ? buildPlayoffSlotPlayerResolver({
          regularRounds: regularForStandings as any,
          playersForStandings: players.map((p) => ({
            id: p.id,
            name: p.name,
            seed: p.seed ?? undefined,
            school: p.department ?? undefined,
          })),
          tiebreakerConfig: event.tiebreaker_config,
          playoffQualifiersPerGroup: event.playoff_qualifiers_per_group ?? 8,
          matchPlayerStats: options?.matchPlayerStats as any,
          teamMembers: options?.teamMembers as any,
          registrationType: (event.registration_type as "player" | "team") || "player",
          sport: event.sport || undefined,
          playoffMatches: playoffRefs,
        })
      : (dbId: string | null | undefined) => (dbId ? String(dbId) : null);

  const attachPlayer = (id: string | null | undefined, fallback: any) => {
    if (!id) return null;
    const row = playersById.get(id);
    if (row) {
      return {
        ...(typeof fallback === "object" && fallback ? fallback : {}),
        id: row.id,
        name: row.name,
        seed: row.seed ?? (fallback as any)?.seed ?? null,
      };
    }
    if (fallback && typeof fallback === "object" && (fallback as any).name) return fallback;
    return { id, name: id, seed: (fallback as any)?.seed ?? null };
  };

  const withSeeds = matches.map((m) => {
    const p1Id = resolveSlotId(m.player1_id as string | null, m.slot1_seed, m.slot1_group) ?? m.player1_id;
    const p2Id = resolveSlotId(m.player2_id as string | null, m.slot2_seed, m.slot2_group) ?? m.player2_id;
    return {
      ...m,
      player1_id: p1Id,
      player2_id: p2Id,
      player1: attachPlayer(p1Id, (m as any).player1),
      player2: attachPlayer(p2Id, (m as any).player2),
    };
  });

  return applyPlayoffFeederAdvancement(withSeeds, playersById) as AdminMatchForPlayoffEnrich[];
}
