import { createClient } from "@/lib/supabase/server";
import type { TiebreakerConfig } from "@/types/database";
import { getDivisionIdsForEventAndSport, getSportMatches, getSportPlayers } from "@/lib/utils/getSportEvent";
import { buildPlayoffSlotPlayerResolver } from "@/lib/scheduling/playoffSlotPlayerResolver";

type EventMini = {
  tournament_type?: string | null;
  tiebreaker_config?: TiebreakerConfig | null;
  playoff_qualifiers_per_group?: number | null;
  registration_type?: string | null;
  sport?: string | null;
};

type MatchMini = {
  round?: unknown;
  player1_id?: string | null;
  player2_id?: string | null;
  slot1_seed?: number | null;
  slot1_group?: number | null;
  slot2_seed?: number | null;
  slot2_group?: number | null;
};

/**
 * Resolve season_play playoff opponent ids (same rules as admin grid / syncLockedPlayoffSeeds)
 * for public pages when DB player1_id/player2_id are still null.
 */
export async function resolvePublicSeasonPlayMatchOpponentIds(input: {
  eventId: string;
  sportSlug: string;
  match: MatchMini;
  event: EventMini;
}): Promise<{ player1_id: string | null; player2_id: string | null }> {
  const { eventId, sportSlug, match, event } = input;
  if (event.tournament_type !== "season_play" || Number(match.round) < 1) {
    return { player1_id: match.player1_id ?? null, player2_id: match.player2_id ?? null };
  }

  const supabase = await createClient();
  const divisionIds = await getDivisionIdsForEventAndSport(eventId, sportSlug);
  const divisionFilter = divisionIds.length > 0 ? divisionIds : undefined;
  const dbMatches = await getSportMatches(eventId, divisionFilter);
  const dbPlayers = await getSportPlayers(eventId, divisionFilter);

  let matchPlayerStats: any[] = [];
  if (dbMatches.length > 0) {
    const { data: stats } = await supabase
      .from("match_player_stats")
      .select("*")
      .in(
        "match_id",
        dbMatches.map((m: any) => m.id)
      );
    matchPlayerStats = stats || [];
  }

  let teamMembers: any[] = [];
  if (event.registration_type === "team" && dbPlayers.length > 0) {
    const teamIds = dbPlayers.filter((p: any) => p.type === "team").map((p: any) => p.id);
    if (teamIds.length > 0) {
      const { data: members } = await supabase.from("team_members").select("id, player_id").in("player_id", teamIds);
      teamMembers = members || [];
    }
  }

  const regularRounds = dbMatches
    .filter((m: any) => Number(m.round) === 0)
    .map((m: any) => ({
      player1_id: m.player1_id,
      player2_id: m.player2_id,
      winner_id: m.winner_id ?? m.winner?.id ?? null,
      score1: m.score1,
      score2: m.score2,
      status: m.status,
      round: 0,
      group_number: m.group_number ?? null,
    }));

  const playoffMatches = dbMatches
    .filter((m: any) => Number(m.round) >= 1)
    .map((m: any) => ({
      slot1_seed: m.slot1_seed,
      slot1_group: m.slot1_group,
      slot2_seed: m.slot2_seed,
      slot2_group: m.slot2_group,
    }));

  const playersForStandings = dbPlayers.map((p: any) => ({
    id: p.id,
    name: p.name,
    seed: p.seed,
    school: p.department,
  }));

  const resolver =
    regularRounds.length > 0
      ? buildPlayoffSlotPlayerResolver({
          regularRounds,
          playersForStandings,
          tiebreakerConfig: event.tiebreaker_config,
          playoffQualifiersPerGroup: event.playoff_qualifiers_per_group ?? 8,
          matchPlayerStats,
          teamMembers,
          registrationType: (event.registration_type as "player" | "team") || "player",
          sport: event.sport || undefined,
          playoffMatches,
        })
      : () => null;

  const r1 = resolver(match.player1_id, match.slot1_seed, match.slot1_group);
  const r2 = resolver(match.player2_id, match.slot2_seed, match.slot2_group);

  return {
    player1_id: match.player1_id ?? r1 ?? null,
    player2_id: match.player2_id ?? r2 ?? null,
  };
}
