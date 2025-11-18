"use client";

import { Match, Player } from "@/types/tournament";
import { useState, useMemo } from "react";
import TournamentBracket from "./TournamentBracket";

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
}

const TAIPEI_TZ = "Asia/Taipei";

export default function SeasonPlayDisplay({ matches, players, sportName = "Tennis", visibleTabs, defaultView, qualifiersPerGroup: qualifiersFromProps }: SeasonPlayDisplayProps) {
  const tabs = {
    regular: visibleTabs?.regular !== false,
    standings: visibleTabs?.standings !== false,
    playoffs: visibleTabs?.playoffs !== false,
  };
  const initialView: "regular" | "playoffs" | "standings" =
    defaultView && tabs[defaultView] ? defaultView : (tabs.regular ? "regular" : tabs.standings ? "standings" : "playoffs");
  const [view, setView] = useState<"regular" | "playoffs" | "standings">(initialView);
  const [selectedGroup, setSelectedGroup] = useState<number | "all">("all");

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
    
    // Sort: non‑delayed first, then scheduled by time, then unscheduled, fallback by matchNumber
    return filtered.sort((a, b) => {
      const aDelayed = a.status === "delayed" ? 1 : 0;
      const bDelayed = b.status === "delayed" ? 1 : 0;
      if (aDelayed !== bDelayed) return aDelayed - bDelayed; // push delayed to bottom
      const aHasTime = Boolean((a as any).scheduled_time);
      const bHasTime = Boolean((b as any).scheduled_time);
      if (aHasTime !== bHasTime) return aHasTime ? -1 : 1; // scheduled first
      if (aHasTime && bHasTime) {
        const ta = new Date((a as any).scheduled_time).getTime();
        const tb = new Date((b as any).scheduled_time).getTime();
        if (ta !== tb) return ta - tb;
      }
      return a.matchNumber - b.matchNumber;
    });
  }, [matches, selectedGroup]);

  const playoffMatches = matches.filter(m => m.round >= 1);
  
  const hasRegularSeason = matches.filter(m => m.round === 0).length > 0;
  const hasPlayoffs = playoffMatches.length > 0;

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

  // Format date/time for display
  const formatDateTime = (dateTimeStr: string | null | undefined): string => {
    if (!dateTimeStr) return "TBD";
    try {
      const date = new Date(dateTimeStr);
      return new Intl.DateTimeFormat("zh-TW", {
        month: "short",
        day: "numeric",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: TAIPEI_TZ,
      }).format(date);
    } catch {
      return "TBD";
    }
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
    group?: number;
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
            
            // Check for draw (equal scores)
            if (sc.a === sc.b) {
              p1.draws += 1; p1.points += 1;
              p2.draws += 1; p2.points += 1;
            } else if (m.winner) {
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

      const rows: Array<StandingRow> = Object.values(table).map((r: any) => ({
        ...r,
        goalDiff: (r.goalsFor || 0) - (r.goalsAgainst || 0),
      }));

      return rows.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
        return (b.goalsFor || 0) - (a.goalsFor || 0);
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
        (table as any)[playerId] = { player, wins: 0, losses: 0, draws: 0, points: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, group: groupNum };
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
          
          // Check for draw (equal scores)
          if (sc.a === sc.b) {
            p1.draws += 1; p1.points += 1;
            p2.draws += 1; p2.points += 1;
          } else if (m.winner) {
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

    const rows: Array<StandingRow> = Object.values(table).map((r: any) => ({
      player: r.player,
      wins: r.wins || 0,
      losses: r.losses || 0,
      draws: r.draws || 0,
      points: r.points || 0,
      goalsFor: r.goalsFor || 0,
      goalsAgainst: r.goalsAgainst || 0,
      goalDiff: (r.goalsFor || 0) - (r.goalsAgainst || 0),
      group: r.group,
    }));

    return rows.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
      return (b.goalsFor || 0) - (a.goalsFor || 0);
    });
  };

  const standings = calculateStandings();

  // Count completed matches
  const completedRegularMatches = regularSeasonMatches.filter(m => m.status === 'completed').length;
  const totalRegularMatches = regularSeasonMatches.length;

  return (
    <div>
      {/* View Tabs */}
      <div className="mb-6 bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="flex overflow-x-auto">
          {hasRegularSeason && tabs.regular && (
            <button
              onClick={() => setView("regular")}
              className={`flex-1 min-w-[140px] px-6 py-4 font-semibold transition-colors border-b-4 ${
                view === "regular"
                  ? "bg-ntu-green text-white border-ntu-green"
                  : "bg-white text-gray-700 hover:bg-gray-50 border-transparent"
              }`}
            >
              🏀 Regular Season
            </button>
          )}
          {hasRegularSeason && tabs.standings && (
            <button
              onClick={() => setView("standings")}
              className={`flex-1 min-w-[140px] px-6 py-4 font-semibold transition-colors border-b-4 ${
                view === "standings"
                  ? "bg-ntu-green text-white border-ntu-green"
                  : "bg-white text-gray-700 hover:bg-gray-50 border-transparent"
              }`}
            >
              📊 Standings
            </button>
          )}
          {hasPlayoffs && tabs.playoffs && (
            <button
              onClick={() => setView("playoffs")}
              className={`flex-1 min-w-[140px] px-6 py-4 font-semibold transition-colors border-b-4 ${
                view === "playoffs"
                  ? "bg-ntu-green text-white border-ntu-green"
                  : "bg-white text-gray-700 hover:bg-gray-50 border-transparent"
              }`}
            >
              🏆 Playoffs
            </button>
          )}
        </div>
      </div>

      {/* Regular Season View */}
      {view === "regular" && hasRegularSeason && (
        <div>
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded-lg">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p className="text-sm text-blue-800">
                <strong>Regular Season Progress:</strong> {completedRegularMatches} / {totalRegularMatches} matches completed
              </p>
              {hasGroups && (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-blue-800">Filter by Group:</label>
                  <select
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value === "all" ? "all" : parseInt(e.target.value))}
                    className="px-3 py-1.5 border border-blue-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="all">All Groups</option>
                    {allGroups.map(groupNum => (
                      <option key={groupNum} value={groupNum}>Group {groupNum}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-ntu-green text-white">
                  <tr>
                    {hasGroups && <th className="px-4 py-3 text-center">Group</th>}
                    <th className="px-4 py-3 text-left hidden">Match #</th>
                    <th className="px-4 py-3 text-left">Player 1</th>
                    <th className="px-4 py-3 text-center">VS</th>
                    <th className="px-4 py-3 text-left">Player 2</th>
                    <th className="px-4 py-3 text-center">Date & Time</th>
                    <th className="px-4 py-3 text-center">Court</th>
                    <th className="px-4 py-3 text-center">Score</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {regularSeasonMatches.length === 0 ? (
                    <tr>
                      <td colSpan={hasGroups ? 9 : 8} className="px-4 py-8 text-center text-gray-500">
                        No matches found for the selected group.
                      </td>
                    </tr>
                  ) : (
                    regularSeasonMatches.map((match, idx) => {
                      const matchData = match as any;
                      return (
                        <tr key={match.id} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                          {hasGroups && (
                            <td className="px-4 py-3 text-center">
                              <span className="inline-block px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded">
                                Group {matchData.group_number || '-'}
                              </span>
                            </td>
                          )}
                          <td className="px-4 py-3 font-semibold text-gray-700 hidden">#{match.matchNumber}</td>
                          <td className="px-4 py-3">
                            <div className={match.winner?.id === match.player1?.id ? 'font-bold text-ntu-green' : ''}>
                              {match.player1?.name || 'TBD'}
                              {match.player1?.seed && <span className="ml-1 text-xs text-gray-500">(Seed {match.player1.seed})</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center text-gray-400">vs</td>
                          <td className="px-4 py-3">
                            <div className={match.winner?.id === match.player2?.id ? 'font-bold text-ntu-green' : ''}>
                              {match.player2?.name || 'TBD'}
                              {match.player2?.seed && <span className="ml-1 text-xs text-gray-500">(Seed {match.player2.seed})</span>}
                            </div>
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
                            {matchData.court_name || '-'}
                          </td>
                          <td className="px-4 py-3 text-center font-semibold">
                            {match.score || '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {match.status === 'completed' && (
                              <span className="inline-block px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded">
                                Completed
                              </span>
                            )}
                            {match.status === 'live' && (
                              <span className="inline-block px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded animate-pulse">
                                Live
                              </span>
                            )}
                            {match.status === 'upcoming' && (
                              <span className="inline-block px-2 py-1 text-xs font-semibold text-gray-600 bg-gray-100 rounded">
                                Upcoming
                              </span>
                            )}
                            {match.status === 'delayed' && (
                              <span className="inline-block px-2 py-1 text-xs font-semibold text-amber-700 bg-amber-100 rounded">
                                Delayed
                              </span>
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
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded-lg">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p className="text-sm text-blue-800">
                <strong>Standings:</strong> Based on regular season results (3 points per win)
              </p>
              {hasGroups && (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-blue-800">View Group:</label>
                  <select
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value === "all" ? "all" : parseInt(e.target.value))}
                    className="px-3 py-1.5 border border-blue-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="all">All Groups</option>
                    {allGroups.map(groupNum => (
                      <option key={groupNum} value={groupNum}>Group {groupNum}</option>
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
                        <h3 className="text-lg font-semibold">Group {groupNum} Standings</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-4 py-3 text-center">#</th>
                              <th className="px-4 py-3 text-left">Player</th>
                              <th className="px-4 py-3 text-center">Wins</th>
                              <th className="px-4 py-3 text-center">Draws</th>
                              <th className="px-4 py-3 text-center">Losses</th>
                              <th className="px-4 py-3 text-center">Points</th>
                              <th className="px-4 py-3 text-center">GD</th>
                            </tr>
                          </thead>
                          <tbody>
                            {groupStandings.map((standing, idx) => (
                              <tr 
                                key={standing.player.id} 
                                className={`${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'} ${idx < qualifiersPerGroup ? 'border-l-4 border-yellow-400' : ''}`}
                              >
                                <td className="px-4 py-3 text-center font-bold text-gray-700">{idx + 1}</td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    {idx < qualifiersPerGroup && <span className="text-yellow-500">🏆</span>}
                                    <span className="font-semibold">{standing.player.name}</span>
                                    {standing.player.seed && (
                                      <span className="text-xs text-gray-500">(Seed {standing.player.seed})</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-center font-semibold text-green-600">{standing.wins}</td>
                                <td className="px-4 py-3 text-center font-semibold text-gray-600">{standing.draws || 0}</td>
                                <td className="px-4 py-3 text-center font-semibold text-red-600">{standing.losses}</td>
                                <td className="px-4 py-3 text-center font-bold text-ntu-green">{standing.points}</td>
                                <td className="px-4 py-3 text-center font-semibold text-gray-700">{standing.goalDiff}</td>
                              </tr>
                            ))}
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
                    <h3 className="text-lg font-semibold">Group {selectedGroup} Standings</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-center">#</th>
                          <th className="px-4 py-3 text-left">Player</th>
                          <th className="px-4 py-3 text-center">Wins</th>
                          <th className="px-4 py-3 text-center">Losses</th>
                          <th className="px-4 py-3 text-center">Points</th>
                          <th className="px-4 py-3 text-center">GD</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.isArray(standings) && standings.map((standing, idx) => (
                          <tr 
                            key={standing.player.id} 
                            className={`${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'} ${idx < qualifiersPerGroup ? 'border-l-4 border-yellow-400' : ''}`}
                          >
                            <td className="px-4 py-3 text-center font-bold text-gray-700">{idx + 1}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {idx < qualifiersPerGroup && <span className="text-yellow-500">🏆</span>}
                                <span className="font-semibold">{standing.player.name}</span>
                                {standing.player.seed && (
                                  <span className="text-xs text-gray-500">(Seed {standing.player.seed})</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center font-semibold text-green-600">{standing.wins}</td>
                            <td className="px-4 py-3 text-center font-semibold text-red-600">{standing.losses}</td>
                            <td className="px-4 py-3 text-center font-bold text-ntu-green">{standing.points}</td>
                            <td className="px-4 py-3 text-center font-semibold text-gray-700">{standing.goalDiff}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Display overall standings (no groups or single group selected)
            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-ntu-green text-white">
                    <tr>
                      <th className="px-4 py-3 text-center">#</th>
                      <th className="px-4 py-3 text-left">Player</th>
                      <th className="px-4 py-3 text-center">Wins</th>
                      <th className="px-4 py-3 text-center">Losses</th>
                      <th className="px-4 py-3 text-center">Points</th>
                      <th className="px-4 py-3 text-center">GD</th>
                    </tr>
                  </thead>
                  <tbody>
                            {Array.isArray(standings) && standings.map((standing, idx) => (
                      <tr 
                        key={standing.player.id} 
                                className={`${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'} ${idx < qualifiersPerGroup ? 'border-l-4 border-yellow-400' : ''}`}
                      >
                        <td className="px-4 py-3 text-center font-bold text-gray-700">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                                    {idx < qualifiersPerGroup && <span className="text-yellow-500">🏆</span>}
                            <span className="font-semibold">{standing.player.name}</span>
                            {standing.player.seed && (
                              <span className="text-xs text-gray-500">(Seed {standing.player.seed})</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-green-600">{standing.wins}</td>
                        <td className="px-4 py-3 text-center font-semibold text-red-600">{standing.losses}</td>
                        <td className="px-4 py-3 text-center font-bold text-ntu-green">{standing.points}</td>
                        <td className="px-4 py-3 text-center font-semibold text-gray-700">{standing.goalDiff}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-4 text-sm text-gray-600 flex items-center gap-2">
            <span className="inline-block w-1 h-8 bg-yellow-400"></span>
            <span>Players with yellow border qualify for playoffs</span>
          </div>
        </div>
      )}

      {/* Playoffs View */}
      {view === "playoffs" && hasPlayoffs && (
        <div>
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Playoff Bracket:</strong> Single elimination - top teams from regular season
            </p>
          </div>

          <TournamentBracket
            matches={playoffMatches}
            players={players}
            sportName={sportName}
          />
        </div>
      )}

      {/* No Content Messages */}
      {!hasRegularSeason && !hasPlayoffs && (
        <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-100">
          <p className="text-gray-600 text-lg">No matches generated yet. Please use the admin panel to generate regular season matches.</p>
        </div>
      )}
    </div>
  );
}

