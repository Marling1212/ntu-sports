"use client";

import Link from "next/link";
import { getCourtDisplay } from "@/lib/utils/getCourtDisplay";

interface TeamDetailViewProps {
  team: any;
  event: any;
  teamMembers: any[];
  matches: any[];
  matchStats: any[];
  statDefinitions: any[];
  statistics: {
    wins: number;
    losses: number;
    draws: number;
    points: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDiff: number;
  };
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

export default function TeamDetailView({
  team,
  event,
  teamMembers,
  matches,
  matchStats,
  statDefinitions,
  statistics,
  sportName,
}: TeamDetailViewProps) {
  const isTeamEvent = event?.registration_type === 'team';
  const sportParam = event?.sport?.toLowerCase() || "";

  // Organize stats by team member - SUM values across all matches
  const memberStatsMap: Record<string, Record<string, number>> = {};
  matchStats.forEach(stat => {
    if (stat.team_member_id && stat.stat_value) {
      if (!memberStatsMap[stat.team_member_id]) {
        memberStatsMap[stat.team_member_id] = {};
      }
      
      // Handle own goals separately - they're stored as player_own_goals but should be counted
      // For display purposes, we can show them separately or include them in total goals
      const statName = stat.stat_name;
      const currentValue = memberStatsMap[stat.team_member_id][statName] || 0;
      const newValue = parseInt(stat.stat_value) || 0;
      memberStatsMap[stat.team_member_id][statName] = currentValue + newValue;
    }
  });

  // Separate team-level and player-level stats
  const allStats = statDefinitions.sort((a, b) => a.display_order - b.display_order);
  const playerLevelStats = allStats.filter(s => s.stat_level === 'player');

  // Calculate individual player statistics
  const playerStats: Array<{
    member: any;
    stats: Record<string, number>;
    totalGoals?: number;
  }> = [];

  if (isTeamEvent && teamMembers.length > 0) {
    teamMembers.forEach(member => {
      const stats = memberStatsMap[member.id] || {};
      // Get total goals (sum of player_goals across all matches)
      const totalGoals = stats['player_goals'] || 0;

      if (Object.keys(stats).length > 0 || totalGoals > 0) {
        playerStats.push({
          member,
          stats,
          totalGoals: totalGoals > 0 ? totalGoals : undefined,
        });
      }
    });
  }

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
          {isTeamEvent ? '隊伍詳情' : '選手詳情'}
        </h1>
        <p className="text-lg text-gray-600">
          {team.name}
          {team.department && ` (${team.department})`}
          {team.seed && ` - Seed ${team.seed}`}
        </p>
      </div>

      {/* Team/Player Basic Info */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-6">
        <h2 className="text-2xl font-semibold text-ntu-green mb-4">基本信息</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">名稱</label>
            <div className="px-4 py-2 bg-gray-50 rounded-lg font-semibold">
              {team.name}
            </div>
          </div>

          {team.department && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">科系</label>
              <div className="px-4 py-2 bg-gray-50 rounded-lg">
                {team.department}
              </div>
            </div>
          )}

          {team.seed && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">種子序號</label>
              <div className="px-4 py-2 bg-gray-50 rounded-lg">
                <span className="px-2 py-0.5 bg-ntu-green text-white text-xs rounded">
                  Seed {team.seed}
                </span>
              </div>
            </div>
          )}

