"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { getCourtDisplay } from "@/lib/utils/getCourtDisplay";
import { formatScheduledTimeAsStored } from "@/lib/utils/formatScheduledTime";

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
  scoringConfig?: any;
}

const formatDateTimeDisplay = (iso?: string | null): string => {
  const s = formatScheduledTimeAsStored(iso ?? null);
  return s === "—" ? "TBD" : s;
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
  scoringConfig,
}: TeamDetailViewProps) {
  const { t } = useI18n();
  const isTeamEvent = event?.registration_type === 'team';

  // Determine sport-specific terminology from configuration (fallback to old logic)
  const configObj = scoringConfig || {};
  const sportParam = event?.sport?.toLowerCase() || "";
  
  // Use scoring config if available, otherwise fallback to guessing
  const hideDraws = "hideDraws" in configObj 
    ? configObj.hideDraws 
    : ['tennis', 'tabletennis', 'badminton', 'volleyball', 'basketball'].includes(sportParam);
    
  const hideLeaguePoints = "hideLeaguePoints" in configObj 
    ? configObj.hideLeaguePoints 
    : false;
    
  // Resolve generic labels (scoreName can be goals, points, sets, games, runs)
  const scoreName = configObj.scoreName || 
    (sportParam === 'basketball' ? 'points' : 
    (['tennis', 'tabletennis', 'badminton', 'volleyball'].includes(sportParam) ? 'sets' : 'goals'));

  const getScoreLabels = () => {
    switch (scoreName) {
      case 'points':
        return { for: "teamDetail.pointsFor", against: "teamDetail.pointsAgainst", diff: "teamDetail.pointDiff" };
      case 'sets':
        return { for: "teamDetail.setsWon", against: "teamDetail.setsLost", diff: "teamDetail.setDiff" };
      case 'games':
        return { for: "teamDetail.statsGames", against: "teamDetail.statsGamesLost", diff: "teamDetail.statsGamesDiff" }; // requires new translations or fallback
      case 'runs':
        return { for: "teamDetail.statsRuns", against: "teamDetail.statsRunsAgainst", diff: "teamDetail.statsRunDiff" }; // requires new translations or fallback
      case 'goals':
      default:
        return { for: "teamDetail.goalsFor", against: "teamDetail.goalsAgainst", diff: "teamDetail.goalDiff" };
    }
  };

  const scoreLabels = getScoreLabels();

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
          {t("matchDetail.backToSchedule")}
        </Link>
        <h1 className="text-4xl font-bold text-ntu-green mb-2">
          {isTeamEvent ? t("teamDetail.titleTeam") : t("teamDetail.titlePlayer")}
        </h1>
        <p className="text-lg text-gray-600">
          {team.name}
          {team.department && ` (${team.department})`}
          {team.seed && ` - {t("matchDetail.seed").replace("{n}", String(team.seed))}`}
        </p>
      </div>

      {/* Team/Player Basic Info */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-6">
        <h2 className="text-2xl font-semibold text-ntu-green mb-4">{t("teamDetail.basicInfo")}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t("teamDetail.name")}</label>
            <div className="px-4 py-2 bg-gray-50 rounded-lg font-semibold">
              {team.name}
            </div>
          </div>

          {team.department && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t("teamDetail.department")}</label>
              <div className="px-4 py-2 bg-gray-50 rounded-lg">
                {team.department}
              </div>
            </div>
          )}

          {team.seed && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t("teamDetail.seed")}</label>
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
                {t("matchDetail.playersCount").replace("{n}", String(teamMembers.length))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Team Statistics */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-6">
        <h2 className="text-2xl font-semibold text-ntu-green mb-4">{t("teamDetail.statisticsTitle")}</h2>
        
        <div className={`grid grid-cols-2 md:grid-cols-${(hideDraws && hideLeaguePoints) ? '2' : (hideDraws || hideLeaguePoints) ? '3' : '4'} gap-4`}>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{statistics.wins}</div>
            <div className="text-sm text-gray-600">{t("teamDetail.wins")}</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{statistics.losses}</div>
            <div className="text-sm text-gray-600">{t("teamDetail.losses")}</div>
          </div>
          {!hideDraws && (
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">{statistics.draws}</div>
              <div className="text-sm text-gray-600">{t("teamDetail.draws")}</div>
            </div>
          )}
          {!hideLeaguePoints && (
            <div className="text-center p-4 bg-ntu-green bg-opacity-10 rounded-lg">
              <div className="text-2xl font-bold text-ntu-green">{statistics.points}</div>
              <div className="text-sm text-gray-600">{t("teamDetail.points")}</div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{statistics.goalsFor}</div>
            <div className="text-sm text-gray-600">{t(scoreLabels.for as any)}</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{statistics.goalsAgainst}</div>
            <div className="text-sm text-gray-600">{t(scoreLabels.against as any)}</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className={`text-2xl font-bold ${statistics.goalDiff > 0 ? 'text-green-600' : statistics.goalDiff < 0 ? 'text-red-600' : 'text-gray-600'}`}>
              {statistics.goalDiff > 0 ? '+' : ''}{statistics.goalDiff}
            </div>
            <div className="text-sm text-gray-600">{t(scoreLabels.diff as any)}</div>
          </div>
        </div>
      </div>

      {/* Team Members */}
      {isTeamEvent && teamMembers.length > 0 && (
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-6">
          <h2 className="text-2xl font-semibold text-ntu-green mb-4">{t("teamDetail.membersList")}</h2>
          
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
        <h2 className="text-2xl font-semibold text-ntu-green mb-4">{t("teamDetail.matchHistory")}</h2>
        
        {matches.length === 0 ? (
          <p className="text-gray-600 text-center py-8">{t("teamDetail.noMatches")}</p>
        ) : (
          <div className="overflow-x-auto">
            {/* Mobile: card list (clickable to match page) */}
            <div className="md:hidden space-y-3">
              {matches.map((match: any) => {
                const scoreStr = match.score1 != null && match.score2 != null
                  ? `${match.score1}-${match.score2}` : "-";
                return (
                  <Link
                    key={match.id}
                    href={`/sports/${sportParam}/matches/${match.id}`}
                    className="block bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:border-ntu-green hover:shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.99]"
                  >
                    {match.group_number != null && (
                      <div className="mb-2">
                        <span className="inline-block px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded">
                          Group {match.group_number}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-600">{formatDateTimeDisplay(match.scheduled_time)}</span>
                      {match.status === "completed" && (
                        <span className="inline-block px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded">{t("sports.completed")}</span>
                      )}
                      {match.status === "live" && (
                        <span className="inline-block px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded animate-pulse">{t("sports.live")}</span>
                      )}
                      {match.status === "upcoming" && (
                        <span className="inline-block px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-100 rounded">{t("sports.upcoming")}</span>
                      )}
                      {match.status === "delayed" && (
                        <span className="inline-block px-2 py-1 text-xs font-semibold text-amber-700 bg-amber-100 rounded">{t("sports.delayed")}</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mb-1">{getCourtDisplay(match)}</div>
                    <div className="flex items-center justify-between gap-2 text-base font-semibold text-gray-800">
                      <span className="truncate">{match.player1?.name || "TBD"}</span>
                      <span className="text-ntu-green shrink-0">{t("seasonPlay.vs")}</span>
                      <span className="truncate">{match.player2?.name || "TBD"}</span>
                    </div>
                    {scoreStr !== "-" && (
                      <div className="mt-2 text-sm font-semibold text-ntu-green">{scoreStr}</div>
                    )}
                  </Link>
                );
              })}
            </div>
            {/* Desktop: table (same format as schedule, VS links to match) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-ntu-green text-white">
                  <tr>
                    <th className="px-4 py-3 text-left">{t("seasonPlay.player1")}</th>
                    <th className="px-4 py-3 text-center">{t("seasonPlay.vs")}</th>
                    <th className="px-4 py-3 text-left">{t("seasonPlay.player2")}</th>
                    <th className="px-4 py-3 text-center">{t("matchDetail.matchTime")}</th>
                    <th className="px-4 py-3 text-center">{t("matchDetail.court")}</th>
                    <th className="px-4 py-3 text-center">{t("matchDetail.score")}</th>
                    <th className="px-4 py-3 text-center">{t("matchDetail.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((match: any, idx: number) => {
                    const scoreStr = match.score1 != null && match.score2 != null
                      ? `${match.score1}-${match.score2}` : "-";
                    const matchUrl = `/sports/${sportParam}/matches/${match.id}`;
                    return (
                      <tr key={match.id} className={idx % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                        <td className="px-4 py-3">
                          {match.player1 ? (
                            <Link
                              href={`/sports/${sportParam}/teams/${match.player1.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className={`font-semibold hover:text-ntu-green hover:underline ${match.winner_id === match.player1_id ? "text-ntu-green" : ""}`}
                            >
                              {match.player1.name}
                            </Link>
                          ) : (
                            <span className="text-gray-400">TBD</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Link
                            href={matchUrl}
                            className="text-lg font-bold text-ntu-green hover:text-green-700 hover:underline"
                          >
                            VS
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          {match.player2 ? (
                            <Link
                              href={`/sports/${sportParam}/teams/${match.player2.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className={`font-semibold hover:text-ntu-green hover:underline ${match.winner_id === match.player2_id ? "text-ntu-green" : ""}`}
                            >
                              {match.player2.name}
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
                          {scoreStr !== "-" ? scoreStr : "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {match.status === "completed" && (
                            <span className="inline-block px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded">{t("sports.completed")}</span>
                          )}
                          {match.status === "live" && (
                            <span className="inline-block px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded animate-pulse">{t("sports.live")}</span>
                          )}
                          {match.status === "upcoming" && (
                            <span className="inline-block px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-100 rounded">{t("sports.upcoming")}</span>
                          )}
                          {match.status === "delayed" && (
                            <span className="inline-block px-2 py-1 text-xs font-semibold text-amber-700 bg-amber-100 rounded">{t("sports.delayed")}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

