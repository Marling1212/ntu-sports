"use client";

import Link from "next/link";
import { getCourtDisplay } from "@/lib/utils/getCourtDisplay";

interface MatchDetailViewProps {
  match: any;
  event: any;
  players: any[];
  teamMembers: Record<string, any[]>;
  statDefinitions: any[];
  matchStats: any[];
  sportName: string;
}

const formatDateTimeDisplay = (iso?: string | null): string => {
  if (!iso) return "TBD";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "TBD";
  return new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Taipei",
  }).format(date);
};

export default function MatchDetailView({
  match,
  event,
  players,
  teamMembers,
  statDefinitions,
  matchStats,
  sportName,
}: MatchDetailViewProps) {
  const player1 = match.player1_id ? players.find(p => p.id === match.player1_id) : null;
  const player2 = match.player2_id ? players.find(p => p.id === match.player2_id) : null;
  const isTeamEvent = event?.registration_type === 'team';

  // Organize stats by player/team
  const player1Stats: Record<string, string> = {};
  const player2Stats: Record<string, string> = {};
  const player1MemberStats: Record<string, Record<string, string>> = {};
  const player2MemberStats: Record<string, Record<string, string>> = {};
  
  // Track own goals: { playerId: { teamMemberId: true } }
  const ownGoalsMap: Record<string, Record<string, boolean>> = {};

  matchStats.forEach(stat => {
    if (stat.player_id === match.player1_id) {
      if (stat.team_member_id) {
        if (!player1MemberStats[stat.team_member_id]) {
          player1MemberStats[stat.team_member_id] = {};
        }
        
        // If it's an own goal, track it but DON'T add it to player1's stats
        // Own goals count FOR the opposing team, so the goal will show under player2's team stats
        if (stat.stat_name === 'player_own_goals' && stat.stat_value) {
          // Track which player scored the own goal (for OG badge display)
          if (!ownGoalsMap[match.player1_id]) {
            ownGoalsMap[match.player1_id] = {};
          }
          ownGoalsMap[match.player1_id][stat.team_member_id] = true;
          // Don't add the goal to player1's stats - it counts for the opposing team
        } else {
          player1MemberStats[stat.team_member_id][stat.stat_name] = stat.stat_value || "";
        }
      } else {
        player1Stats[stat.stat_name] = stat.stat_value || "";
      }
    } else if (stat.player_id === match.player2_id) {
      if (stat.team_member_id) {
        if (!player2MemberStats[stat.team_member_id]) {
          player2MemberStats[stat.team_member_id] = {};
        }
        
        // If it's an own goal, track it but DON'T add it to player2's stats
        // Own goals count FOR the opposing team, so the goal will show under player1's team stats
        if (stat.stat_name === 'player_own_goals' && stat.stat_value) {
          // Track which player scored the own goal (for OG badge display)
          if (!ownGoalsMap[match.player2_id]) {
            ownGoalsMap[match.player2_id] = {};
          }
          ownGoalsMap[match.player2_id][stat.team_member_id] = true;
          // Don't add the goal to player2's stats - it counts for the opposing team
        } else {
          player2MemberStats[stat.team_member_id][stat.stat_name] = stat.stat_value || "";
        }
      } else {
        player2Stats[stat.stat_name] = stat.stat_value || "";
      }
    }
  });

  // Separate team-level and player-level stats
  const allStats = statDefinitions.sort((a, b) => a.display_order - b.display_order);
  const teamLevelStats = allStats.filter(s => s.stat_level === 'team' || !s.stat_level);
  const playerLevelStats = allStats.filter(s => s.stat_level === 'player');

  // Get sport name for URL
  const sportParam = event?.sport?.toLowerCase() || "";

  return (
    <div>
      <div className="mb-6">
        <Link 
          href={`/sports/${sportParam}/schedule`}
          className="text-ntu-green hover:underline mb-4 inline-block"
        >
          ← 返回賽程
        </Link>
        <h1 className="text-4xl font-bold text-ntu-green mb-2">
          比賽詳情
        </h1>
        <p className="text-lg text-gray-600">
          {match.round === 0 ? 'Regular Season' : `Round ${match.round}`}, Match {match.match_number}
          {match.group_number && ` - Group ${match.group_number}`}
        </p>
      </div>

      {/* Match Basic Info */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-6">
        <h2 className="text-2xl font-semibold text-ntu-green mb-4">比賽基本信息</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isTeamEvent ? '隊伍 1' : '選手 1'}
            </label>
            <div className="px-4 py-2 bg-gray-50 rounded-lg">
              {player1 ? (
                <Link 
                  href={`/sports/${sportParam}/teams/${player1.id}`}
                  className="hover:text-ntu-green hover:underline"
                >
                  <div>
                    <span className="font-semibold">{player1.name}</span>
                    {player1.department && (
                      <span className="text-gray-600 ml-2">({player1.department})</span>
                    )}
                    {player1.seed && (
                      <span className="ml-2 px-2 py-0.5 bg-ntu-green text-white text-xs rounded">
                        Seed {player1.seed}
                      </span>
                    )}
                  </div>
                </Link>
              ) : (
                <span className="text-gray-400">TBD</span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isTeamEvent ? '隊伍 2' : '選手 2'}
            </label>
            <div className="px-4 py-2 bg-gray-50 rounded-lg">
              {player2 ? (
                <Link 
                  href={`/sports/${sportParam}/teams/${player2.id}`}
                  className="hover:text-ntu-green hover:underline"
                >
                  <div>
                    <span className="font-semibold">{player2.name}</span>
                    {player2.department && (
                      <span className="text-gray-600 ml-2">({player2.department})</span>
                    )}
                    {player2.seed && (
                      <span className="ml-2 px-2 py-0.5 bg-ntu-green text-white text-xs rounded">
                        Seed {player2.seed}
                      </span>
                    )}
                  </div>
                </Link>
              ) : (
                <span className="text-gray-400">TBD</span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">比分</label>
            <div className="px-4 py-2 bg-gray-50 rounded-lg text-lg font-semibold">
              {match.score1 && match.score2 ? `${match.score1} - ${match.score2}` : "—"}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">獲勝者</label>
            <div className="px-4 py-2 bg-gray-50 rounded-lg">
              {match.winner ? (
                <Link 
                  href={`/sports/${sportParam}/teams/${match.winner.id}`}
                  className="font-semibold text-ntu-green hover:underline"
                >
                  {match.winner.name}
                </Link>
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">狀態</label>
            <div className="px-4 py-2 bg-gray-50 rounded-lg">
              {match.status === 'completed' && (
                <span className="inline-block px-3 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">
                  已完成
                </span>
              )}
              {match.status === 'live' && (
                <span className="inline-block px-3 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded-full animate-pulse">
                  進行中
                </span>
              )}
              {match.status === 'upcoming' && (
                <span className="inline-block px-3 py-1 text-xs font-semibold text-gray-700 bg-gray-100 rounded-full">
                  即將開始
                </span>
              )}
              {match.status === 'delayed' && (
                <span className="inline-block px-3 py-1 text-xs font-semibold text-amber-700 bg-amber-100 rounded-full">
                  延遲
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">場地</label>
            <div className="px-4 py-2 bg-gray-50 rounded-lg">
              {getCourtDisplay(match)}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">比賽時間</label>
            <div className="px-4 py-2 bg-gray-50 rounded-lg">
              {formatDateTimeDisplay(match.scheduled_time)}
              {match.slot?.code && (
                <span className="text-sm text-gray-500 ml-2">({match.slot.code})</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Section */}
      {allStats.length > 0 && (player1 || player2) && (
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-6">
          <h2 className="text-2xl font-semibold text-ntu-green mb-4">
            {isTeamEvent ? '隊伍統計' : '選手統計'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Team/Player 1 */}
            {player1 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 border-b pb-2">
                  <Link 
                    href={`/sports/${sportParam}/teams/${player1.id}`}
                    className="hover:text-ntu-green hover:underline"
                  >
                    {player1.name}
                  </Link>
                  {isTeamEvent && teamMembers[player1.id] && (
                    <span className="text-sm text-gray-500 ml-2">
                      ({teamMembers[player1.id].length} 位球員)
                    </span>
                  )}
                </h3>

                {/* Player-level Stats for Team Members */}
                {isTeamEvent && playerLevelStats.length > 0 && teamMembers[player1.id] && teamMembers[player1.id].length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-md font-medium text-gray-700 mb-3">個別球員統計</h4>
                    <div className="space-y-3">
                      {teamMembers[player1.id]
                        .filter((member: any) => {
                          const memberStats = player1MemberStats[member.id];
                          return memberStats && Object.keys(memberStats).length > 0;
                        })
                        .map((member: any) => {
                          const memberStats = player1MemberStats[member.id] || {};
                          return (
                            <div key={member.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                              <h5 className="font-semibold text-gray-800 mb-3">
                                {member.name}
                                {(member.jersey_number !== null && member.jersey_number !== undefined) && (
                                  <span className="text-sm text-gray-500 ml-2">#{member.jersey_number}</span>
                                )}
                                {ownGoalsMap[match.player1_id]?.[member.id] && (
                                  <span className="text-xs font-semibold text-red-600 ml-2 bg-red-100 px-2 py-0.5 rounded">OG</span>
                                )}
                              </h5>
                              <div className="space-y-2">
                                {playerLevelStats.map(stat => {
                                  const value = memberStats[stat.stat_name];
                                  if (!value || value === "" || value === null || value === undefined) return null;
                                  return (
                                    <div key={stat.id} className="flex justify-between text-sm">
                                      <span className="text-gray-600">{stat.stat_label}:</span>
                                      <span className="font-semibold">{value}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Team-level Stats */}
                {isTeamEvent && teamLevelStats.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-md font-medium text-gray-700 mb-3">隊伍整體統計</h4>
                    <div className="space-y-2">
                      {teamLevelStats.map(stat => {
                        const value = player1Stats[stat.stat_name];
                        if (!value || value === "" || value === null || value === undefined) return null;
                        return (
                          <div key={stat.id} className="flex justify-between text-sm">
                            <span className="text-gray-600">{stat.stat_label}:</span>
                            <span className="font-semibold">{value}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* For non-team events, show all stats */}
                {!isTeamEvent && (
                  <div className="space-y-2">
                    {allStats.map(stat => {
                      const value = player1Stats[stat.stat_name];
                      if (!value || value === "" || value === null || value === undefined) return null;
                      return (
                        <div key={stat.id} className="flex justify-between text-sm">
                          <span className="text-gray-600">{stat.stat_label}:</span>
                          <span className="font-semibold">{value}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Team/Player 2 */}
            {player2 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 border-b pb-2">
                  <Link 
                    href={`/sports/${sportParam}/teams/${player2.id}`}
                    className="hover:text-ntu-green hover:underline"
                  >
                    {player2.name}
                  </Link>
                  {isTeamEvent && teamMembers[player2.id] && (
                    <span className="text-sm text-gray-500 ml-2">
                      ({teamMembers[player2.id].length} 位球員)
                    </span>
                  )}
                </h3>

                {/* Player-level Stats for Team Members */}
                {isTeamEvent && playerLevelStats.length > 0 && teamMembers[player2.id] && teamMembers[player2.id].length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-md font-medium text-gray-700 mb-3">個別球員統計</h4>
                    <div className="space-y-3">
                      {teamMembers[player2.id]
                        .filter((member: any) => {
                          const memberStats = player2MemberStats[member.id];
                          return memberStats && Object.keys(memberStats).length > 0;
                        })
                        .map((member: any) => {
                          const memberStats = player2MemberStats[member.id] || {};
                          return (
                            <div key={member.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                              <h5 className="font-semibold text-gray-800 mb-3">
                                {member.name}
                                {(member.jersey_number !== null && member.jersey_number !== undefined) && (
                                  <span className="text-sm text-gray-500 ml-2">#{member.jersey_number}</span>
                                )}
                                {ownGoalsMap[match.player2_id]?.[member.id] && (
                                  <span className="text-xs font-semibold text-red-600 ml-2 bg-red-100 px-2 py-0.5 rounded">OG</span>
                                )}
                              </h5>
                              <div className="space-y-2">
                                {playerLevelStats.map(stat => {
                                  const value = memberStats[stat.stat_name];
                                  if (!value || value === "" || value === null || value === undefined) return null;
                                  return (
                                    <div key={stat.id} className="flex justify-between text-sm">
                                      <span className="text-gray-600">{stat.stat_label}:</span>
                                      <span className="font-semibold">{value}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Team-level Stats */}
                {isTeamEvent && teamLevelStats.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-md font-medium text-gray-700 mb-3">隊伍整體統計</h4>
                    <div className="space-y-2">
                      {teamLevelStats.map(stat => {
                        const value = player2Stats[stat.stat_name];
                        if (!value || value === "" || value === null || value === undefined) return null;
                        return (
                          <div key={stat.id} className="flex justify-between text-sm">
                            <span className="text-gray-600">{stat.stat_label}:</span>
                            <span className="font-semibold">{value}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* For non-team events, show all stats */}
                {!isTeamEvent && (
                  <div className="space-y-2">
                    {allStats.map(stat => {
                      const value = player2Stats[stat.stat_name];
                      if (!value || value === "" || value === null || value === undefined) return null;
                      return (
                        <div key={stat.id} className="flex justify-between text-sm">
                          <span className="text-gray-600">{stat.stat_label}:</span>
                          <span className="font-semibold">{value}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