          {isTeamEvent && teamMembers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">隊員人數</label>
              <div className="px-4 py-2 bg-gray-50 rounded-lg">
                {teamMembers.length} 位球員
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Team Statistics */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-6">
        <h2 className="text-2xl font-semibold text-ntu-green mb-4">戰績統計</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{statistics.wins}</div>
            <div className="text-sm text-gray-600">勝場</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{statistics.losses}</div>
            <div className="text-sm text-gray-600">敗場</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-600">{statistics.draws}</div>
            <div className="text-sm text-gray-600">平局</div>
          </div>
          <div className="text-center p-4 bg-ntu-green bg-opacity-10 rounded-lg">
            <div className="text-2xl font-bold text-ntu-green">{statistics.points}</div>
            <div className="text-sm text-gray-600">積分</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{statistics.goalsFor}</div>
            <div className="text-sm text-gray-600">進球</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{statistics.goalsAgainst}</div>
            <div className="text-sm text-gray-600">失球</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className={`text-2xl font-bold ${statistics.goalDiff > 0 ? 'text-green-600' : statistics.goalDiff < 0 ? 'text-red-600' : 'text-gray-600'}`}>
              {statistics.goalDiff > 0 ? '+' : ''}{statistics.goalDiff}
            </div>
            <div className="text-sm text-gray-600">得失分差</div>
          </div>
        </div>
      </div>

      {/* Team Members */}
      {isTeamEvent && teamMembers.length > 0 && (
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-6">
          <h2 className="text-2xl font-semibold text-ntu-green mb-4">隊員名單</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamMembers.map((member: any) => {
              const stats = memberStatsMap[member.id] || {};
              const hasStats = Object.keys(stats).length > 0;
              
              return (
                <div key={member.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-800">
                      {member.name}
                    </h3>
                    {member.jersey_number !== null && member.jersey_number !== undefined && (
                      <span className="px-2 py-1 bg-ntu-green text-white text-xs rounded">
                        #{member.jersey_number}
                      </span>
                    )}
                  </div>
                  {hasStats && (
                    <div className="mt-2 space-y-1">
                      {playerLevelStats.map(stat => {
                        const value = stats[stat.stat_name];
                        if (value === undefined || value === null || value === 0) return null;
                        return (
                          <div key={stat.id} className="flex justify-between text-xs">
                            <span className="text-gray-600">{stat.stat_label}:</span>
                            <span className="font-semibold">{value}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Match History */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
        <h2 className="text-2xl font-semibold text-ntu-green mb-4">比賽記錄</h2>
        
        {matches.length === 0 ? (
          <p className="text-gray-600 text-center py-8">尚無比賽記錄</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-ntu-green text-white">
                <tr>
                  <th className="px-4 py-3 text-left">對手</th>
                  <th className="px-4 py-3 text-center">日期時間</th>
                  <th className="px-4 py-3 text-center">場地</th>
                  <th className="px-4 py-3 text-center">比分</th>
                  <th className="px-4 py-3 text-center">狀態</th>
                  <th className="px-4 py-3 text-center">詳情</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((match: any, idx: number) => {
                  const isPlayer1 = match.player1_id === team.id;
                  const opponent = isPlayer1 ? match.player2 : match.player1;
                  const isWinner = match.winner_id === team.id;
                  
                  return (
                    <tr key={match.id} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="px-4 py-3">
                        {opponent ? (
                          <Link 
                            href={`/sports/${sportParam}/teams/${opponent.id}`}
                            className="font-semibold hover:text-ntu-green hover:underline"
                          >
                            {opponent.name}
                          </Link>
                        ) : (
                          <span className="text-gray-400">TBD</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        {formatDateTimeDisplay(match.scheduled_time)}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600">
                        {getCourtDisplay(match)}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold">
                        {match.score1 && match.score2 ? (
                          <span className={isWinner ? 'text-green-600' : match.winner_id ? 'text-red-600' : ''}>
                            {isPlayer1 ? `${match.score1} - ${match.score2}` : `${match.score2} - ${match.score1}`}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {match.status === 'completed' && (
                          <span className="inline-block px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded">
                            已完成
                          </span>
                        )}
                        {match.status === 'live' && (
                          <span className="inline-block px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded animate-pulse">
                            進行中
                          </span>
                        )}
                        {match.status === 'upcoming' && (
                          <span className="inline-block px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-100 rounded">
                            即將開始
                          </span>
                        )}
                        {match.status === 'delayed' && (
                          <span className="inline-block px-2 py-1 text-xs font-semibold text-amber-700 bg-amber-100 rounded">
                            延遲
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link 
                          href={`/sports/${sportParam}/matches/${match.id}`}
                          className="text-ntu-green hover:underline text-sm"
                        >
                          查看詳情
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

