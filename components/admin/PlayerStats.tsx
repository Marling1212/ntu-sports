"use client";

import { useMemo } from "react";
import { Player, Match } from "@/types/database";

interface PlayerStatsProps {
  players: Player[];
  matches: Match[];
  tournamentType?: "single_elimination" | "season_play" | null;
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
}

interface PlayerStat {
  player: Player;
  wins: number;
  losses: number;
  draws: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  winRate: number;
  matchesPlayed: number;
  yellowCards: number;
  redCards: number;
  fairPlayPoints: number; // Negative value: more negative = worse (more cards)
}

const parseScore = (score?: string): { score1: number; score2: number } | null => {
  if (!score) return null;
  const match = score.match(/(\d+)\s*[-:]\s*(\d+)/);
  if (!match) return null;
  const score1 = parseInt(match[1], 10);
  const score2 = parseInt(match[2], 10);
  if (Number.isNaN(score1) || Number.isNaN(score2)) return null;
  return { score1, score2 };
};

export default function PlayerStats({ players, matches, tournamentType, registrationType = 'player', matchPlayerStats = [], teamMembers = [] }: PlayerStatsProps) {
  const playerStats = useMemo(() => {
    const statsMap = new Map<string, PlayerStat>();

    // Initialize all players
    players.forEach(player => {
      statsMap.set(player.id, {
        player,
        wins: 0,
        losses: 0,
        draws: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDiff: 0,
        points: 0,
        winRate: 0,
        matchesPlayed: 0,
        yellowCards: 0,
        redCards: 0,
        fairPlayPoints: 0,
      });
    });

    // Process matches
    matches.forEach(match => {
      if (match.status !== "completed" || !match.winner_id) return;

      const player1Id = match.player1_id;
      const player2Id = match.player2_id;
      const winnerId = match.winner_id;
      const score = parseScore(match.score1 && match.score2 ? `${match.score1}-${match.score2}` : undefined);

      if (!player1Id || !player2Id) return;

      const stat1 = statsMap.get(player1Id);
      const stat2 = statsMap.get(player2Id);

      if (!stat1 || !stat2) return;

      // Update matches played
      stat1.matchesPlayed++;
      stat2.matchesPlayed++;

      if (score) {
        // Update goals
        stat1.goalsFor += score.score1;
        stat1.goalsAgainst += score.score2;
        stat2.goalsFor += score.score2;
        stat2.goalsAgainst += score.score1;

        // Update win/loss/draw
        if (score.score1 > score.score2) {
          stat1.wins++;
          stat1.points += 3;
          stat2.losses++;
        } else if (score.score1 < score.score2) {
          stat2.wins++;
          stat2.points += 3;
          stat1.losses++;
        } else {
          stat1.draws++;
          stat2.draws++;
          stat1.points += 1;
          stat2.points += 1;
        }
      } else {
        // No score, just winner/loser
        if (winnerId === player1Id) {
          stat1.wins++;
          stat1.points += 3;
          stat2.losses++;
        } else {
          stat2.wins++;
          stat2.points += 3;
          stat1.losses++;
        }
      }
    });

    // Calculate goal difference and win rate
    statsMap.forEach(stat => {
      stat.goalDiff = stat.goalsFor - stat.goalsAgainst;
      stat.winRate = stat.matchesPlayed > 0 
        ? Math.round((stat.wins / stat.matchesPlayed) * 100) 
        : 0;
    });

    // Calculate yellow and red cards for each player/team
    statsMap.forEach((stat, playerId) => {
      let yellowCount = 0;
      let redCount = 0;
      
      matchPlayerStats.forEach(matchStat => {
        if (registrationType === 'team') {
          // For team events, sum cards from all team members
          if (matchStat.team_member_id) {
            const member = teamMembers.find(m => m.id === matchStat.team_member_id);
            if (member && member.player_id === playerId) {
              const isYellowCard = matchStat.stat_name === 'yellow_card' || 
                                  matchStat.stat_name === 'yellow_cards' || 
                                  matchStat.stat_name === '黃牌' ||
                                  matchStat.stat_name?.toLowerCase().includes('yellow') ||
                                  matchStat.stat_name?.includes('黃');
              const isRedCard = matchStat.stat_name === 'red_card' || 
                                matchStat.stat_name === 'red_cards' || 
                                matchStat.stat_name === '紅牌' ||
                                matchStat.stat_name?.toLowerCase().includes('red') ||
                                matchStat.stat_name?.includes('紅');
              
              if (isYellowCard && matchStat.stat_value) {
                yellowCount += parseInt(matchStat.stat_value) || 0;
              }
              if (isRedCard && matchStat.stat_value) {
                redCount += parseInt(matchStat.stat_value) || 0;
              }
            }
          }
        } else {
          // For individual events
          if (matchStat.player_id === playerId) {
            const isYellowCard = matchStat.stat_name === 'yellow_card' || 
                                matchStat.stat_name === 'yellow_cards' || 
                                matchStat.stat_name === '黃牌' ||
                                matchStat.stat_name?.toLowerCase().includes('yellow') ||
                                matchStat.stat_name?.includes('黃');
            const isRedCard = matchStat.stat_name === 'red_card' || 
                              matchStat.stat_name === 'red_cards' || 
                              matchStat.stat_name === '紅牌' ||
                              matchStat.stat_name?.toLowerCase().includes('red') ||
                              matchStat.stat_name?.includes('紅');
            
            if (isYellowCard && matchStat.stat_value) {
              yellowCount += parseInt(matchStat.stat_value) || 0;
            }
            if (isRedCard && matchStat.stat_value) {
              redCount += parseInt(matchStat.stat_value) || 0;
            }
          }
        }
      });
      
      stat.yellowCards = yellowCount;
      stat.redCards = redCount;
      // Calculate fair play points (negative value: more negative = worse)
      stat.fairPlayPoints = -(yellowCount + redCount * 3);
    });

    // Enhanced sorting with head-to-head and fair play tiebreakers
    const sortedStats = Array.from(statsMap.values());
    
    // Helper function to calculate head-to-head between two players
    const calculateHeadToHead = (player1Id: string, player2Id: string): {
      player1Points: number;
      player2Points: number;
      player1GoalDiff: number;
      player2GoalDiff: number;
      player1GoalsFor: number;
      player2GoalsFor: number;
    } => {
      let p1Points = 0, p2Points = 0;
      let p1GoalsFor = 0, p2GoalsFor = 0;
      let p1GoalsAgainst = 0, p2GoalsAgainst = 0;

      const headToHeadMatches = matches.filter(m => {
        if (m.status !== "completed") return false;
        const hasP1 = (m.player1_id === player1Id || m.player1_id === player2Id);
        const hasP2 = (m.player2_id === player1Id || m.player2_id === player2Id);
        return hasP1 && hasP2;
      });

      headToHeadMatches.forEach(m => {
        const score = parseScore(m.score1 && m.score2 ? `${m.score1}-${m.score2}` : undefined);
        if (!score) return;

        const isP1First = m.player1_id === player1Id;
        const p1Score = isP1First ? score.score1 : score.score2;
        const p2Score = isP1First ? score.score2 : score.score1;

        p1GoalsFor += p1Score;
        p2GoalsFor += p2Score;
        p1GoalsAgainst += p2Score;
        p2GoalsAgainst += p1Score;

        if (p1Score > p2Score) {
          p1Points += 3;
        } else if (p1Score < p2Score) {
          p2Points += 3;
        } else {
          p1Points += 1;
          p2Points += 1;
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

    return sortedStats.sort((a, b) => {
      // 1. Points (highest first)
      if (b.points !== a.points) return b.points - a.points;
      
      // 2. Goal Difference (highest first)
      if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
      
      // 3. Goals For (highest first)
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      
      // 4. Head-to-Head Points
      const h2h = calculateHeadToHead(a.player.id, b.player.id);
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
      if (b.fairPlayPoints !== a.fairPlayPoints) {
        return b.fairPlayPoints - a.fairPlayPoints;
      }
      
      // 8. Final tiebreaker: alphabetical by name
      return a.player.name.localeCompare(b.player.name);
    });
  }, [players, matches, matchPlayerStats, teamMembers, registrationType]);

  // Calculate top performers for charts (must be before early return)
  // For team events, calculate individual player goals from match_player_stats
  const individualPlayerGoals = useMemo(() => {
    if (registrationType !== 'team') return new Map<string, { name: string; goals: number; teamName?: string; jerseyNumber?: number | null }>();
    
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
    
    return goalsMap;
  }, [matchPlayerStats, teamMembers, registrationType, players]);

  const topScorers = useMemo(() => {
    if (registrationType === 'team' && individualPlayerGoals.size > 0) {
      // For team events, show individual players with team name and jersey number
      const playerGoalsArray: Array<{ name: string; goals: number; teamName?: string; jerseyNumber?: number | null }> = [];
      individualPlayerGoals.forEach((value) => {
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
    } else {
      // For player events, show team/player goals
      return [...playerStats]
        .sort((a, b) => b.goalsFor - a.goalsFor)
        .filter(s => s.goalsFor > 0)
        .map(stat => ({
          id: stat.player.id,
          name: stat.player.name,
          goalsFor: stat.goalsFor
        }));
    }
  }, [playerStats, individualPlayerGoals, registrationType]);

  // Calculate yellow cards ranking
  const topYellowCards = useMemo(() => {
    const cardsMap = new Map<string, { name: string; cards: number; teamName?: string; jerseyNumber?: number | null }>();
    
    // Debug: 輸出所有統計名稱
    const allStatNames = new Set(matchPlayerStats.map(s => s.stat_name));
    console.log('[PlayerStats] All stat names:', Array.from(allStatNames));
    
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

  // Calculate red cards ranking
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

  const topWinRate = useMemo(() => {
    return [...playerStats]
      .filter(s => s.matchesPlayed >= 3) // At least 3 matches
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, 5);
  }, [playerStats]);

  const hasStats = playerStats.some(s => s.matchesPlayed > 0);

  if (!hasStats) {
    return (
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
        <h2 className="text-2xl font-semibold text-ntu-green mb-4">{registrationType === 'team' ? '隊伍統計' : '選手統計'}</h2>
        <p className="text-gray-500">尚無比賽數據</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-ntu-green">{registrationType === 'team' ? '隊伍統計' : '選手統計'}</h2>
          <p className="text-sm text-gray-600 mt-1">基於已完成比賽的統計數據</p>
        </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">排名</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{registrationType === 'team' ? '隊伍' : '選手'}</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">勝</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">敗</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">和</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">進球</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">失球</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">得失分差</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">積分</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Y/R</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">勝率</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {playerStats.map((stat, idx) => {
              const cardDisplay = stat.redCards > 0 
                ? `${stat.yellowCards}/${stat.redCards}` 
                : stat.yellowCards > 0 
                  ? `${stat.yellowCards}` 
                  : '-';
              return (
              <tr key={stat.player.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-center font-bold text-gray-700">{idx + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {stat.player.seed && (
                      <span className="text-xs font-bold text-white bg-ntu-green px-1.5 py-0.5 rounded">
                        {stat.player.seed}
                      </span>
                    )}
                    <span className="font-semibold">{stat.player.name}</span>
                    {stat.player.department && (
                      <span className="text-xs text-gray-500">({stat.player.department})</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-center font-semibold text-green-600">{stat.wins}</td>
                <td className="px-4 py-3 text-center font-semibold text-red-600">{stat.losses}</td>
                <td className="px-4 py-3 text-center font-semibold text-gray-600">{stat.draws}</td>
                <td className="px-4 py-3 text-center text-gray-700">{stat.goalsFor}</td>
                <td className="px-4 py-3 text-center text-gray-700">{stat.goalsAgainst}</td>
                <td className={`px-4 py-3 text-center font-semibold ${
                  stat.goalDiff > 0 ? 'text-green-600' : stat.goalDiff < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {stat.goalDiff > 0 ? '+' : ''}{stat.goalDiff}
                </td>
                <td className="px-4 py-3 text-center font-bold text-ntu-green">{stat.points}</td>
                <td className="px-4 py-3 text-center font-semibold text-gray-700">{cardDisplay}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-semibold text-gray-700">{stat.winRate}%</span>
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-ntu-green h-2 rounded-full transition-all"
                        style={{ width: `${stat.winRate}%` }}
                      />
                    </div>
                  </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {playerStats.map((stat, idx) => (
          <div key={stat.player.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-gray-700">#{idx + 1}</span>
                {stat.player.seed && (
                  <span className="text-xs font-bold text-white bg-ntu-green px-1.5 py-0.5 rounded">
                    {stat.player.seed}
                  </span>
                )}
                <div>
                  <div className="font-semibold text-gray-900">{stat.player.name}</div>
                  {stat.player.department && (
                    <div className="text-xs text-gray-500">{stat.player.department}</div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-ntu-green">{stat.points}</div>
                <div className="text-xs text-gray-500">積分</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3 text-center">
              <div>
                <div className="text-lg font-semibold text-green-600">{stat.wins}</div>
                <div className="text-xs text-gray-500">勝</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-red-600">{stat.losses}</div>
                <div className="text-xs text-gray-500">敗</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-600">{stat.draws}</div>
                <div className="text-xs text-gray-500">和</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
              <div>
                <span className="text-gray-600">進球:</span>{" "}
                <span className="font-semibold">{stat.goalsFor}</span>
              </div>
              <div>
                <span className="text-gray-600">失球:</span>{" "}
                <span className="font-semibold">{stat.goalsAgainst}</span>
              </div>
              <div>
                <span className="text-gray-600">得失分差:</span>{" "}
                <span className={`font-semibold ${
                  stat.goalDiff > 0 ? 'text-green-600' : stat.goalDiff < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {stat.goalDiff > 0 ? '+' : ''}{stat.goalDiff}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Y/R:</span>{" "}
                <span className="font-semibold text-gray-700">
                  {stat.redCards > 0 
                    ? `${stat.yellowCards}/${stat.redCards}` 
                    : stat.yellowCards > 0 
                      ? `${stat.yellowCards}` 
                      : '-'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">勝率:</span>{" "}
                <span className="font-semibold">{stat.winRate}%</span>
              </div>
            </div>

            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>勝率</span>
                <span>{stat.winRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-ntu-green h-2 rounded-full transition-all"
                  style={{ width: `${stat.winRate}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      </div>

      {/* Simple Charts */}
      {(topScorers.length > 0 || topWinRate.length > 0 || topYellowCards.length > 0 || topRedCards.length > 0) && (
        <div className="space-y-6">
          {/* Top Performers: Goals, Yellow Cards, Red Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Top Scorers Chart */}
            {topScorers.length > 0 ? (
                <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-ntu-green mb-4">⚽ 進球數排名</h3>
                  <div className="space-y-3">
                    {topScorers.map((stat, idx) => {
                      const maxGoals = topScorers[0].goalsFor;
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
                            <span className="text-sm font-bold text-ntu-green">{stat.goalsFor} 球</span>
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
                  <h3 className="text-lg font-semibold text-ntu-green mb-4">⚽ 進球數排名</h3>
                  <p className="text-sm text-gray-500">尚無數據</p>
                </div>
              )}

              {/* Top Yellow Cards Chart */}
              {topYellowCards.length > 0 ? (
                <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-yellow-600 mb-4">🟨 黃牌排名</h3>
                  <div className="space-y-3">
                    {topYellowCards.map((stat, idx) => {
                      const maxCards = topYellowCards[0].count;
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
                            <span className="text-sm font-bold text-yellow-600">{stat.count} 張</span>
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
                  <h3 className="text-lg font-semibold text-yellow-600 mb-4">🟨 黃牌排名</h3>
                  <p className="text-sm text-gray-500">尚無數據</p>
                </div>
              )}

            {/* Top Red Cards Chart */}
            {topRedCards.length > 0 ? (
                <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-red-600 mb-4">🟥 紅牌排名</h3>
                  <div className="space-y-3">
                    {topRedCards.map((stat, idx) => {
                      const maxCards = topRedCards[0].count;
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
                            <span className="text-sm font-bold text-red-600">{stat.count} 張</span>
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
                  <h3 className="text-lg font-semibold text-red-600 mb-4">🟥 紅牌排名</h3>
                  <p className="text-sm text-gray-500">尚無數據</p>
                </div>
              )}
          </div>

          {/* Top Win Rate Chart */}
          {topWinRate.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-ntu-green mb-4">勝率 Top 5 (至少 3 場比賽)</h3>
                <div className="space-y-3">
                  {topWinRate.map((stat, idx) => (
                    <div key={stat.player.id}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700">
                          {idx + 1}. {stat.player.name}
                        </span>
                        <span className="text-sm font-bold text-ntu-green">{stat.winRate}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-ntu-green h-3 rounded-full transition-all"
                          style={{ width: `${stat.winRate}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {stat.wins} 勝 {stat.losses} 敗 {stat.draws} 和 ({stat.matchesPlayed} 場)
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

