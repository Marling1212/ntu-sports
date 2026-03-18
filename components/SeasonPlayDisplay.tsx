"use client";

import { Match, Player, SlotPlaceholder } from "@/types/tournament";
import { useState, useMemo } from "react";
import TournamentBracket from "./TournamentBracket";
import BracketPlayerSearch from "./BracketPlayerSearch";
import { getCourtDisplay } from "@/lib/utils/getCourtDisplay";
import { formatScheduledTimeAsStored } from "@/lib/utils/formatScheduledTime";
import Link from "next/link";
import { isDrawMatch } from "@/lib/constants/matchConstants";
import { type DesignVariant, seasonPlayThemes, seasonPlayDefault } from "@/components/design-variants/designThemes";
import { useI18n } from "@/lib/i18n/context";
import type { TiebreakerConfig } from "@/types/database";
import {
  computeStandings,
  normalizeTiebreakerConfig,
  getTiebreakerRulesText,
  computeLockedSeeds,
} from "@/lib/standings";

interface SeasonPlayDisplayProps {
  matches: Match[];
  players: Player[];
  sportName?: string;
  // Control which tabs are visible; default shows all
  visibleTabs?: {
    regular?: boolean;
    standings?: boolean;
    playoffs?: boolean;
  };
  // Which view to show initially
  defaultView?: "regular" | "playoffs" | "standings";
  // Optional: admin-configured number of qualifiers per group
  qualifiersPerGroup?: number;
  // For top scorers display
  registrationType?: 'player' | 'team';
  matchPlayerStats?: Array<{
    match_id: string;
    player_id: string;
    team_member_id?: string;
    stat_name: string;
    stat_value?: string;
  }>;
  teamMembers?: Array<{
    id: string;
    player_id: string;
    name: string;
    jersey_number?: number | null;
  }>;
  /** Design variant for UI comparison (Phase 3). */
  designVariant?: DesignVariant;
  /** Tiebreaker rules (from event.tiebreaker_config). When null/undefined, default rules are used and shown. */
  tiebreakerConfig?: TiebreakerConfig | null;
  /** When "schedule", playoffs view shows a match list (like regular season) instead of the bracket. Use on Games page. */
  playoffsDisplayMode?: "bracket" | "schedule";
}

const TAIPEI_TZ = "Asia/Taipei";
const SOCCER_LIKE_SPORTS = ["soccer", "football"];

type DateFilter = "all" | "today" | "tomorrow" | "week";

function getDateRangeInTaipei(filter: DateFilter): { start: Date; end: Date } | null {
  if (filter === "all") return null;
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: TAIPEI_TZ, year: "numeric", month: "2-digit", day: "2-digit" });
  const parts = formatter.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  const y = parseInt(get("year"), 10);
  const m = parseInt(get("month"), 10) - 1;
  const d = parseInt(get("day"), 10);
  let start: Date;
  let end: Date;
  if (filter === "today") {
    start = new Date(y, m, d, 0, 0, 0, 0);
    end = new Date(y, m, d, 23, 59, 59, 999);
  } else if (filter === "tomorrow") {
    start = new Date(y, m, d + 1, 0, 0, 0, 0);
    end = new Date(y, m, d + 1, 23, 59, 59, 999);
  } else {
    const dayOfWeek = new Date(y, m, d).getDay(); // 0=Sun, 6=Sat
    const weekStartOffset = -dayOfWeek; // Week starts on Sunday
    start = new Date(y, m, d + weekStartOffset, 0, 0, 0, 0);
    end = new Date(y, m, d + weekStartOffset + 6, 23, 59, 59, 999);
  }
  return { start, end };
}

