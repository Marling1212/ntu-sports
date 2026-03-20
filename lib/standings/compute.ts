/**
 * Configurable standings computation for season play.
 * Used by: SeasonPlayDisplay, Fill Playoffs, BracketSeedingManager, Export.
 */

import { isDrawMatch } from "@/lib/constants/matchConstants";
import type { TiebreakerConfig, TiebreakerCriteria } from "@/types/database";
import { normalizeTiebreakerConfig } from "./config";

export interface StandingRow {
  player: { id: string; name: string; seed?: number; school?: string };
  wins: number;
  losses: number;
  draws: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  yellowCards: number;
  redCards: number;
  fairPlayPoints: number;
  group?: number;
}

export interface MatchForStandings {
  player1?: { id: string } | null;
  player2?: { id: string } | null;
  player1_id?: string | null;
  player2_id?: string | null;
  winner?: { id: string } | null;
  winner_id?: string | null;
  score?: string | null;
  score1?: string | null;
  score2?: string | null;
  status: string;
  round?: number;
  group_number?: number | null;
}

export interface PlayerForStandings {
  id: string;
  name: string;
  seed?: number;
  school?: string;
}

export interface ComputeStandingsOptions {
  /** Only matches with this group_number (and round 0). */
  groupNumber?: number;
  /** For fair_play: stat rows (player_id, team_member_id, stat_name, stat_value). */
  matchPlayerStats?: Array<{
    player_id?: string | null;
    team_member_id?: string | null;
    stat_name: string;
    stat_value?: string | null;
  }>;
  teamMembers?: Array<{ id: string; player_id: string }>;
  registrationType?: "player" | "team";
}

function parseScorePair(s?: string | null, s1?: string | null, s2?: string | null): { a: number; b: number } | null {
  if (s) {
    const m = s.match(/(\d+)\s*[-:]\s*(\d+)/);
    if (m) {
      const a = parseInt(m[1], 10);
      const b = parseInt(m[2], 10);
      if (!Number.isNaN(a) && !Number.isNaN(b)) return { a, b };
    }
  }
  if (s1 != null && s2 != null) {
    const a = parseInt(String(s1), 10);
    const b = parseInt(String(s2), 10);
    if (!Number.isNaN(a) && !Number.isNaN(b)) return { a, b };
  }
  return null;
}

function getPlayerId(m: MatchForStandings, side: 1 | 2): string | null {
  if (side === 1) return m.player1?.id ?? m.player1_id ?? null;
  return m.player2?.id ?? m.player2_id ?? null;
}

function getWinnerId(m: MatchForStandings): string | null {
  return m.winner?.id ?? m.winner_id ?? null;
}

/** Yellow/red card counts from match_player_stats (and team members for team events). */
function getCardCounts(
  playerId: string,
  matchPlayerStats: ComputeStandingsOptions["matchPlayerStats"],
  teamMembers: ComputeStandingsOptions["teamMembers"],
  registrationType: "player" | "team"
): { yellow: number; red: number } {
  let yellow = 0;
  let red = 0;
  if (!matchPlayerStats?.length) return { yellow, red };

  const isCard = (name: string, card: "y" | "r") => {
    const n = name?.toLowerCase() || "";
    const isY =
      name === "yellow_card" ||
      name === "yellow_cards" ||
      name === "黃牌" ||
      n.includes("yellow") ||
      name?.includes("黃");
    const isR =
      name === "red_card" ||
      name === "red_cards" ||
      name === "紅牌" ||
      n.includes("red") ||
      name?.includes("紅");
    return card === "y" ? isY : isR;
  };

  for (const stat of matchPlayerStats) {
    let applies = false;
    if (registrationType === "team" && stat.team_member_id && teamMembers?.length) {
      const member = teamMembers.find((tm) => tm.id === stat.team_member_id);
      if (member?.player_id === playerId) applies = true;
    } else if (stat.player_id === playerId) {
      applies = true;
    }
    if (!applies) continue;
    const v = parseInt(stat.stat_value ?? "0", 10) || 0;
    if (isCard(stat.stat_name, "y")) yellow += v;
    if (isCard(stat.stat_name, "r")) red += v;
  }
  return { yellow, red };
}

