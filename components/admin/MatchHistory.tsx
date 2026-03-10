"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { Player, Match } from "@/types/database";

interface MatchHistoryProps {
  players: Player[];
  matches: Match[];
  registrationType?: 'player' | 'team';
}

interface HeadToHead {
  player1: Player;
  player2: Player;
  matches: Match[];
  player1Wins: number;
  player2Wins: number;
  draws: number;
}

export default function MatchHistory({ players, matches, registrationType = 'player' }: MatchHistoryProps) {
  const [selectedPlayer1, setSelectedPlayer1] = useState<string>("");
  const [selectedPlayer2, setSelectedPlayer2] = useState<string>("");
  const { t } = useI18n();
  const typeStr = registrationType === 'team' ? t('admin.registration.entityTeam') : t('admin.registration.entityPlayer');

  // Calculate head-to-head records
  const headToHead = useMemo(() => {
    if (!selectedPlayer1 || !selectedPlayer2 || selectedPlayer1 === selectedPlayer2) {
      return null;
    }

    const p1 = players.find(p => p.id === selectedPlayer1);
    const p2 = players.find(p => p.id === selectedPlayer2);

    if (!p1 || !p2) return null;

    // Find all matches between these two players
    const h2hMatches = matches.filter(match => {
      const hasP1 = match.player1_id === p1.id || match.player2_id === p1.id;
      const hasP2 = match.player1_id === p2.id || match.player2_id === p2.id;
      return hasP1 && hasP2 && match.status === "completed";
    });

    let player1Wins = 0;
    let player2Wins = 0;
    let draws = 0;

    h2hMatches.forEach(match => {
      if (!match.winner_id) {
        // Check if it's a draw (same score)
        const score = match.score1 && match.score2 ? `${match.score1}-${match.score2}` : undefined;
        if (score) {
          const matchScore = score.match(/(\d+)\s*[-:]\s*(\d+)/);
          if (matchScore && matchScore[1] === matchScore[2]) {
            draws++;
          }
        }
        return;
      }

      if (match.winner_id === p1.id) {
        player1Wins++;
      } else if (match.winner_id === p2.id) {
        player2Wins++;
      }
    });

    return {
      player1: p1,
      player2: p2,
      matches: h2hMatches,
      player1Wins,
      player2Wins,
      draws,
    };
  }, [selectedPlayer1, selectedPlayer2, players, matches]);

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-semibold text-ntu-green">{t('admin.matchHistory.title')}</h2>
        <p className="text-sm text-gray-600 mt-1">{t('admin.matchHistory.description', { type: typeStr })}</p>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.matchHistory.player1', { type: typeStr })}</label>
            <select
              value={selectedPlayer1}
              onChange={(e) => setSelectedPlayer1(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
            >
              <option value="">{t('admin.matchHistory.selectPlayer', { type: typeStr })}</option>
              {players.map(player => (
                <option key={player.id} value={player.id}>
                  {player.name} {player.department ? `(${player.department})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.matchHistory.player2', { type: typeStr })}</label>
            <select
              value={selectedPlayer2}
              onChange={(e) => setSelectedPlayer2(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
            >
              <option value="">{t('admin.matchHistory.selectPlayer', { type: typeStr })}</option>
              {players
                .filter(p => p.id !== selectedPlayer1)
                .map(player => (
                  <option key={player.id} value={player.id}>
                    {player.name} {player.department ? `(${player.department})` : ""}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {headToHead && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-3">{t('admin.matchHistory.summary')}</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-700">{headToHead.player1Wins}</div>
                  <div className="text-sm text-blue-600">{t('admin.matchHistory.wins', { name: headToHead.player1.name })}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-700">{headToHead.draws}</div>
                  <div className="text-sm text-gray-600">{t('admin.matchHistory.draws')}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-700">{headToHead.player2Wins}</div>
                  <div className="text-sm text-blue-600">{t('admin.matchHistory.wins', { name: headToHead.player2.name })}</div>
                </div>
              </div>
            </div>

            {/* Match Details */}
            {headToHead.matches.length > 0 ? (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">{t('admin.matchHistory.details')}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.matchHistory.date')}</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.matchHistory.score')}</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.matchHistory.winner')}</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.matchHistory.court')}</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {headToHead.matches.map(match => {
                        const matchData = match as any;
                        const score = match.score1 && match.score2 ? `${match.score1}-${match.score2}` : "-";
                        const date = matchData.scheduled_time 
                          ? new Date(matchData.scheduled_time).toLocaleDateString('zh-TW')
                          : "-";
                        
                        // Find winner player by winner_id
                        const winner = match.winner_id 
                          ? players.find(p => p.id === match.winner_id)
                          : null;
                        
                        return (
                          <tr key={match.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-700">{date}</td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{score}</td>
                            <td className="px-4 py-3 text-sm">
                              {winner ? (
                                <span className="font-semibold text-ntu-green">{winner.name}</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{match.court || "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>{t('admin.matchHistory.noRecords')}</p>
              </div>
            )}
          </div>
        )}

        {!headToHead && selectedPlayer1 && selectedPlayer2 && (
          <div className="text-center py-8 text-gray-500">
            <p>{t('admin.matchHistory.selectDifferent', { type: typeStr })}</p>
          </div>
        )}
      </div>
    </div>
  );
}