export default function SeasonPlayDisplay({ matches, players, sportName = "Tennis", visibleTabs, defaultView, qualifiersPerGroup: qualifiersFromProps, registrationType = 'player', matchPlayerStats = [], teamMembers = [], designVariant, tiebreakerConfig, playoffsDisplayMode = "bracket" }: SeasonPlayDisplayProps) {
  const { t, locale } = useI18n();
  const theme = designVariant ? seasonPlayThemes[designVariant] : seasonPlayDefault;
  const showTopScorers = SOCCER_LIKE_SPORTS.includes((sportName || "").toLowerCase());
  const tabs = {
    regular: visibleTabs?.regular !== false,
    standings: visibleTabs?.standings !== false,
    playoffs: visibleTabs?.playoffs !== false,
  };
  const initialView: "regular" | "playoffs" | "standings" =
    defaultView && tabs[defaultView] ? defaultView : (tabs.regular ? "regular" : tabs.standings ? "standings" : "playoffs");
  const [view, setView] = useState<"regular" | "playoffs" | "standings">(initialView);
  const [selectedGroup, setSelectedGroup] = useState<number | "all">("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [expandedScorers, setExpandedScorers] = useState(false);
  const [expandedYellowCards, setExpandedYellowCards] = useState(false);
  const [expandedRedCards, setExpandedRedCards] = useState(false);
  /** Filter matches by team/player: click team box to show only their games; click again to clear */
  const [filterByPlayerId, setFilterByPlayerId] = useState<string | null>(null);

  // Separate regular season (round 0) and playoff matches (round >= 1)
  // Get all groups from regular season matches
  const allGroups = useMemo(() => {
    const groups = new Set<number>();
    matches.filter(m => m.round === 0).forEach(m => {
      const groupNum = (m as any).group_number;
      if (groupNum !== null && groupNum !== undefined) {
        groups.add(groupNum);
      }
    });
    return Array.from(groups).sort((a, b) => a - b);
  }, [matches]);

  const hasGroups = allGroups.length > 0;

  // Filter and sort regular season matches
  const regularSeasonMatches = useMemo(() => {
    let filtered = matches.filter(m => m.round === 0);
    
    // Filter by selected group
    if (selectedGroup !== "all") {
      filtered = filtered.filter(m => (m as any).group_number === selectedGroup);
    }
    
    // Sort: upcoming/live first (接下來的比賽 on top), then completed, then delayed; within group by time
    return filtered.sort((a, b) => {
      const aUpcoming = a.status === "upcoming" || a.status === "live";
      const bUpcoming = b.status === "upcoming" || b.status === "live";
      const aDelayed = a.status === "delayed";
      const bDelayed = b.status === "delayed";
      if (aUpcoming && !bUpcoming) return -1;
      if (!aUpcoming && bUpcoming) return 1;
      if (aDelayed && !bDelayed) return 1;
      if (!aDelayed && bDelayed) return -1;
      const aHasTime = Boolean((a as any).scheduled_time);
      const bHasTime = Boolean((b as any).scheduled_time);
      if (aHasTime && bHasTime) {
        const ta = new Date((a as any).scheduled_time).getTime();
        const tb = new Date((b as any).scheduled_time).getTime();
        if (ta !== tb) return ta - tb;
      }
      if (aHasTime !== bHasTime) return aHasTime ? -1 : 1;
      return a.matchNumber - b.matchNumber;
    });
  }, [matches, selectedGroup]);

  const filteredRegularSeasonMatches = useMemo(() => {
    const range = getDateRangeInTaipei(dateFilter);
    if (!range) return regularSeasonMatches;
    return regularSeasonMatches.filter((m) => {
      const t = (m as any).scheduled_time;
      if (!t) return false;
      const matchTime = new Date(t).getTime();
      return matchTime >= range.start.getTime() && matchTime <= range.end.getTime();
    });
  }, [regularSeasonMatches, dateFilter]);

  /** Final display list: apply team/player filter when user clicks a team box */
  const displayRegularMatches = useMemo(() => {
    if (!filterByPlayerId) return filteredRegularSeasonMatches;
    return filteredRegularSeasonMatches.filter(
      (m) => m.player1?.id === filterByPlayerId || m.player2?.id === filterByPlayerId
    );
  }, [filteredRegularSeasonMatches, filterByPlayerId]);

  const playoffMatches = matches.filter(m => m.round >= 1);

  /** From bracket: (seed, group) -> "playoff wins needed to win the event". Same treatment => same tier => same color. */
  const playoffWinsNeededTier = useMemo(() => {
    const roundNum = (m: { round: unknown }) => Number(m.round) || 0;
    const bracketMatches = playoffMatches.filter(
      (m) => !(roundNum(m) === Math.max(...playoffMatches.map((x) => roundNum(x)), 1) && (m as { matchNumber?: number }).matchNumber === 2)
    );
    if (bracketMatches.length === 0) return { tierByKey: new Map<string, number>(), tierColors: [] as string[] };
    const maxRound = Math.max(...bracketMatches.map((m) => roundNum(m)), 1);
    const firstRoundByKey = new Map<string, number>();
    // Process matches in round order. First appearance of each (seed, group) defines their first round of *play*; never overwrite with later rounds (R2+ slots are often "advanced" from R1).
    const byRound = [...bracketMatches].sort(
      (a, b) => roundNum(a) - roundNum(b) || (Number((a as { matchNumber?: number }).matchNumber) ?? 0) - (Number((b as { matchNumber?: number }).matchNumber) ?? 0)
    );
    for (const m of byRound) {
      const r = roundNum(m);
      const hasSlot1 = m.slot1 != null && typeof m.slot1 === "object";
      const hasSlot2 = m.slot2 != null && typeof m.slot2 === "object";
      // First round of play: exactly one slot filled => that seed has a bye this round => first play is next round (r+1). Both filled => they play this round (r).
      const isByeMatch = hasSlot1 !== hasSlot2;
      const firstRound = isByeMatch ? r + 1 : r;
      const add = (seed: number, group: number) => {
        const key = `${seed}-${group}`;
        if (firstRoundByKey.has(key)) return; // already set from an earlier round
        firstRoundByKey.set(key, firstRound);
      };
      if (hasSlot1) add(m.slot1!.seed, m.slot1!.group);
      if (hasSlot2) add(m.slot2!.seed, m.slot2!.group);
    }
    const winsByKey = new Map<string, number>();
    firstRoundByKey.forEach((firstRound, key) => {
      winsByKey.set(key, maxRound - firstRound + 1);
    });
    const uniqueWins = [...new Set(winsByKey.values())].sort((a, b) => a - b);
    const tierByKey = new Map<string, number>();
    winsByKey.forEach((wins, key) => {
      tierByKey.set(key, uniqueWins.indexOf(wins));
    });
    // Very visible tier colors: thick border + strong tint; no alternating row bg so these show clearly.
    const tierColors = [
      "border-l-[8px] border-amber-600 bg-amber-200",
      "border-l-[8px] border-teal-600 bg-teal-200",
      "border-l-[8px] border-lime-600 bg-lime-200",
      "border-l-[8px] border-emerald-600 bg-emerald-200",
      "border-l-[8px] border-sky-600 bg-sky-200",
    ];
    return { tierByKey, tierColors };
  }, [playoffMatches]);

  /** 從上一輪 BYE／單方晉級 帶入本輪，讓 admin 修改第一輪後第二輪顯示會跟著更新 */
  const resolvedPlayoffMatches = useMemo(() => {
    const roundNum = (x: { round: unknown }) => Number(x.round) || 0;
    const matchNum = (x: { matchNumber?: number }) => Number((x as { matchNumber?: number }).matchNumber) ?? 0;
    /** 回傳該場晉級到下一輪的那一側。僅兩種情況帶入：1) 已結束 → winner；2) 明確 BYE (status "bye") 且僅一方有 slot → 該側晉級。Seed vs TBD (一方空但非 bye) 不晉級。 */
    const getAdvancing = (m: Match): { player: Player | null; slot: SlotPlaceholder | null } | null => {
      if (!m) return null;
      if (m.status === "completed" && m.winner != null && typeof m.winner === "object")
        return { player: m.winner, slot: null };
      const has1 = (m.slot1 != null && typeof m.slot1 === "object") || (m.player1 != null && typeof m.player1 === "object");
      const has2 = (m.slot2 != null && typeof m.slot2 === "object") || (m.player2 != null && typeof m.player2 === "object");
      if (has1 && has2) return null; // 兩邊都有人 → 未賽則 TBD
      if (!has1 && !has2) return null;
      // 僅一方有 slot：只有 status "bye" 才視為晉級；Seed vs TBD (upcoming 且一方空) 不晉級
      if (m.status !== "bye") return null;
      const player = has1 ? (m.player1 ?? null) : (m.player2 ?? null);
      const slot = has1 ? (m.slot1 ?? null) : (m.slot2 ?? null);
      return { player, slot: slot && typeof slot === "object" ? slot : null };
    };
    return playoffMatches.map((match) => {
      const r = roundNum(match);
      if (r < 2) return match;
      const prevRound = r - 1;
      const mn = matchNum(match);
      const feed1Num = (mn - 1) * 2 + 1;
      const feed2Num = (mn - 1) * 2 + 2;
      const prev1 = playoffMatches.find((m) => roundNum(m) === prevRound && matchNum(m) === feed1Num);
      const prev2 = playoffMatches.find((m) => roundNum(m) === prevRound && matchNum(m) === feed2Num);
      const adv1 = prev1 ? getAdvancing(prev1) : null;
      const adv2 = prev2 ? getAdvancing(prev2) : null;
      // When prev match exists: use only the resolved advancing side (BYE or completed winner). If 2-sided and not played, show TBD (null), never stale DB slot.
      const slot1 = prev1 ? (adv1?.slot ?? null) : match.slot1;
      const slot2 = prev2 ? (adv2?.slot ?? null) : match.slot2;
      const player1 = prev1 ? (adv1?.player ?? null) : match.player1;
      const player2 = prev2 ? (adv2?.player ?? null) : match.player2;
      return {
        ...match,
        player1,
        slot1,
        player2,
        slot2,
      };
    });
  }, [playoffMatches]);

  const hasRegularSeason = matches.filter(m => m.round === 0).length > 0;
  const hasPlayoffs = playoffMatches.length > 0;

  // Total matches per round (including bye) — used for labels: 4 = Quarterfinals, 2 = Semifinals or Final/3rd
  const playoffRoundTotalCount = useMemo(() => {
    const countByRound = new Map<number, number>();
    resolvedPlayoffMatches.forEach((m) => {
      const r = Number(m.round) || 0;
      countByRound.set(r, (countByRound.get(r) ?? 0) + 1);
    });
    return countByRound;
  }, [resolvedPlayoffMatches]);

  const maxPlayoffRound = useMemo(() => {
    if (resolvedPlayoffMatches.length === 0) return 0;
    return Math.max(...resolvedPlayoffMatches.map((m) => Number(m.round) || 0));
  }, [resolvedPlayoffMatches]);

  // Playoff matches for schedule list: exclude bye, sort by round then match number then time
  const playoffMatchesForSchedule = useMemo(() => {
    if (playoffsDisplayMode !== "schedule" || !hasPlayoffs) return [];
    const noBye = resolvedPlayoffMatches.filter((m) => m.status !== "bye");
    const roundNum = (x: { round: unknown }) => Number(x.round) || 0;
    const matchNum = (x: { matchNumber?: number }) => Number((x as { matchNumber?: number }).matchNumber) ?? 0;
    return [...noBye].sort((a, b) => {
      if (roundNum(a) !== roundNum(b)) return roundNum(a) - roundNum(b);
      if (matchNum(a) !== matchNum(b)) return matchNum(a) - matchNum(b);
      const ta = (a as any).scheduled_time ? new Date((a as any).scheduled_time).getTime() : 0;
      const tb = (b as any).scheduled_time ? new Date((b as any).scheduled_time).getTime() : 0;
      return ta - tb;
    });
  }, [resolvedPlayoffMatches, playoffsDisplayMode, hasPlayoffs]);

  /** Apply team/player filter to playoff schedule list */
  const displayPlayoffScheduleMatches = useMemo(() => {
    if (!filterByPlayerId) return playoffMatchesForSchedule;
    return playoffMatchesForSchedule.filter(
      (m) => m.player1?.id === filterByPlayerId || m.player2?.id === filterByPlayerId
    );
  }, [playoffMatchesForSchedule, filterByPlayerId]);

  // Calculate top scorers for team events
  const topScorers = useMemo(() => {
    if (registrationType !== 'team' || matchPlayerStats.length === 0) return [];
    
    const goalsMap = new Map<string, { name: string; goals: number; teamName?: string; jerseyNumber?: number | null }>();
    
    // Sum up player_goals from match_player_stats for each team member
    matchPlayerStats.forEach(stat => {
      if (stat.stat_name === 'player_goals' && stat.team_member_id && stat.stat_value) {
        const member = teamMembers.find(m => m.id === stat.team_member_id);
        if (member) {
          const team = players.find(p => p.id === member.player_id);
          const key = `${member.player_id}_${member.id}`;
          const current = goalsMap.get(key) || { 
            name: member.name, 
            goals: 0,
            teamName: team?.name,
            jerseyNumber: member.jersey_number
          };
          goalsMap.set(key, {
            name: member.name,
            goals: current.goals + (parseInt(stat.stat_value) || 0),
            teamName: team?.name,
            jerseyNumber: member.jersey_number
          });
        }
      }
    });
    
    const playerGoalsArray: Array<{ name: string; goals: number; teamName?: string; jerseyNumber?: number | null }> = [];
    goalsMap.forEach((value) => {
      playerGoalsArray.push(value);
    });
    
    return playerGoalsArray
      .sort((a, b) => b.goals - a.goals)
      .filter(s => s.goals > 0)
      .map((item, idx) => ({
        id: `player_${idx}`,
        name: item.name,
        goalsFor: item.goals,
        teamName: item.teamName,
        jerseyNumber: item.jerseyNumber
      }));
  }, [matchPlayerStats, teamMembers, registrationType, players]);
  
  // Get top 5 and all scorers
  const top5Scorers = topScorers.slice(0, 5);
  const allScorers = topScorers;

  // Calculate yellow cards Top 5
  const topYellowCards = useMemo(() => {
    const cardsMap = new Map<string, { name: string; cards: number; teamName?: string; jerseyNumber?: number | null }>();
    
    matchPlayerStats.forEach(stat => {
      // 檢查常見的黃牌統計名稱（支援多種命名方式）
      const isYellowCard = stat.stat_name === 'yellow_card' || 
                          stat.stat_name === 'yellow_cards' || 
                          stat.stat_name === '黃牌' ||
                          stat.stat_name?.toLowerCase().includes('yellow') ||
                          stat.stat_name?.includes('黃');
      
      if (isYellowCard && stat.stat_value) {
        const cardCount = parseInt(stat.stat_value) || 0;
        if (cardCount > 0) {
          if (registrationType === 'team' && stat.team_member_id) {
            // 團隊賽事：個別球員
            const member = teamMembers.find(m => m.id === stat.team_member_id);
            if (member) {
              const team = players.find(p => p.id === member.player_id);
              const key = `${member.player_id}_${member.id}`;
              const current = cardsMap.get(key) || { 
                name: member.name, 
                cards: 0,
                teamName: team?.name,
                jerseyNumber: member.jersey_number
              };
              cardsMap.set(key, {
                name: member.name,
                cards: current.cards + cardCount,
                teamName: team?.name,
                jerseyNumber: member.jersey_number
              });
            }
          } else {
            // 個人賽事：隊伍/選手
            const player = players.find(p => p.id === stat.player_id);
            if (player) {
              const current = cardsMap.get(stat.player_id) || { name: player.name, cards: 0 };
              cardsMap.set(stat.player_id, {
                name: player.name,
                cards: current.cards + cardCount
              });
            }
          }
        }
      }
    });
    
    return Array.from(cardsMap.values())
      .sort((a, b) => b.cards - a.cards)
      .filter(s => s.cards > 0)
      .map((item, idx) => ({
        id: `yellow_${idx}`,
        name: item.name,
        count: item.cards,
        teamName: item.teamName,
        jerseyNumber: item.jerseyNumber
      }));
  }, [matchPlayerStats, teamMembers, registrationType, players]);
  
  // Get top 5 and all yellow cards
  const top5YellowCards = topYellowCards.slice(0, 5);
  const allYellowCards = topYellowCards;

  // Calculate red cards Top 5
  const topRedCards = useMemo(() => {
    const cardsMap = new Map<string, { name: string; cards: number; teamName?: string; jerseyNumber?: number | null }>();
    
    matchPlayerStats.forEach(stat => {
      // 檢查常見的紅牌統計名稱（支援多種命名方式）
      const isRedCard = stat.stat_name === 'red_card' || 
                        stat.stat_name === 'red_cards' || 
                        stat.stat_name === '紅牌' ||
                        stat.stat_name?.toLowerCase().includes('red') ||
                        stat.stat_name?.includes('紅');
      
      if (isRedCard && stat.stat_value) {
        const cardCount = parseInt(stat.stat_value) || 0;
        if (cardCount > 0) {
          if (registrationType === 'team' && stat.team_member_id) {
            // 團隊賽事：個別球員
            const member = teamMembers.find(m => m.id === stat.team_member_id);
            if (member) {
              const team = players.find(p => p.id === member.player_id);
              const key = `${member.player_id}_${member.id}`;
              const current = cardsMap.get(key) || { 
                name: member.name, 
                cards: 0,
                teamName: team?.name,
                jerseyNumber: member.jersey_number
              };
              cardsMap.set(key, {
                name: member.name,
                cards: current.cards + cardCount,
                teamName: team?.name,
                jerseyNumber: member.jersey_number
              });
            }
          } else {
            // 個人賽事：隊伍/選手
            const player = players.find(p => p.id === stat.player_id);
            if (player) {
              const current = cardsMap.get(stat.player_id) || { name: player.name, cards: 0 };
              cardsMap.set(stat.player_id, {
                name: player.name,
                cards: current.cards + cardCount
              });
            }
          }
        }
      }
    });
    
    return Array.from(cardsMap.values())
      .sort((a, b) => b.cards - a.cards)
      .filter(s => s.cards > 0)
      .map((item, idx) => ({
        id: `red_${idx}`,
        name: item.name,
        count: item.cards,
        teamName: item.teamName,
        jerseyNumber: item.jerseyNumber
      }));
  }, [matchPlayerStats, teamMembers, registrationType, players]);
  
  // Get top 5 and all red cards
  const top5RedCards = topRedCards.slice(0, 5);
  const allRedCards = topRedCards;

  // Derive number of qualifiers (top X) from existing playoff round-1 participants if available.
  // Fallback to 4 if no playoffs yet.
  const qualifiersPerGroup = useMemo(() => {
    if (typeof qualifiersFromProps === "number" && qualifiersFromProps > 0) {
      return qualifiersFromProps;
    }
    if (!hasRegularSeason) return 0;
    // Determine number of groups (>=1)
    const numGroups = Math.max(1, allGroups.length || 1);
    // If playoffs exist, infer X from round 1 participants
    const round1 = matches.filter(m => m.round === 1);
    if (round1.length > 0) {
      const ids = new Set<string>();
      round1.forEach(m => {
        if (m.player1?.id) ids.add(m.player1.id);
        if (m.player2?.id) ids.add(m.player2.id);
      });
      const totalRound1Players = ids.size;
      const perGroup = Math.max(1, Math.floor(totalRound1Players / numGroups));
      return perGroup;
    }
    // No playoffs yet → default visual hint to 4
    return 4;
  }, [matches, allGroups, hasRegularSeason, qualifiersFromProps]);

  // Format date/time for display (stored value = display, no +8 shift)
  const formatDateTime = (dateTimeStr: string | null | undefined): string => {
    if (!dateTimeStr) return "TBD";
    const formatted = formatScheduledTimeAsStored(dateTimeStr);
    return formatted === "—" ? "TBD" : formatted;
  };

  type StandingRow = {
    player: Player;
    wins: number;
    losses: number;
    draws: number;
    points: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDiff: number;
    yellowCards: number;
    redCards: number;
    fairPlayPoints: number; // Negative value: more negative = worse (more cards)
    group?: number;
    // Head-to-head statistics (only calculated for tied teams)
    headToHeadPoints?: number;
    headToHeadGoalDiff?: number;
    headToHeadGoalsFor?: number;
  };

  const parseScorePair = (s?: string): { a: number; b: number } | null => {
    if (!s) return null;
    const m = s.match(/(\d+)\s*[-:]\s*(\d+)/);
    if (!m) return null;
    const a = parseInt(m[0] ? m[1] : "", 10);
    const b = parseInt(m[2], 10);
    if (Number.isNaN(a) || Number.isNaN(b)) return null;
    return { a, b };
  };

  // Calculate fair play points (negative value: more negative = worse)
  // Yellow card = -1, Red card = -3
  const calculateFairPlayPoints = (yellowCards: number, redCards: number): number => {
    return -(yellowCards + redCards * 3);
  };

  // Calculate head-to-head statistics between two teams
  const calculateHeadToHead = (
    player1Id: string,
    player2Id: string,
    matches: Match[]
  ): {
    player1Points: number;
    player2Points: number;
    player1GoalDiff: number;
    player2GoalDiff: number;
    player1GoalsFor: number;
    player2GoalsFor: number;
  } => {
    let p1Points = 0;
    let p2Points = 0;
    let p1GoalsFor = 0;
    let p2GoalsFor = 0;
    let p1GoalsAgainst = 0;
    let p2GoalsAgainst = 0;

    // Find all matches between these two players/teams
    const decidedStatuses = ["completed", "forfeit", "walkover"];
    const headToHeadMatches = matches.filter((m) => {
      if (!decidedStatuses.includes(m.status)) return false;
      const hasPlayer1 = m.player1?.id === player1Id || m.player1?.id === player2Id;
      const hasPlayer2 = m.player2?.id === player1Id || m.player2?.id === player2Id;
      return hasPlayer1 && hasPlayer2;
    });

    headToHeadMatches.forEach((m) => {
      const sc = parseScorePair(m.score);
      const matchWinnerId = (m as any).winner_id;
      const matchStatus = (m as any).status;
      
      // Determine which player is which in this match
      const isP1First = m.player1?.id === player1Id;
      const p1Score = isP1First ? (sc?.a || 0) : (sc?.b || 0);
      const p2Score = isP1First ? (sc?.b || 0) : (sc?.a || 0);

      p1GoalsFor += p1Score;
      p2GoalsFor += p2Score;
      p1GoalsAgainst += p2Score;
      p2GoalsAgainst += p1Score;

      if (sc) {
        const isMatchDraw = isDrawMatch(matchWinnerId, matchStatus, p1Score.toString(), p2Score.toString());
        
        if (isMatchDraw) {
          p1Points += 1;
          p2Points += 1;
        } else if (m.winner) {
          if (m.winner.id === player1Id) {
            p1Points += 3;
          } else if (m.winner.id === player2Id) {
            p2Points += 3;
          }
        }
      } else if (m.winner) {
        // No score but has winner
        if (m.winner.id === player1Id) {
          p1Points += 3;
        } else if (m.winner.id === player2Id) {
          p2Points += 3;
        }
      }
    });

    return {
      player1Points: p1Points,
      player2Points: p2Points,
      player1GoalDiff: p1GoalsFor - p1GoalsAgainst,
      player2GoalDiff: p2GoalsFor - p2GoalsAgainst,
      player1GoalsFor: p1GoalsFor,
      player2GoalsFor: p2GoalsFor,
    };
  };

  // Calculate standings from regular season (per group if groups exist)
  const calculateStandings = () => {
    if (hasGroups && selectedGroup !== "all") {
      return calculateGroupStandings(selectedGroup);
    } else if (hasGroups) {
      const groupStandingsMap: { [groupNum: number]: Array<StandingRow> } = {};
      allGroups.forEach((g) => {
        groupStandingsMap[g] = calculateGroupStandings(g);
      });
      return groupStandingsMap;
    } else {
      const table: { [pid: string]: StandingRow } = {} as any;

      players.forEach((p) => {
        (table as any)[p.id] = {
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
        } as any;
      });

      regularSeasonMatches.forEach((m) => {
        if (m.status === "completed" && m.player1?.id && m.player2?.id) {
          const p1 = table[m.player1.id] as any;
          const p2 = table[m.player2.id] as any;
          const sc = parseScorePair(m.score);
          if (sc) {
            p1.goalsFor += sc.a; p1.goalsAgainst += sc.b;
            p2.goalsFor += sc.b; p2.goalsAgainst += sc.a;
            
            // Check for draw (equal scores or explicitly set as draw)
            const matchWinnerId = (m as any).winner_id;
            const matchStatus = (m as any).status;
            const isMatchDraw = isDrawMatch(matchWinnerId, matchStatus, sc.a.toString(), sc.b.toString());
            if (isMatchDraw) {
              p1.draws += 1; p1.points += 1;
              p2.draws += 1; p2.points += 1;
            } else if (m.winner && !isMatchDraw) {
              // Has winner, not a draw
              if (m.winner.id === m.player1.id) {
                p1.wins += 1; p1.points += 3; p2.losses += 1;
              } else if (m.winner.id === m.player2.id) {
                p2.wins += 1; p2.points += 3; p1.losses += 1;
              }
            }
          } else if (m.winner) {
            // No score but has winner
            if (m.winner.id === m.player1.id) {
              p1.wins += 1; p1.points += 3; p2.losses += 1;
            } else if (m.winner.id === m.player2.id) {
              p2.wins += 1; p2.points += 3; p1.losses += 1;
            }
          }
        }
      });

      // Calculate yellow and red cards for each player/team
      Object.keys(table).forEach(playerId => {
        const row = table[playerId] as any;
        let yellowCount = 0;
        let redCount = 0;
        
        matchPlayerStats.forEach(stat => {
          if (registrationType === 'team') {
            // For team events, sum cards from all team members
            if (stat.team_member_id) {
              const member = teamMembers.find(m => m.id === stat.team_member_id);
              if (member && member.player_id === playerId) {
                const isYellowCard = stat.stat_name === 'yellow_card' || 
                                    stat.stat_name === 'yellow_cards' || 
                                    stat.stat_name === '黃牌' ||
                                    stat.stat_name?.toLowerCase().includes('yellow') ||
                                    stat.stat_name?.includes('黃');
                const isRedCard = stat.stat_name === 'red_card' || 
                                  stat.stat_name === 'red_cards' || 
                                  stat.stat_name === '紅牌' ||
                                  stat.stat_name?.toLowerCase().includes('red') ||
                                  stat.stat_name?.includes('紅');
                
                if (isYellowCard && stat.stat_value) {
                  yellowCount += parseInt(stat.stat_value) || 0;
                }
                if (isRedCard && stat.stat_value) {
                  redCount += parseInt(stat.stat_value) || 0;
                }
              }
            }
          } else {
            // For individual events
            if (stat.player_id === playerId) {
              const isYellowCard = stat.stat_name === 'yellow_card' || 
                                  stat.stat_name === 'yellow_cards' || 
                                  stat.stat_name === '黃牌' ||
                                  stat.stat_name?.toLowerCase().includes('yellow') ||
                                  stat.stat_name?.includes('黃');
              const isRedCard = stat.stat_name === 'red_card' || 
                                stat.stat_name === 'red_cards' || 
                                stat.stat_name === '紅牌' ||
                                stat.stat_name?.toLowerCase().includes('red') ||
                                stat.stat_name?.includes('紅');
              
              if (isYellowCard && stat.stat_value) {
                yellowCount += parseInt(stat.stat_value) || 0;
              }
              if (isRedCard && stat.stat_value) {
                redCount += parseInt(stat.stat_value) || 0;
              }
            }
          }
        });
        
        row.yellowCards = yellowCount;
        row.redCards = redCount;
        row.fairPlayPoints = calculateFairPlayPoints(yellowCount, redCount);
      });

      const rows: Array<StandingRow> = Object.values(table).map((r: any) => ({
        ...r,
        goalDiff: (r.goalsFor || 0) - (r.goalsAgainst || 0),
        yellowCards: r.yellowCards || 0,
        redCards: r.redCards || 0,
        fairPlayPoints: r.fairPlayPoints || 0,
      }));

      // Enhanced sorting with head-to-head and fair play tiebreakers
      return rows.sort((a, b) => {
        // 1. Points (highest first)
        if (b.points !== a.points) return b.points - a.points;
        
        // 2. Goal Difference (highest first)
        if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
        
        // 3. Goals For (highest first)
        if ((b.goalsFor || 0) !== (a.goalsFor || 0)) return (b.goalsFor || 0) - (a.goalsFor || 0);
        
        // 4. Head-to-Head Points (calculate on-the-fly for tied teams)
        const h2h = calculateHeadToHead(a.player.id, b.player.id, regularSeasonMatches);
        if (h2h.player1Points !== h2h.player2Points) {
          // Determine which is player1 in our comparison
          const aIsPlayer1 = a.player.id < b.player.id;
          const aH2hPoints = aIsPlayer1 ? h2h.player1Points : h2h.player2Points;
          const bH2hPoints = aIsPlayer1 ? h2h.player2Points : h2h.player1Points;
          if (bH2hPoints !== aH2hPoints) return bH2hPoints - aH2hPoints;
        }
        
        // 5. Head-to-Head Goal Difference
        const aIsPlayer1 = a.player.id < b.player.id;
        const aH2hGoalDiff = aIsPlayer1 ? h2h.player1GoalDiff : h2h.player2GoalDiff;
        const bH2hGoalDiff = aIsPlayer1 ? h2h.player2GoalDiff : h2h.player1GoalDiff;
        if (bH2hGoalDiff !== aH2hGoalDiff) return bH2hGoalDiff - aH2hGoalDiff;
        
        // 6. Head-to-Head Goals For
        const aH2hGoalsFor = aIsPlayer1 ? h2h.player1GoalsFor : h2h.player2GoalsFor;
        const bH2hGoalsFor = aIsPlayer1 ? h2h.player2GoalsFor : h2h.player1GoalsFor;
        if (bH2hGoalsFor !== aH2hGoalsFor) return bH2hGoalsFor - aH2hGoalsFor;
        
        // 7. Fair Play Points (highest/most positive first = fewer cards)
        if ((b.fairPlayPoints || 0) !== (a.fairPlayPoints || 0)) {
          return (b.fairPlayPoints || 0) - (a.fairPlayPoints || 0);
        }
        
        // 8. Final tiebreaker: alphabetical by name (or ID)
        return a.player.name.localeCompare(b.player.name);
      });
    }
  };

  const calculateGroupStandings = (groupNum: number) => {
    const table: { [pid: string]: StandingRow } = {} as any;

    const groupMatches = matches.filter((m) => m.round === 0 && (m as any).group_number === groupNum);
    const groupPlayerIds = new Set<string>();
    groupMatches.forEach((m) => {
      if (m.player1?.id) groupPlayerIds.add(m.player1.id);
      if (m.player2?.id) groupPlayerIds.add(m.player2.id);
    });
    
    groupPlayerIds.forEach(playerId => {
      const player = players.find(p => p.id === playerId);
      if (player) {
        (table as any)[playerId] = { player, wins: 0, losses: 0, draws: 0, points: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, yellowCards: 0, redCards: 0, fairPlayPoints: 0, group: groupNum };
      }
    });

    groupMatches.forEach((m) => {
      if (m.status === "completed" && m.player1?.id && m.player2?.id) {
        const p1 = table[m.player1?.id] as any;
        const p2 = table[m.player2?.id] as any;
        const sc = parseScorePair(m.score);
        if (sc) {
          p1.goalsFor += sc.a; p1.goalsAgainst += sc.b; p1.goalDiff = p1.goalsFor - p1.goalsAgainst;
          p2.goalsFor += sc.b; p2.goalsAgainst += sc.a; p2.goalDiff = p2.goalsFor - p2.goalsAgainst;
          
          // Check for draw (equal scores or explicitly set as draw)
          const matchWinnerId = (m as any).winner_id;
          const matchStatus = (m as any).status;
          const isMatchDraw = isDrawMatch(matchWinnerId, matchStatus, sc.a.toString(), sc.b.toString());
          if (isMatchDraw) {
            p1.draws += 1; p1.points += 1;
            p2.draws += 1; p2.points += 1;
          } else if (m.winner && !isMatchDraw) {
            // Has winner, not a draw
            if (m.winner.id === m.player1?.id) { p1.wins += 1; p1.points += 3; p2.losses += 1; }
            else if (m.winner.id === m.player2?.id) { p2.wins += 1; p2.points += 3; p1.losses += 1; }
          }
        } else if (m.winner) {
          // No score but has winner
          if (m.winner.id === m.player1?.id) { p1.wins += 1; p1.points += 3; p2.losses += 1; }
          else if (m.winner.id === m.player2?.id) { p2.wins += 1; p2.points += 3; p1.losses += 1; }
        }
      }
    });

    // Calculate yellow and red cards for each player/team in this group
    Object.keys(table).forEach(playerId => {
      const row = table[playerId] as any;
      let yellowCount = 0;
      let redCount = 0;
      
      matchPlayerStats.forEach(stat => {
        if (registrationType === 'team') {
          // For team events, sum cards from all team members
          if (stat.team_member_id) {
            const member = teamMembers.find(m => m.id === stat.team_member_id);
            if (member && member.player_id === playerId) {
              const isYellowCard = stat.stat_name === 'yellow_card' || 
                                  stat.stat_name === 'yellow_cards' || 
                                  stat.stat_name === '黃牌' ||
                                  stat.stat_name?.toLowerCase().includes('yellow') ||
                                  stat.stat_name?.includes('黃');
              const isRedCard = stat.stat_name === 'red_card' || 
                                stat.stat_name === 'red_cards' || 
                                stat.stat_name === '紅牌' ||
                                stat.stat_name?.toLowerCase().includes('red') ||
                                stat.stat_name?.includes('紅');
              
              if (isYellowCard && stat.stat_value) {
                yellowCount += parseInt(stat.stat_value) || 0;
              }
              if (isRedCard && stat.stat_value) {
                redCount += parseInt(stat.stat_value) || 0;
              }
            }
          }
        } else {
          // For individual events
          if (stat.player_id === playerId) {
            const isYellowCard = stat.stat_name === 'yellow_card' || 
                                stat.stat_name === 'yellow_cards' || 
                                stat.stat_name === '黃牌' ||
                                stat.stat_name?.toLowerCase().includes('yellow') ||
                                stat.stat_name?.includes('黃');
            const isRedCard = stat.stat_name === 'red_card' || 
                              stat.stat_name === 'red_cards' || 
                              stat.stat_name === '紅牌' ||
                              stat.stat_name?.toLowerCase().includes('red') ||
                              stat.stat_name?.includes('紅');
            
            if (isYellowCard && stat.stat_value) {
              yellowCount += parseInt(stat.stat_value) || 0;
            }
            if (isRedCard && stat.stat_value) {
              redCount += parseInt(stat.stat_value) || 0;
            }
          }
        }
      });
      
      row.yellowCards = yellowCount;
      row.redCards = redCount;
      row.fairPlayPoints = calculateFairPlayPoints(yellowCount, redCount);
    });

    const rows: Array<StandingRow> = Object.values(table).map((r: any) => ({
      player: r.player,
      wins: r.wins || 0,
      losses: r.losses || 0,
      draws: r.draws || 0,
      points: r.points || 0,
      goalsFor: r.goalsFor || 0,
      goalsAgainst: r.goalsAgainst || 0,
      goalDiff: (r.goalsFor || 0) - (r.goalsAgainst || 0),
      yellowCards: r.yellowCards || 0,
      redCards: r.redCards || 0,
      fairPlayPoints: r.fairPlayPoints || 0,
      group: r.group,
    }));

    // Enhanced sorting with head-to-head and fair play tiebreakers
    return rows.sort((a, b) => {
      // 1. Points (highest first)
      if (b.points !== a.points) return b.points - a.points;
      
      // 2. Goal Difference (highest first)
      if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
      
      // 3. Goals For (highest first)
      if ((b.goalsFor || 0) !== (a.goalsFor || 0)) return (b.goalsFor || 0) - (a.goalsFor || 0);
      
      // 4. Head-to-Head Points (calculate on-the-fly for tied teams)
      const h2h = calculateHeadToHead(a.player.id, b.player.id, groupMatches);
      if (h2h.player1Points !== h2h.player2Points) {
        const aIsPlayer1 = a.player.id < b.player.id;
        const aH2hPoints = aIsPlayer1 ? h2h.player1Points : h2h.player2Points;
        const bH2hPoints = aIsPlayer1 ? h2h.player2Points : h2h.player1Points;
        if (bH2hPoints !== aH2hPoints) return bH2hPoints - aH2hPoints;
      }
      
      // 5. Head-to-Head Goal Difference
      const aIsPlayer1 = a.player.id < b.player.id;
      const aH2hGoalDiff = aIsPlayer1 ? h2h.player1GoalDiff : h2h.player2GoalDiff;
      const bH2hGoalDiff = aIsPlayer1 ? h2h.player2GoalDiff : h2h.player1GoalDiff;
      if (bH2hGoalDiff !== aH2hGoalDiff) return bH2hGoalDiff - aH2hGoalDiff;
      
      // 6. Head-to-Head Goals For
      const aH2hGoalsFor = aIsPlayer1 ? h2h.player1GoalsFor : h2h.player2GoalsFor;
      const bH2hGoalsFor = aIsPlayer1 ? h2h.player2GoalsFor : h2h.player1GoalsFor;
      if (bH2hGoalsFor !== aH2hGoalsFor) return bH2hGoalsFor - aH2hGoalsFor;
      
      // 7. Fair Play Points (highest/most positive first = fewer cards)
      if ((b.fairPlayPoints || 0) !== (a.fairPlayPoints || 0)) {
        return (b.fairPlayPoints || 0) - (a.fairPlayPoints || 0);
      }
      
      // 8. Final tiebreaker: alphabetical by name
      return a.player.name.localeCompare(b.player.name);
    });
  };

  const config = useMemo(() => normalizeTiebreakerConfig(tiebreakerConfig), [tiebreakerConfig]);
  const standings = useMemo(() => {
    const opts = {
      matchPlayerStats,
      teamMembers,
      registrationType,
      groupNumber:
        hasGroups && selectedGroup !== "all" ? (selectedGroup as number) : undefined,
    };
    return computeStandings(
      regularSeasonMatches as any,
      players,
      config,
      opts
    );
  }, [
    regularSeasonMatches,
    players,
    config,
    hasGroups,
    selectedGroup,
    matchPlayerStats,
    teamMembers,
    registrationType,
  ]);

  const tiebreakerRulesLines = useMemo(
    () => getTiebreakerRulesText(config, locale === "zh" ? "zh" : "en"),
    [config, locale]
  );

  const lockedPlayoffSeeds = useMemo(() => {
    if (!hasPlayoffs || qualifiersPerGroup < 1) return new Map<string, string>();
    const regularForLock = regularSeasonMatches.map((m) => ({
      player1_id: m.player1?.id ?? null,
      player2_id: m.player2?.id ?? null,
      winner_id: (m as any).winner_id ?? m.winner?.id ?? null,
      score1: (m as any).score1,
      score2: (m as any).score2,
      status: m.status,
      round: 0,
      group_number: m.group_number,
    }));
    const playersForLock = players.map((p) => ({
      id: p.id,
      name: p.name,
      seed: p.seed,
      school: p.school,
    }));
    return computeLockedSeeds(regularForLock as any, playersForLock, tiebreakerConfig, {
      maxSeed: qualifiersPerGroup,
      matchPlayerStats,
      teamMembers,
      registrationType: registrationType as "player" | "team",
    });
  }, [
    hasPlayoffs,
    qualifiersPerGroup,
    regularSeasonMatches,
    players,
    tiebreakerConfig,
    matchPlayerStats,
    teamMembers,
    registrationType,
  ]);

  /** Which playoff seed (1..X) this team is mathematically locked into for this group, if any. */
  const getLockedPlayoffSeed = (playerId: string, groupNum: number): number | null => {
    for (let s = 1; s <= qualifiersPerGroup; s++) {
      if (lockedPlayoffSeeds.get(`${s},${groupNum}`) === playerId) return s;
    }
    return null;
  };

  /** Left border tier (path) — index aligns with playoffWinsNeededTier.tierColors */
  const standingTierBorder = [
    "border-l-[8px] border-amber-600",
    "border-l-[8px] border-teal-600",
    "border-l-[8px] border-lime-600",
    "border-l-[8px] border-emerald-600",
    "border-l-[8px] border-sky-600",
  ];
  const standingTierBg = [
    "bg-amber-200",
    "bg-teal-200",
    "bg-lime-200",
    "bg-emerald-200",
    "bg-sky-200",
  ];

  /**
   * Standings: top X rows always get the dark left stripe for that rank’s bracket path.
   * Background fill only when that team’s playoff seed is mathematically locked.
   */
  const getQualifierRowClass = (playerId: string, groupNum: number, rankIdx: number) => {
    const parts: string[] = [];
    if (hasPlayoffs) {
      if (rankIdx < qualifiersPerGroup) {
        const rankSeed = rankIdx + 1;
        const key = `${rankSeed}-${groupNum}`;
        const tier = playoffWinsNeededTier.tierByKey.get(key);
        parts.push(
          tier !== undefined && standingTierBorder[tier]
            ? standingTierBorder[tier]
            : "border-l-[8px] border-yellow-600"
        );
      } else {
        parts.push("border-l-[8px] border-gray-500");
      }
    }
    const lockedSeed = getLockedPlayoffSeed(playerId, groupNum);
    if (lockedSeed != null) {
      const k = `${lockedSeed}-${groupNum}`;
      const t = playoffWinsNeededTier.tierByKey.get(k);
      parts.push(
        t !== undefined && standingTierBg[t] ? standingTierBg[t] : "bg-yellow-200"
      );
    }
    const stripe = parts.join(" ");
    const alt = rankIdx % 2 === 0 ? "bg-gray-50" : "bg-white";
    if (!stripe) return alt;
    if (lockedSeed != null) return stripe;
    return `${stripe} ${alt}`;
  };

  // Count decided matches (completed, forfeit, walkover all count toward standings)
  const completedRegularMatches = regularSeasonMatches.filter(m =>
    ['completed', 'forfeit', 'walkover'].includes(m.status)
  ).length;
  const totalRegularMatches = regularSeasonMatches.length;

  return (
    <div className={theme.root}>
      {/* View Tabs: sticky on mobile so Games/Standings/Playoffs stay visible when scrolling */}
      <div className={`${theme.tabsContainer} sticky top-0 z-10 md:static`}>
        <div className="flex w-full overflow-x-auto">
          {hasRegularSeason && tabs.regular && (
            <button
              onClick={() => setView("regular")}
              className={`flex-1 min-w-[7rem] sm:min-w-[8.75rem] md:min-w-[140px] ${view === "regular" ? theme.tabActive : theme.tabInactive}`}
            >
              🏀 {t("seasonPlay.tabRegular")}
            </button>
          )}
          {hasRegularSeason && tabs.standings && (
            <button
              onClick={() => setView("standings")}
              className={`flex-1 min-w-[7rem] sm:min-w-[8.75rem] md:min-w-[140px] ${view === "standings" ? theme.tabActive : theme.tabInactive}`}
            >
              📊 {t("seasonPlay.tabStandings")}
            </button>
          )}
          {hasPlayoffs && tabs.playoffs && (
            <button
              onClick={() => setView("playoffs")}
              className={`flex-1 min-w-[7rem] sm:min-w-[8.75rem] md:min-w-[140px] ${view === "playoffs" ? theme.tabActive : theme.tabInactive}`}
            >
              🏆 {t("seasonPlay.tabPlayoffs")}
            </button>
          )}
        </div>
      </div>

      {/* Regular Season View */}
      {view === "regular" && hasRegularSeason && (
        <div>
          <div className={theme.infoBox}>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                <p className={`${theme.infoBoxText} text-xs md:text-sm whitespace-nowrap truncate max-w-full md:whitespace-normal md:overflow-visible md:max-w-none`}>
                  <strong>{t("seasonPlay.regularProgress")}</strong> {t("seasonPlay.matchesCompleted").replace("{completed}", String(completedRegularMatches)).replace("{total}", String(totalRegularMatches))}
                </p>
                {hasGroups && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-blue-800">{t("seasonPlay.filterByGroup")}</label>
                    <select
                      value={selectedGroup}
                      onChange={(e) => setSelectedGroup(e.target.value === "all" ? "all" : parseInt(e.target.value))}
                      className="px-3 py-1.5 border border-blue-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="all">{t("seasonPlay.allGroups")}</option>
                      {allGroups.map(groupNum => (
                        <option key={groupNum} value={groupNum}>{t("seasonPlay.groupN").replace("{n}", String(groupNum))}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                <span className="text-xs md:text-sm font-semibold text-gray-700 shrink-0">{t("seasonPlay.filterByDate")}</span>
                {(["all", "today", "tomorrow", "week"] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setDateFilter(key)}
                    className={`px-2 py-1 md:px-3 md:py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
                      dateFilter === key
                        ? "bg-ntu-green text-white"
                        : "bg-white border border-gray-300 text-gray-700 hover:border-ntu-green hover:text-ntu-green"
                    }`}
                  >
                    {key === "all" ? t("seasonPlay.filterAll") : key === "today" ? t("seasonPlay.filterToday") : key === "tomorrow" ? t("seasonPlay.filterTomorrow") : t("seasonPlay.filterThisWeek")}
                  </button>
                ))}
                {filterByPlayerId && (
                  <button
                    type="button"
                    onClick={() => setFilterByPlayerId(null)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200"
                    title={t("seasonPlay.filterShowAll")}
                  >
                    ✕ {t("seasonPlay.filterShowingOnly").replace("{name}", players.find((p) => p.id === filterByPlayerId)?.name ?? "?")}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className={theme.tableWrapper}>
            {/* Mobile card view */}
            <div className="md:hidden space-y-3">
              {displayRegularMatches.length === 0 ? (
                <p className="px-4 py-8 text-center text-gray-500">{t("seasonPlay.noMatchesForGroup")}</p>
              ) : (
                displayRegularMatches.map((match) => {
                  const matchData = match as any;
                  const matchUrl = `/sports/${sportName.toLowerCase()}/matches/${match.id}`;
                  return (
                    <div
                      key={match.id}
                      className={`block rounded-xl border border-gray-200 p-4 shadow-sm hover:border-ntu-green hover:shadow-md transition-all duration-200 hover:scale-[1.02] ${match.status === "live" ? "bg-red-100 animate-pulse" : "bg-white"}`}
                    >
                      {hasGroups && (
                        <div className="mb-2">
                          <span className="inline-block px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded">
                            {t("seasonPlay.groupN").replace("{n}", String(matchData.group_number ?? "-"))}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-600">{formatDateTime(matchData.scheduled_time)}</span>
                        {match.status === "completed" && <span className={theme.badgeCompleted}>{t("sports.completed")}</span>}
                        {match.status === "live" && <span className={theme.badgeLive}>{t("sports.live")}</span>}
                        {match.status === "upcoming" && <span className={theme.badgeUpcoming}>{t("sports.upcoming")}</span>}
                        {match.status === "delayed" && <span className={theme.badgeDelayed}>{t("sports.delayed")}</span>}
                        {match.status === "forfeit" && <span className="inline-block px-2 py-1 text-xs font-semibold text-orange-800 bg-orange-100 rounded">{t("sports.forfeit")}</span>}
                        {match.status === "walkover" && <span className="inline-block px-2 py-1 text-xs font-semibold text-purple-800 bg-purple-100 rounded">{t("sports.walkover")}</span>}
                      </div>
                      <div className="text-sm text-gray-600 mb-1">{getCourtDisplay(matchData as any)}</div>
                      <div className="flex items-center justify-between gap-2 text-base font-semibold text-gray-800">
                        <button
                          type="button"
                          onClick={match.player1?.id ? () => setFilterByPlayerId((prev) => (prev === match.player1?.id ? null : match.player1?.id ?? null)) : undefined}
                          className={`flex-1 min-w-0 text-left truncate py-2 -mx-1 px-1 rounded touch-manipulation active:scale-[0.99] ${filterByPlayerId === match.player1?.id ? "ring-2 ring-amber-400 bg-amber-100" : ""}`}
                          title={match.player1?.id ? t("seasonPlay.filterByTeamHint") : undefined}
                        >
                          {match.player1?.name || t("bracket.tbd")}
                        </button>
                        <Link href={matchUrl} className="shrink-0 text-ntu-green font-bold px-2 py-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
                          VS
                        </Link>
                        <button
                          type="button"
                          onClick={match.player2?.id ? () => setFilterByPlayerId((prev) => (prev === match.player2?.id ? null : match.player2?.id ?? null)) : undefined}
                          className={`flex-1 min-w-0 text-right truncate py-2 -mx-1 px-1 rounded touch-manipulation active:scale-[0.99] ${filterByPlayerId === match.player2?.id ? "ring-2 ring-amber-400 bg-amber-100" : ""}`}
                          title={match.player2?.id ? t("seasonPlay.filterByTeamHint") : undefined}
                        >
                          {match.player2?.name || t("bracket.tbd")}
                        </button>
                      </div>
                      {match.score && (
                        <Link href={matchUrl} className="mt-2 block text-sm font-semibold text-ntu-green">
                          {(match as any).score}
                        </Link>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className={theme.tableHeader}>
                  <tr>
                    {hasGroups && <th className={theme.tableHeaderCell}>{t("seasonPlay.group")}</th>}
                    <th className={`${theme.tableHeaderCell} hidden`}>Match #</th>
                    <th className={theme.tableHeaderCell}>{t("seasonPlay.player1")}</th>
                    <th className={theme.tableHeaderCell}>{t("seasonPlay.vs")}</th>
                    <th className={theme.tableHeaderCell}>{t("seasonPlay.player2")}</th>
                    <th className={theme.tableHeaderCell}>{t("seasonPlay.dateTime")}</th>
                    <th className={theme.tableHeaderCell}>{t("seasonPlay.court")}</th>
                    <th className={theme.tableHeaderCell}>{t("seasonPlay.score")}</th>
                    <th className={theme.tableHeaderCell}>{t("seasonPlay.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRegularMatches.length === 0 ? (
                    <tr>
                      <td colSpan={hasGroups ? 9 : 8} className="px-4 py-8 text-center text-gray-500">
                        {dateFilter === "all" ? t("seasonPlay.noMatchesForGroup") : t("seasonPlay.noMatchesForGroup")}
                      </td>
                    </tr>
                  ) : (
                    displayRegularMatches.map((match, idx) => {
                      const matchData = match as any;
                      return (
                        <tr key={match.id} className={idx % 2 === 0 ? theme.tableRowEven : theme.tableRowOdd}>
                          {hasGroups && (
                            <td className="px-4 py-3 text-center">
                              <span className="inline-block px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded">
                                {t("seasonPlay.groupN").replace("{n}", String(matchData.group_number || '-'))}
                              </span>
                            </td>
                          )}
                          <td className="px-4 py-3 font-semibold text-gray-700 hidden">#{match.matchNumber}</td>
                          <td
                            className={`px-4 py-3 cursor-pointer rounded ${filterByPlayerId === match.player1?.id ? "ring-2 ring-amber-400 bg-amber-100" : ""} ${match.player1?.id ? "hover:bg-gray-50/80" : ""}`}
                            onClick={match.player1?.id ? () => setFilterByPlayerId((prev) => (prev === match.player1?.id ? null : match.player1?.id ?? null)) : undefined}
                            title={match.player1?.id ? t("seasonPlay.filterByTeamHint") : undefined}
                          >
                            {match.player1?.id ? (
                              <Link
                                href={`/sports/${sportName.toLowerCase()}/teams/${match.player1.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className={match.winner?.id === match.player1?.id ? "font-bold text-ntu-green hover:underline" : "hover:text-ntu-green hover:underline"}
                              >
                                {match.player1.name}
                                {match.player1.seed && <span className="ml-1 text-xs text-gray-500">({t("seasonPlay.seed").replace("{n}", String(match.player1.seed))})</span>}
                              </Link>
                            ) : (
                              <span>{t("bracket.tbd")}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Link
                              href={`/sports/${sportName.toLowerCase()}/matches/${match.id}`}
                              className="text-lg font-bold text-ntu-green hover:text-green-700 hover:underline cursor-pointer transition-colors"
                            >
                              {t("seasonPlay.vs")}
                            </Link>
                          </td>
                          <td
                            className={`px-4 py-3 cursor-pointer rounded ${filterByPlayerId === match.player2?.id ? "ring-2 ring-amber-400 bg-amber-100" : ""} ${match.player2?.id ? "hover:bg-gray-50/80" : ""}`}
                            onClick={match.player2?.id ? () => setFilterByPlayerId((prev) => (prev === match.player2?.id ? null : match.player2?.id ?? null)) : undefined}
                            title={match.player2?.id ? t("seasonPlay.filterByTeamHint") : undefined}
                          >
                            {match.player2?.id ? (
                              <Link
                                href={`/sports/${sportName.toLowerCase()}/teams/${match.player2.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className={match.winner?.id === match.player2?.id ? "font-bold text-ntu-green hover:underline" : "hover:text-ntu-green hover:underline"}
                              >
                                {match.player2.name}
                                {match.player2.seed && <span className="ml-1 text-xs text-gray-500">({t("seasonPlay.seed").replace("{n}", String(match.player2.seed))})</span>}
                              </Link>
                            ) : (
                              <span>{t("bracket.tbd")}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center text-sm">
                            <div className="font-medium text-gray-700">
                              {formatDateTime(matchData.scheduled_time)}
                            </div>
                            {matchData.slot_code && (
                              <div className="text-xs text-gray-500 mt-0.5">
                                {matchData.slot_code}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-gray-600">
                            {getCourtDisplay(matchData as any)}
                          </td>
                          <td className="px-4 py-3 text-center font-semibold">
                            {match.score || '-'}
                          </td>
                          <td className={theme.tableCell}>
                            {match.status === 'completed' && (
                              <span className={theme.badgeCompleted}>{t("sports.completed")}</span>
                            )}
                            {match.status === 'live' && (
                              <span className={theme.badgeLive}>{t("sports.live")}</span>
                            )}
                            {match.status === 'upcoming' && (
                              <span className={theme.badgeUpcoming}>{t("sports.upcoming")}</span>
                            )}
                            {match.status === 'delayed' && (
                              <span className={theme.badgeDelayed}>{t("sports.delayed")}</span>
                            )}
                            {match.status === 'forfeit' && (
                              <span className="inline-block px-2 py-1 text-xs font-semibold text-orange-800 bg-orange-100 rounded">{t("sports.forfeit")}</span>
                            )}
                            {match.status === 'walkover' && (
                              <span className="inline-block px-2 py-1 text-xs font-semibold text-purple-800 bg-purple-100 rounded">{t("sports.walkover")}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Standings View */}
      {view === "standings" && hasRegularSeason && (
        <div>
          {/* Mobile: group selector only */}
          {hasGroups && (
            <div className="flex items-center gap-2 mb-4 md:hidden">
              <label className="text-sm font-semibold text-blue-800">{t("seasonPlay.viewGroup")}</label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value === "all" ? "all" : parseInt(e.target.value))}
                className="px-3 py-1.5 border border-blue-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="all">{t("seasonPlay.allGroups")}</option>
                {allGroups.map(groupNum => (
                  <option key={groupNum} value={groupNum}>{t("seasonPlay.groupN").replace("{n}", String(groupNum))}</option>
                ))}
              </select>
            </div>
          )}
          {/* Desktop: full info box with "Standings: Based on..." */}
          <div className={`${theme.infoBox} hidden md:block`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p className={theme.infoBoxText}>
                <strong>{t("seasonPlay.standingsBased")}</strong>
              </p>
              {hasGroups && (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-blue-800">{t("seasonPlay.viewGroup")}</label>
                  <select
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value === "all" ? "all" : parseInt(e.target.value))}
                    className="px-3 py-1.5 border border-blue-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="all">{t("seasonPlay.allGroups")}</option>
                    {allGroups.map(groupNum => (
                      <option key={groupNum} value={groupNum}>{t("seasonPlay.groupN").replace("{n}", String(groupNum))}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {hasGroups && typeof standings === 'object' && !Array.isArray(standings) ? (
            // Display standings per group
            <div className="space-y-6">
              {selectedGroup === "all" ? (
                allGroups.map(groupNum => {
                  const groupStandings = standings[groupNum] || [];
                  return (
                    <div key={groupNum} className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                      <div className="bg-blue-600 text-white px-6 py-3">
                        <h3 className="text-lg font-semibold">{t("seasonPlay.groupNStandings").replace("{n}", String(groupNum))}</h3>
                      </div>
                      {/* Mobile: card per row with tier color */}
                      <div className="md:hidden divide-y divide-gray-100">
                        <div className="flex items-center gap-3 px-4 py-2 bg-gray-100 text-xs text-gray-500 font-medium">
                          <span className="w-8 text-center shrink-0">{t("seasonPlay.rank")}</span>
                          <div className="min-w-0 flex-1">{t("seasonPlay.player")}</div>
                          <div className="flex gap-x-2 shrink-0">
                            <span className="w-6 text-center">{t("seasonPlay.wins").charAt(0)}</span>
                            <span className="w-6 text-center">{t("seasonPlay.draws").charAt(0)}</span>
                            <span className="w-6 text-center">{t("seasonPlay.losses").charAt(0)}</span>
                            <span className="w-7 text-center">{t("seasonPlay.points")}</span>
                            <span className="w-8 text-center">{t("seasonPlay.gd")}</span>
                            <span className="w-8 text-center">{t("seasonPlay.yr")}</span>
                          </div>
                        </div>
                        {groupStandings.map((standing, idx) => {
                          const cardDisplay = standing.redCards > 0 ? `${standing.yellowCards}/${standing.redCards}` : standing.yellowCards > 0 ? `${standing.yellowCards}` : "-";
                          const rowClass = getQualifierRowClass(standing.player.id, groupNum, idx);
                          const lockedSeed = getLockedPlayoffSeed(standing.player.id, groupNum);
                          return (
                            <Link
                              key={standing.player.id}
                              href={`/sports/${sportName.toLowerCase()}/teams/${standing.player.id}`}
                              className={`flex items-center gap-3 px-4 py-3 ${rowClass}`}
                            >
                              <span className="w-8 text-center font-bold text-gray-700 shrink-0">{idx + 1}</span>
                              <div className="min-w-0 flex-1">
                                <span className="font-semibold text-gray-800 block truncate">
                                  {lockedSeed != null && <span className="text-yellow-500 mr-1">🏆</span>}
                                  {standing.player.name}
                                </span>
                                {standing.player.seed && <span className="text-xs text-gray-500">(Seed {standing.player.seed})</span>}
                              </div>
                              <div className="flex gap-x-2 text-sm shrink-0">
                                <span className="w-6 text-center text-green-600 font-semibold">{standing.wins}W</span>
                                <span className="w-6 text-center text-gray-600">{standing.draws || 0}D</span>
                                <span className="w-6 text-center text-red-600 font-semibold">{standing.losses}L</span>
                                <span className="w-7 text-center font-bold text-ntu-green">{standing.points}</span>
                                <span className="w-8 text-center text-gray-700">{standing.goalDiff}</span>
                                <span className="w-8 text-center text-gray-600">{cardDisplay}</span>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-4 py-3 text-center">{t("seasonPlay.rank")}</th>
                              <th className="px-4 py-3 text-left">{t("seasonPlay.player")}</th>
                              <th className="px-4 py-3 text-center">{t("seasonPlay.wins")}</th>
                              <th className="px-4 py-3 text-center">{t("seasonPlay.draws")}</th>
                              <th className="px-4 py-3 text-center">{t("seasonPlay.losses")}</th>
                              <th className="px-4 py-3 text-center">{t("seasonPlay.points")}</th>
                              <th className="px-4 py-3 text-center">{t("seasonPlay.gd")}</th>
                              <th className="px-4 py-3 text-center">{t("seasonPlay.yr")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {groupStandings.map((standing, idx) => {
                              const cardDisplay = standing.redCards > 0 
                                ? `${standing.yellowCards}/${standing.redCards}` 
                                : standing.yellowCards > 0 
                                  ? `${standing.yellowCards}` 
                                  : '-';
                              const lockedSeed = getLockedPlayoffSeed(standing.player.id, groupNum);
                              return (
                              <tr 
                                key={standing.player.id} 
                                className={getQualifierRowClass(standing.player.id, groupNum, idx)}
                              >
                                <td className="px-4 py-3 text-center font-bold text-gray-700">{idx + 1}</td>
                                <td className="px-4 py-3">
                                  <Link 
                                    href={`/sports/${sportName.toLowerCase()}/teams/${standing.player.id}`}
                                    className="flex items-center gap-2 hover:text-ntu-green hover:underline"
                                  >
                                    {lockedSeed != null && <span className="text-yellow-500">🏆</span>}
                                    <span className="font-semibold">{standing.player.name}</span>
                                    {standing.player.seed && (
                                      <span className="text-xs text-gray-500">(Seed {standing.player.seed})</span>
                                    )}
                                  </Link>
                                </td>
                                <td className="px-4 py-3 text-center font-semibold text-green-600">{standing.wins}</td>
                                <td className="px-4 py-3 text-center font-semibold text-gray-600">{standing.draws || 0}</td>
                                <td className="px-4 py-3 text-center font-semibold text-red-600">{standing.losses}</td>
                                <td className="px-4 py-3 text-center font-bold text-ntu-green">{standing.points}</td>
                                <td className="px-4 py-3 text-center font-semibold text-gray-700">{standing.goalDiff}</td>
                                <td className="px-4 py-3 text-center font-semibold text-gray-700">{cardDisplay}</td>
                              </tr>
                            )})}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })
              ) : (
                // Display selected group standings
                <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                  <div className="bg-blue-600 text-white px-6 py-3">
                    <h3 className="text-lg font-semibold">{t("seasonPlay.groupNStandings").replace("{n}", String(selectedGroup))}</h3>
                  </div>
                  {Array.isArray(standings) && (
                    <div className="md:hidden divide-y divide-gray-100">
                      <div className="flex items-center gap-3 px-4 py-2 bg-gray-100 text-xs text-gray-500 font-medium">
                        <span className="w-8 text-center shrink-0">{t("seasonPlay.rank")}</span>
                        <div className="min-w-0 flex-1">{t("seasonPlay.player")}</div>
                        <div className="flex gap-x-2 shrink-0">
                          <span className="w-6 text-center">{t("seasonPlay.wins").charAt(0)}</span>
                          <span className="w-6 text-center">{t("seasonPlay.draws").charAt(0)}</span>
                          <span className="w-6 text-center">{t("seasonPlay.losses").charAt(0)}</span>
                          <span className="w-7 text-center">{t("seasonPlay.points")}</span>
                          <span className="w-8 text-center">{t("seasonPlay.gd")}</span>
                          <span className="w-8 text-center">{t("seasonPlay.yr")}</span>
                        </div>
                      </div>
                      {standings.map((standing, idx) => {
                        const cardDisplay = standing.redCards > 0 ? `${standing.yellowCards}/${standing.redCards}` : standing.yellowCards > 0 ? `${standing.yellowCards}` : "-";
                        const groupNum = typeof selectedGroup === "number" ? selectedGroup : 1;
                        const rowClass = getQualifierRowClass(standing.player.id, groupNum, idx);
                        const lockedSeed = getLockedPlayoffSeed(standing.player.id, groupNum);
                        return (
                          <Link
                            key={standing.player.id}
                            href={`/sports/${sportName.toLowerCase()}/teams/${standing.player.id}`}
                            className={`flex items-center gap-3 px-4 py-3 ${rowClass}`}
                          >
                            <span className="w-8 text-center font-bold text-gray-700 shrink-0">{idx + 1}</span>
                            <div className="min-w-0 flex-1">
                              <span className="font-semibold text-gray-800 block truncate">
                                {lockedSeed != null && <span className="text-yellow-500 mr-1">🏆</span>}
                                {standing.player.name}
                              </span>
                              {standing.player.seed && <span className="text-xs text-gray-500">(Seed {standing.player.seed})</span>}
                            </div>
                            <div className="flex gap-x-2 text-sm shrink-0">
                              <span className="w-6 text-center text-green-600 font-semibold">{standing.wins}W</span>
                              <span className="w-6 text-center text-gray-600">{standing.draws || 0}D</span>
                              <span className="w-6 text-center text-red-600 font-semibold">{standing.losses}L</span>
                              <span className="w-7 text-center font-bold text-ntu-green">{standing.points}</span>
                              <span className="w-8 text-center text-gray-700">{standing.goalDiff}</span>
                              <span className="w-8 text-center text-gray-600">{cardDisplay}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-center">{t("seasonPlay.rank")}</th>
                          <th className="px-4 py-3 text-left">{t("seasonPlay.player")}</th>
                          <th className="px-4 py-3 text-center">{t("seasonPlay.wins")}</th>
                          <th className="px-4 py-3 text-center">{t("seasonPlay.draws")}</th>
                          <th className="px-4 py-3 text-center">{t("seasonPlay.losses")}</th>
                          <th className="px-4 py-3 text-center">{t("seasonPlay.points")}</th>
                          <th className="px-4 py-3 text-center">{t("seasonPlay.gd")}</th>
                          <th className="px-4 py-3 text-center">{t("seasonPlay.yr")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.isArray(standings) && standings.map((standing, idx) => {
                          const cardDisplay = standing.redCards > 0 
                            ? `${standing.yellowCards}/${standing.redCards}` 
                            : standing.yellowCards > 0 
                              ? `${standing.yellowCards}` 
                              : '-';
                          const groupNum = typeof selectedGroup === "number" ? selectedGroup : 1;
                          const lockedSeed = getLockedPlayoffSeed(standing.player.id, groupNum);
                          return (
                          <tr 
                            key={standing.player.id} 
                            className={getQualifierRowClass(standing.player.id, groupNum, idx)}
                          >
                            <td className="px-4 py-3 text-center font-bold text-gray-700">{idx + 1}</td>
                            <td className="px-4 py-3">
                              <Link 
                                href={`/sports/${sportName.toLowerCase()}/teams/${standing.player.id}`}
                                className="flex items-center gap-2 hover:text-ntu-green hover:underline"
                              >
                                {lockedSeed != null && <span className="text-yellow-500">🏆</span>}
                                <span className="font-semibold">{standing.player.name}</span>
                                {standing.player.seed && (
                                  <span className="text-xs text-gray-500">(Seed {standing.player.seed})</span>
                                )}
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-center font-semibold text-green-600">{standing.wins}</td>
                            <td className="px-4 py-3 text-center font-semibold text-gray-600">{standing.draws || 0}</td>
                            <td className="px-4 py-3 text-center font-semibold text-red-600">{standing.losses}</td>
                            <td className="px-4 py-3 text-center font-bold text-ntu-green">{standing.points}</td>
                            <td className="px-4 py-3 text-center font-semibold text-gray-700">{standing.goalDiff}</td>
                            <td className="px-4 py-3 text-center font-semibold text-gray-700">{cardDisplay}</td>
                          </tr>
                        )})}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Display overall standings (no groups or single group selected)
            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
              {Array.isArray(standings) && (
                <div className="md:hidden divide-y divide-gray-100">
                  <div className="flex items-center gap-3 px-4 py-2 bg-gray-100 text-xs text-gray-500 font-medium">
                    <span className="w-8 text-center shrink-0">{t("seasonPlay.rank")}</span>
                    <div className="min-w-0 flex-1">{t("seasonPlay.player")}</div>
                    <div className="flex gap-x-2 shrink-0">
                      <span className="w-6 text-center">{t("seasonPlay.wins").charAt(0)}</span>
                      <span className="w-6 text-center">{t("seasonPlay.draws").charAt(0)}</span>
                      <span className="w-6 text-center">{t("seasonPlay.losses").charAt(0)}</span>
                      <span className="w-7 text-center">{t("seasonPlay.points")}</span>
                      <span className="w-8 text-center">{t("seasonPlay.gd")}</span>
                      <span className="w-8 text-center">{t("seasonPlay.yr")}</span>
                    </div>
                  </div>
                  {standings.map((standing, idx) => {
                    const cardDisplay = standing.redCards > 0 ? `${standing.yellowCards}/${standing.redCards}` : standing.yellowCards > 0 ? `${standing.yellowCards}` : "-";
                    const groupNum = standing.group ?? 1;
                    const rowClass = getQualifierRowClass(standing.player.id, groupNum, idx);
                    const lockedSeed = getLockedPlayoffSeed(standing.player.id, groupNum);
                    return (
                      <Link
                        key={standing.player.id}
                        href={`/sports/${sportName.toLowerCase()}/teams/${standing.player.id}`}
                        className={`flex items-center gap-3 px-4 py-3 ${rowClass}`}
                      >
                        <span className="w-8 text-center font-bold text-gray-700 shrink-0">{idx + 1}</span>
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold text-gray-800 block truncate">
                            {lockedSeed != null && <span className="text-yellow-500 mr-1">🏆</span>}
                            {standing.player.name}
                          </span>
                          {standing.player.seed && <span className="text-xs text-gray-500">({t("seasonPlay.seed").replace("{n}", String(standing.player.seed))})</span>}
                        </div>
                        <div className="flex gap-x-2 text-sm shrink-0">
                          <span className="w-6 text-center text-green-600 font-semibold">{standing.wins}W</span>
                          <span className="w-6 text-center text-gray-600">{standing.draws || 0}D</span>
                          <span className="w-6 text-center text-red-600 font-semibold">{standing.losses}L</span>
                          <span className="w-7 text-center font-bold text-ntu-green">{standing.points}</span>
                          <span className="w-8 text-center text-gray-700">{standing.goalDiff}</span>
                          <span className="w-8 text-center text-gray-600">{cardDisplay}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-ntu-green text-white">
                    <tr>
                      <th className="px-4 py-3 text-center">#</th>
                      <th className="px-4 py-3 text-left">Player</th>
                      <th className="px-4 py-3 text-center">Wins</th>
                      <th className="px-4 py-3 text-center">Draws</th>
                      <th className="px-4 py-3 text-center">Losses</th>
                      <th className="px-4 py-3 text-center">Points</th>
                      <th className="px-4 py-3 text-center">GD</th>
                      <th className="px-4 py-3 text-center">Y/R</th>
                    </tr>
                  </thead>
                  <tbody>
                            {Array.isArray(standings) && standings.map((standing, idx) => {
                              const cardDisplay = standing.redCards > 0 
                                ? `${standing.yellowCards}/${standing.redCards}` 
                                : standing.yellowCards > 0 
                                  ? `${standing.yellowCards}` 
                                  : '-';
                              const groupNum = standing.group ?? 1;
                              const lockedSeed = getLockedPlayoffSeed(standing.player.id, groupNum);
                              return (
                      <tr 
                        key={standing.player.id} 
                                className={getQualifierRowClass(standing.player.id, groupNum, idx)}
                      >
                        <td className="px-4 py-3 text-center font-bold text-gray-700">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <Link 
                            href={`/sports/${sportName.toLowerCase()}/teams/${standing.player.id}`}
                            className="flex items-center gap-2 hover:text-ntu-green hover:underline"
                          >
                                    {lockedSeed != null && <span className="text-yellow-500">🏆</span>}
                            <span className="font-semibold">{standing.player.name}</span>
                            {standing.player.seed && (
                              <span className="text-xs text-gray-500">({t("seasonPlay.seed").replace("{n}", String(standing.player.seed))})</span>
                            )}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-green-600">{standing.wins}</td>
                        <td className="px-4 py-3 text-center font-semibold text-gray-600">{standing.draws || 0}</td>
                        <td className="px-4 py-3 text-center font-semibold text-red-600">{standing.losses}</td>
                        <td className="px-4 py-3 text-center font-bold text-ntu-green">{standing.points}</td>
                        <td className="px-4 py-3 text-center font-semibold text-gray-700">{standing.goalDiff}</td>
                        <td className="px-4 py-3 text-center font-semibold text-gray-700">{cardDisplay}</td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-4 text-sm text-gray-600 flex items-center gap-2 flex-wrap">
            {playoffWinsNeededTier.tierColors.length > 0 && (
              <>
                <span className="inline-block w-2 h-4 rounded-sm bg-amber-500" aria-hidden />
                {playoffWinsNeededTier.tierColors.length > 1 && <span className="inline-block w-2 h-4 rounded-sm bg-teal-500" aria-hidden />}
                {playoffWinsNeededTier.tierColors.length > 2 && <span className="inline-block w-2 h-4 rounded-sm bg-lime-500" aria-hidden />}
              </>
            )}
            <span>{t("seasonPlay.qualifyHint")}</span>
          </div>

          {/* Statistics Charts — goals & cards only for soccer/football */}
          {(showTopScorers && (topScorers.length > 0 || topYellowCards.length > 0 || topRedCards.length > 0)) && (
            <div className="mt-8">
              {/* Top Performers: Goals, Yellow Cards, Red Cards (soccer only) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {showTopScorers && allScorers.length > 0 ? (
                  <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-ntu-green">⚽ {t("seasonPlay.topScorers")}</h3>
                      {allScorers.length > 5 && (
                        <button
                          onClick={() => setExpandedScorers(!expandedScorers)}
                          className="text-sm text-ntu-green hover:text-green-700 font-medium underline"
                        >
                          {expandedScorers ? t("seasonPlay.collapse") : t("seasonPlay.viewAllCount").replace("{n}", String(allScorers.length))}
                        </button>
                      )}
                    </div>
                    <div className="space-y-3">
                      {(expandedScorers ? allScorers : top5Scorers).map((stat, idx) => {
                        const maxGoals = allScorers[0].goalsFor;
                        const percentage = maxGoals > 0 ? (stat.goalsFor / maxGoals) * 100 : 0;
                        let displayName = stat.name;
                        if (registrationType === 'team' && 'teamName' in stat && stat.teamName) {
                          const jerseyPart = 'jerseyNumber' in stat && stat.jerseyNumber !== null && stat.jerseyNumber !== undefined 
                            ? ` #${stat.jerseyNumber}` 
                            : '';
                          displayName = `${stat.name}${jerseyPart} (${stat.teamName})`;
                        }
                        return (
                          <div key={stat.id}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium text-gray-700">
                                {idx + 1}. {displayName}
                              </span>
                              <span className="text-sm font-bold text-ntu-green">{stat.goalsFor} {t("seasonPlay.goalsUnit")}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div
                                className="bg-ntu-green h-3 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                    <h3 className="text-lg font-semibold text-ntu-green mb-4">⚽ {t("seasonPlay.topScorers")}</h3>
                    <p className="text-sm text-gray-500">{t("seasonPlay.noData")}</p>
                  </div>
                )}

                {/* Top Yellow Cards Chart (soccer only) */}
                {showTopScorers && (allYellowCards.length > 0 ? (
                  <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-yellow-600">🟨 {t("seasonPlay.yellowCards")}</h3>
                      {allYellowCards.length > 5 && (
                        <button
                          onClick={() => setExpandedYellowCards(!expandedYellowCards)}
                          className="text-sm text-yellow-600 hover:text-yellow-700 font-medium underline"
                        >
                          {expandedYellowCards ? t("seasonPlay.collapse") : t("seasonPlay.viewAllCount").replace("{n}", String(allYellowCards.length))}
                        </button>
                      )}
                    </div>
                    <div className="space-y-3">
                      {(expandedYellowCards ? allYellowCards : top5YellowCards).map((stat, idx) => {
                        const maxCards = allYellowCards[0].count;
                        const percentage = maxCards > 0 ? (stat.count / maxCards) * 100 : 0;
                        let displayName = stat.name;
                        if (registrationType === 'team' && stat.teamName) {
                          const jerseyPart = stat.jerseyNumber !== null && stat.jerseyNumber !== undefined 
                            ? ` #${stat.jerseyNumber}` 
                            : '';
                          displayName = `${stat.name}${jerseyPart} (${stat.teamName})`;
                        }
                        return (
                          <div key={stat.id}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium text-gray-700">
                                {idx + 1}. {displayName}
                              </span>
                              <span className="text-sm font-bold text-yellow-600">{stat.count} {t("seasonPlay.cardsUnit")}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div
                                className="bg-yellow-500 h-3 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                    <h3 className="text-lg font-semibold text-yellow-600 mb-4">🟨 {t("seasonPlay.yellowCards")}</h3>
                    <p className="text-sm text-gray-500">{t("seasonPlay.noData")}</p>
                  </div>
                ))}

                {/* Top Red Cards Chart (soccer only) */}
                {showTopScorers && (allRedCards.length > 0 ? (
                  <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-red-600">🟥 {t("seasonPlay.redCards")}</h3>
                      {allRedCards.length > 5 && (
                        <button
                          onClick={() => setExpandedRedCards(!expandedRedCards)}
                          className="text-sm text-red-600 hover:text-red-700 font-medium underline"
                        >
                          {expandedRedCards ? t("seasonPlay.collapse") : t("seasonPlay.viewAllCount").replace("{n}", String(allRedCards.length))}
                        </button>
                      )}
                    </div>
                    <div className="space-y-3">
                      {(expandedRedCards ? allRedCards : top5RedCards).map((stat, idx) => {
                        const maxCards = allRedCards[0].count;
                        const percentage = maxCards > 0 ? (stat.count / maxCards) * 100 : 0;
                        let displayName = stat.name;
                        if (registrationType === 'team' && stat.teamName) {
                          const jerseyPart = stat.jerseyNumber !== null && stat.jerseyNumber !== undefined 
                            ? ` #${stat.jerseyNumber}` 
                            : '';
                          displayName = `${stat.name}${jerseyPart} (${stat.teamName})`;
                        }
                        return (
                          <div key={stat.id}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium text-gray-700">
                                {idx + 1}. {displayName}
                              </span>
                              <span className="text-sm font-bold text-red-600">{stat.count} {t("seasonPlay.cardsUnit")}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div
                                className="bg-red-500 h-3 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                    <h3 className="text-lg font-semibold text-red-600 mb-4">🟥 {t("seasonPlay.redCards")}</h3>
                    <p className="text-sm text-gray-500">{t("seasonPlay.noData")}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
            <p className="font-semibold text-gray-800 mb-1">{locale === "zh" ? "排名規則（同分時依序比較）" : "Ranking rules (tiebreakers in order)"}</p>
            <ul className="list-none space-y-0.5">
              {tiebreakerRulesLines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Playoffs View - Schedule list (Games page) */}
      {view === "playoffs" && hasPlayoffs && playoffsDisplayMode === "schedule" && (
        <div>
          {filterByPlayerId && (
            <div className="mb-4">
              <button
                type="button"
                onClick={() => setFilterByPlayerId(null)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200"
                title={t("seasonPlay.filterShowAll")}
              >
                ✕ {t("seasonPlay.filterShowingOnly").replace("{name}", players.find((p) => p.id === filterByPlayerId)?.name ?? "?")}
              </button>
            </div>
          )}
          <div className={theme.tableWrapper}>
            <div className="md:hidden space-y-3">
              {displayPlayoffScheduleMatches.length === 0 ? (
                <p className="px-4 py-8 text-center text-gray-500">{t("seasonPlay.noMatchesYet")}</p>
              ) : (
                displayPlayoffScheduleMatches.map((match) => {
                  const matchData = match as any;
                  const matchUrl = `/sports/${sportName.toLowerCase()}/matches/${match.id}`;
                  const count = playoffRoundTotalCount.get(Number(match.round)) ?? 0;
                  const isLastRound = Number(match.round) === maxPlayoffRound;
                  const matchNum = Number((match as any).matchNumber) ?? 0;
                  const roundLabel = isLastRound && count === 2
                    ? (matchNum === 2 ? t("bracket.final") : t("bracket.thirdPlace"))
                    : count === 4 ? t("bracket.quarterfinals") : count === 2 ? t("bracket.semifinals") : count === 1 ? t("bracket.final") : t("bracket.roundOf").replace("{n}", String(count * 2));
                  return (
                    <div
                      key={match.id}
                      className={`block rounded-xl border border-gray-200 p-4 shadow-sm hover:border-ntu-green hover:shadow-md transition-all duration-200 hover:scale-[1.02] ${match.status === "live" ? "bg-red-100 animate-pulse" : "bg-white"}`}
                    >
                      <div className="mb-2">
                        <span className="inline-block px-2 py-1 text-xs font-semibold bg-amber-100 text-amber-800 rounded">
                          {roundLabel}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-600">{formatDateTime(matchData.scheduled_time)}</span>
                        {match.status === "completed" && <span className={theme.badgeCompleted}>{t("sports.completed")}</span>}
                        {match.status === "live" && <span className={theme.badgeLive}>{t("sports.live")}</span>}
                        {match.status === "upcoming" && <span className={theme.badgeUpcoming}>{t("sports.upcoming")}</span>}
                        {match.status === "delayed" && <span className={theme.badgeDelayed}>{t("sports.delayed")}</span>}
                        {match.status === "forfeit" && <span className="inline-block px-2 py-1 text-xs font-semibold text-orange-800 bg-orange-100 rounded">{t("sports.forfeit")}</span>}
                        {match.status === "walkover" && <span className="inline-block px-2 py-1 text-xs font-semibold text-purple-800 bg-purple-100 rounded">{t("sports.walkover")}</span>}
                      </div>
                      <div className="text-sm text-gray-600 mb-1">{getCourtDisplay(matchData as any)}</div>
                      <div className="flex items-center justify-between gap-2 text-base font-semibold text-gray-800">
                        <button
                          type="button"
                          onClick={match.player1?.id ? () => setFilterByPlayerId((prev) => (prev === match.player1?.id ? null : match.player1?.id ?? null)) : undefined}
                          className={`flex-1 min-w-0 text-left truncate py-2 -mx-1 px-1 rounded touch-manipulation active:scale-[0.99] ${filterByPlayerId === match.player1?.id ? "ring-2 ring-amber-400 bg-amber-100" : ""}`}
                          title={match.player1?.id ? t("seasonPlay.filterByTeamHint") : undefined}
                        >
                          {match.player1?.name || t("bracket.tbd")}
                        </button>
                        <Link href={matchUrl} className="shrink-0 text-ntu-green font-bold px-2 py-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
                          VS
                        </Link>
                        <button
                          type="button"
                          onClick={match.player2?.id ? () => setFilterByPlayerId((prev) => (prev === match.player2?.id ? null : match.player2?.id ?? null)) : undefined}
                          className={`flex-1 min-w-0 text-right truncate py-2 -mx-1 px-1 rounded touch-manipulation active:scale-[0.99] ${filterByPlayerId === match.player2?.id ? "ring-2 ring-amber-400 bg-amber-100" : ""}`}
                          title={match.player2?.id ? t("seasonPlay.filterByTeamHint") : undefined}
                        >
                          {match.player2?.name || t("bracket.tbd")}
                        </button>
                      </div>
                      {match.score && (
                        <Link href={matchUrl} className="mt-2 block text-sm font-semibold text-ntu-green">
                          {(match as any).score}
                        </Link>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className={theme.tableHeader}>
                  <tr>
                    <th className={theme.tableHeaderCell}>{t("schedule.roundLabel")}</th>
                    <th className={`${theme.tableHeaderCell} hidden`}>Match #</th>
                    <th className={theme.tableHeaderCell}>{t("seasonPlay.player1")}</th>
                    <th className={theme.tableHeaderCell}>{t("seasonPlay.vs")}</th>
                    <th className={theme.tableHeaderCell}>{t("seasonPlay.player2")}</th>
                    <th className={theme.tableHeaderCell}>{t("seasonPlay.dateTime")}</th>
                    <th className={theme.tableHeaderCell}>{t("seasonPlay.court")}</th>
                    <th className={theme.tableHeaderCell}>{t("seasonPlay.score")}</th>
                    <th className={theme.tableHeaderCell}>{t("seasonPlay.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {displayPlayoffScheduleMatches.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-gray-500">{t("seasonPlay.noMatchesYet")}</td>
                    </tr>
                  ) : (
                    displayPlayoffScheduleMatches.map((match, idx) => {
                      const matchData = match as any;
                      const count = playoffRoundTotalCount.get(Number(match.round)) ?? 0;
                      const isLastRound = Number(match.round) === maxPlayoffRound;
                      const matchNum = Number((match as any).matchNumber) ?? 0;
                      const roundLabel = isLastRound && count === 2
                        ? (matchNum === 2 ? t("bracket.final") : t("bracket.thirdPlace"))
                        : count === 4 ? t("bracket.quarterfinals") : count === 2 ? t("bracket.semifinals") : count === 1 ? t("bracket.final") : t("bracket.roundOf").replace("{n}", String(count * 2));
                      return (
                        <tr key={match.id} className={idx % 2 === 0 ? theme.tableRowEven : theme.tableRowOdd}>
                          <td className="px-4 py-3">
                            <span className="inline-block px-2 py-1 text-xs font-semibold bg-amber-100 text-amber-800 rounded">
                              {roundLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-700 hidden">#{match.matchNumber}</td>
                          <td
                            className={`px-4 py-3 cursor-pointer rounded ${filterByPlayerId === match.player1?.id ? "ring-2 ring-amber-400 bg-amber-100" : ""} ${match.player1?.id ? "hover:bg-gray-50/80" : ""}`}
                            onClick={match.player1?.id ? () => setFilterByPlayerId((prev) => (prev === match.player1?.id ? null : match.player1?.id ?? null)) : undefined}
                            title={match.player1?.id ? t("seasonPlay.filterByTeamHint") : undefined}
                          >
                            {match.player1?.id ? (
                              <Link href={`/sports/${sportName.toLowerCase()}/teams/${match.player1.id}`} onClick={(e) => e.stopPropagation()} className="hover:text-ntu-green hover:underline">
                                {match.player1.name}
                              </Link>
                            ) : (
                              <Link href={`/sports/${sportName.toLowerCase()}/matches/${match.id}`} onClick={(e) => e.stopPropagation()} className="hover:text-ntu-green hover:underline">
                                {t("bracket.tbd")}
                              </Link>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Link href={`/sports/${sportName.toLowerCase()}/matches/${match.id}`} className="text-lg font-bold text-ntu-green hover:text-green-700 hover:underline">
                              {t("seasonPlay.vs")}
                            </Link>
                          </td>
                          <td
                            className={`px-4 py-3 cursor-pointer rounded ${filterByPlayerId === match.player2?.id ? "ring-2 ring-amber-400 bg-amber-100" : ""} ${match.player2?.id ? "hover:bg-gray-50/80" : ""}`}
                            onClick={match.player2?.id ? () => setFilterByPlayerId((prev) => (prev === match.player2?.id ? null : match.player2?.id ?? null)) : undefined}
                            title={match.player2?.id ? t("seasonPlay.filterByTeamHint") : undefined}
                          >
                            {match.player2?.id ? (
                              <Link href={`/sports/${sportName.toLowerCase()}/teams/${match.player2.id}`} onClick={(e) => e.stopPropagation()} className="hover:text-ntu-green hover:underline">
                                {match.player2.name}
                              </Link>
                            ) : (
                              <Link href={`/sports/${sportName.toLowerCase()}/matches/${match.id}`} onClick={(e) => e.stopPropagation()} className="hover:text-ntu-green hover:underline">
                                {t("bracket.tbd")}
                              </Link>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                            {formatDateTime(matchData.scheduled_time)}
                            {matchData.slot_code && <div className="text-xs text-gray-500 mt-0.5">{matchData.slot_code}</div>}
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-gray-600">{getCourtDisplay(matchData as any)}</td>
                          <td className="px-4 py-3 text-center font-semibold">{match.score || "-"}</td>
                          <td className={theme.tableCell}>
                            {match.status === "completed" && <span className={theme.badgeCompleted}>{t("sports.completed")}</span>}
                            {match.status === "live" && <span className={theme.badgeLive}>{t("sports.live")}</span>}
                            {match.status === "upcoming" && <span className={theme.badgeUpcoming}>{t("sports.upcoming")}</span>}
                            {match.status === "delayed" && <span className={theme.badgeDelayed}>{t("sports.delayed")}</span>}
                            {match.status === "forfeit" && <span className="inline-block px-2 py-1 text-xs font-semibold text-orange-800 bg-orange-100 rounded">{t("sports.forfeit")}</span>}
                            {match.status === "walkover" && <span className="inline-block px-2 py-1 text-xs font-semibold text-purple-800 bg-purple-100 rounded">{t("sports.walkover")}</span>}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Playoffs View - Bracket (Draw page) */}
      {view === "playoffs" && hasPlayoffs && playoffsDisplayMode !== "schedule" && (
        <div>
          {/* Desktop only: playoff bracket hint */}
          <div className="hidden md:block bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>{t("seasonPlay.playoffBracketHint")}</strong>
            </p>
          </div>

          <BracketPlayerSearch
            matches={resolvedPlayoffMatches}
            players={players}
            teamMembers={teamMembers?.reduce<Record<string, Array<{ name?: string }>>>((acc, m) => {
              const pid = m.player_id;
              if (!acc[pid]) acc[pid] = [];
              acc[pid].push({ name: m.name });
              return acc;
            }, {})}
            onScrollToMatch={(matchId) => {
              document.getElementById(`match-${matchId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
          />

          <TournamentBracket
            matches={resolvedPlayoffMatches}
            players={players}
            sportName={sportName}
          />
        </div>
      )}

      {/* No Content Messages */}
      {!hasRegularSeason && !hasPlayoffs && (
        <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-100">
          <p className="text-gray-600 text-lg">{t("seasonPlay.noMatchesYet")}</p>
        </div>
      )}
    </div>
  );
}