/** Fair play: more cards = worse (negative value). Yellow -1, Red -3. */
function fairPlayPoints(yellow: number, red: number): number {
  return -(yellow + red * 3);
}

/** H2H between two players in given matches. */
function h2h(
  player1Id: string,
  player2Id: string,
  matches: MatchForStandings[],
  pointsWin: number,
  pointsDraw: number
): {
  p1Points: number;
  p2Points: number;
  p1GoalsFor: number;
  p2GoalsFor: number;
  p1GoalsAgainst: number;
  p2GoalsAgainst: number;
} {
  let p1Points = 0;
  let p2Points = 0;
  let p1GF = 0;
  let p2GF = 0;
  let p1GA = 0;
  let p2GA = 0;
  const h2hMatches = matches.filter((m) => {
    if (m.status !== "completed" && m.status !== "forfeit" && m.status !== "walkover") return false;
    const a = getPlayerId(m, 1);
    const b = getPlayerId(m, 2);
    const has1 = a === player1Id || b === player1Id;
    const has2 = a === player2Id || b === player2Id;
    return has1 && has2;
  });
  for (const m of h2hMatches) {
    const sc = parseScorePair(m.score, m.score1, m.score2);
    const winnerId = getWinnerId(m);
    const isP1First = getPlayerId(m, 1) === player1Id;
    const p1Score = isP1First ? (sc?.a ?? 0) : (sc?.b ?? 0);
    const p2Score = isP1First ? (sc?.b ?? 0) : (sc?.a ?? 0);
    p1GF += p1Score;
    p2GF += p2Score;
    p1GA += p2Score;
    p2GA += p1Score;
    const draw = isDrawMatch(winnerId, m.status, String(p1Score), String(p2Score));
    if (draw) {
      p1Points += pointsDraw;
      p2Points += pointsDraw;
    } else if (winnerId === player1Id) {
      p1Points += pointsWin;
    } else if (winnerId === player2Id) {
      p2Points += pointsWin;
    }
  }
  return {
    p1Points,
    p2Points,
    p1GoalsFor: p1GF,
    p2GoalsFor: p2GF,
    p1GoalsAgainst: p1GA,
    p2GoalsAgainst: p2GA,
  };
}

/** Mini-league: among tied player ids, points (and optionally GD, GF) only in matches between them. */
function miniLeagueStats(
  tiedIds: string[],
  matches: MatchForStandings[],
  rows: Map<string, StandingRow>,
  pointsWin: number,
  pointsDraw: number
): Map<string, { points: number; goalDiff: number; goalsFor: number }> {
  const set = new Set(tiedIds);
  const filtered = matches.filter((m) => {
    if (m.status !== "completed" && m.status !== "forfeit" && m.status !== "walkover") return false;
    const a = getPlayerId(m, 1);
    const b = getPlayerId(m, 2);
    return a && b && set.has(a) && set.has(b);
  });
  const res = new Map<string, { points: number; goalDiff: number; goalsFor: number }>();
  for (const id of tiedIds) res.set(id, { points: 0, goalDiff: 0, goalsFor: 0 });
  for (const m of filtered) {
    const a = getPlayerId(m, 1)!;
    const b = getPlayerId(m, 2)!;
    const sc = parseScorePair(m.score, m.score1, m.score2);
    const winnerId = getWinnerId(m);
    const isDraw = isDrawMatch(winnerId, m.status, sc?.a.toString(), sc?.b.toString());
    const ra = res.get(a)!;
    const rb = res.get(b)!;
    const scoreA = sc ? (m.player1?.id === a || m.player1_id === a ? sc.a : sc.b) : 0;
    const scoreB = sc ? (m.player1?.id === b || m.player1_id === b ? sc.a : sc.b) : 0;
    ra.goalsFor += scoreA;
    ra.goalDiff += scoreA - scoreB;
    rb.goalsFor += scoreB;
    rb.goalDiff += scoreB - scoreA;
    if (isDraw) {
      ra.points += pointsDraw;
      rb.points += pointsDraw;
    } else if (winnerId === a) {
      ra.points += pointsWin;
    } else if (winnerId === b) {
      rb.points += pointsWin;
    }
  }
  return res;
}

export function computeStandings(
  matches: MatchForStandings[],
  players: PlayerForStandings[],
  config: TiebreakerConfig | null | undefined,
  options: ComputeStandingsOptions = {}
): StandingRow[] | Record<number, StandingRow[]> {
  const cfg = normalizeTiebreakerConfig(config);
  const { groupNumber, matchPlayerStats, teamMembers, registrationType = "player" } = options;
  const pointsWin = cfg.points_win ?? 3;
  const pointsDraw = cfg.points_draw ?? 1;

  const regular = matches.filter((m) => (m.round ?? 0) === 0);
  const groupNumbers = [...new Set(regular.map((m) => (m as any).group_number).filter((g: unknown) => g != null))] as number[];
  if (groupNumber == null && groupNumbers.length > 0) {
    const result: Record<number, StandingRow[]> = {};
    for (const g of groupNumbers.sort((a, b) => a - b)) {
      result[g] = computeStandings(matches, players, config, { ...options, groupNumber: g }) as StandingRow[];
    }
    return result;
  }
  const byGroup = groupNumber != null
    ? regular.filter((m) => (m as any).group_number === groupNumber)
    : regular;

  const table = new Map<string, StandingRow>();
  for (const p of players) {
    if (groupNumber != null) {
      const inThisGroup = byGroup.some(
        (m) => getPlayerId(m, 1) === p.id || getPlayerId(m, 2) === p.id
      );
      if (!inThisGroup) continue;
    } else {
      const inRegular = regular.some(
        (m) => getPlayerId(m, 1) === p.id || getPlayerId(m, 2) === p.id
      );
      if (!inRegular) continue;
    }
    table.set(p.id, {
      player: p,
      wins: 0,
      losses: 0,
      draws: 0,
      points: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      yellowCards: 0,
      redCards: 0,
      fairPlayPoints: 0,
      group: groupNumber,
    });
  }

  // Include completed, forfeit, and walkover — all are decided results that count for W/L and points
  const decidedStatuses = ["completed", "forfeit", "walkover"];
  for (const m of byGroup) {
    if (!decidedStatuses.includes(m.status)) continue;
    const p1Id = getPlayerId(m, 1);
    const p2Id = getPlayerId(m, 2);
    if (!p1Id || !p2Id) continue;
    const r1 = table.get(p1Id);
    const r2 = table.get(p2Id);
    if (!r1 || !r2) continue;

    const sc = parseScorePair(m.score, (m as any).score1, (m as any).score2);
    const winnerId = getWinnerId(m);
    // For forfeit/walkover there is no draw; winner_id is the non-forfeiting side
    const draw =
      m.status === "completed" &&
      isDrawMatch(winnerId, m.status, sc?.a.toString(), sc?.b.toString());

    if (sc) {
      r1.goalsFor += sc.a;
      r1.goalsAgainst += sc.b;
      r2.goalsFor += sc.b;
      r2.goalsAgainst += sc.a;
    }
    r1.goalDiff = r1.goalsFor - r1.goalsAgainst;
    r2.goalDiff = r2.goalsFor - r2.goalsAgainst;

    if (draw) {
      r1.draws++;
      r2.draws++;
      r1.points += pointsDraw;
      r2.points += pointsDraw;
    } else if (winnerId === p1Id) {
      r1.wins++;
      r2.losses++;
      r1.points += pointsWin;
    } else if (winnerId === p2Id) {
      r2.wins++;
      r1.losses++;
      r2.points += pointsWin;
    }
  }

  for (const [pid, row] of table) {
    const { yellow, red } = getCardCounts(
      pid,
      matchPlayerStats,
      teamMembers,
      registrationType
    );
    row.yellowCards = yellow;
    row.redCards = red;
    row.fairPlayPoints = fairPlayPoints(yellow, red);
  }

  const order = cfg.order.filter((c) => c !== "final");
  const useFinalAlphabetical = cfg.final_tiebreaker === "alphabetical";

  function sortRows(rows: StandingRow[]): void {
    rows.sort((a, b) => {
      for (const crit of order) {
        if (crit === "points") {
          if (b.points !== a.points) return b.points - a.points;
        } else if (crit === "wins") {
          if (b.wins !== a.wins) return b.wins - a.wins;
        } else if (crit === "losses") {
          if (a.losses !== b.losses) return a.losses - b.losses; // 少輸較好
        } else if (crit === "draws") {
          if (b.draws !== a.draws) return b.draws - a.draws;
        } else if (crit === "goal_difference") {
          if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
        } else if (crit === "goals_for") {
          if ((b.goalsFor || 0) !== (a.goalsFor || 0)) return (b.goalsFor || 0) - (a.goalsFor || 0);
        } else if (crit === "goals_against") {
          if ((a.goalsAgainst || 0) !== (b.goalsAgainst || 0)) return (a.goalsAgainst || 0) - (b.goalsAgainst || 0); // 少失較好
        } else if (crit === "fair_play") {
          if ((b.fairPlayPoints || 0) !== (a.fairPlayPoints || 0))
            return (b.fairPlayPoints || 0) - (a.fairPlayPoints || 0);
        } else if (crit === "head_to_head") {
          const tied = rows.filter(
            (r) =>
              r.points === a.points &&
              r.goalDiff === a.goalDiff &&
              (r.goalsFor || 0) === (a.goalsFor || 0)
          );
          if (tied.length >= 2 && tied.some((r) => r.player.id === a.player.id) && tied.some((r) => r.player.id === b.player.id)) {
            const ml = miniLeagueStats(
              tied.map((r) => r.player.id),
              byGroup,
              table,
              pointsWin,
              pointsDraw
            );
            const ma = ml.get(a.player.id)!;
            const mb = ml.get(b.player.id)!;
            if (mb.points !== ma.points) return mb.points - ma.points;
            if (mb.goalDiff !== ma.goalDiff) return mb.goalDiff - ma.goalDiff;
            if (mb.goalsFor !== ma.goalsFor) return mb.goalsFor - ma.goalsFor;
          } else {
            const twoH2h = h2h(a.player.id, b.player.id, byGroup, pointsWin, pointsDraw);
            const aIsP1 = a.player.id < b.player.id;
            const aPts = aIsP1 ? twoH2h.p1Points : twoH2h.p2Points;
            const bPts = aIsP1 ? twoH2h.p2Points : twoH2h.p1Points;
            if (bPts !== aPts) return bPts - aPts;
            const aGD = aIsP1 ? twoH2h.p1GoalsFor - twoH2h.p1GoalsAgainst : twoH2h.p2GoalsFor - twoH2h.p2GoalsAgainst;
            const bGD = aIsP1 ? twoH2h.p2GoalsFor - twoH2h.p2GoalsAgainst : twoH2h.p1GoalsFor - twoH2h.p1GoalsAgainst;
            if (bGD !== aGD) return bGD - aGD;
            const aGF = aIsP1 ? twoH2h.p1GoalsFor : twoH2h.p2GoalsFor;
            const bGF = aIsP1 ? twoH2h.p2GoalsFor : twoH2h.p1GoalsFor;
            if (bGF !== aGF) return bGF - aGF;
          }
        }
      }
      // Final tiebreaker:
      // - alphabetical: deterministic order
      // - admin_decide: keep teams tied (return 0 so their relative order stays stable),
      //   so UI/admin can show the same rank and bracket as "XXX/YYY" until admin decides.
      if (useFinalAlphabetical) return a.player.name.localeCompare(b.player.name);
      return 0;
    });
  }

  const rows = Array.from(table.values());
  sortRows(rows);
  return rows;
}
