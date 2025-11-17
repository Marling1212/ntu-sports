"use client";

import { useMemo, useState } from "react";
import { Player, Match } from "@/types/database";

interface MatchHistoryProps {
  players: Player[];
  matches: Match[];
}

interface HeadToHead {
  player1: Player;
  player2: Player;
  matches: Match[];
  player1Wins: number;
  player2Wins: number;
  draws: number;
}

export default function MatchHistory({ players, matches }: MatchHistoryProps) {
  const [selectedPlayer1, setSelectedPlayer1] = useState<string>("");
  const [selectedPlayer2, setSelectedPlayer2] = useState<string>("");

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
      if (!match.winner) return;

      if (match.winner.id === p1.id) {
        player1Wins++;
      } else if (match.winner.id === p2.id) {
        player2Wins++;
      } else {
        // Check if it's a draw (same score)
        const score = match.score1 && match.score2 ? `${match.score1}-${match.score2}` : undefined;
        if (score) {
          const matchScore = score.match(/(\d+)\s*[-:]\s*(\d+)/);
          if (matchScore && matchScore[1] === matchScore[2]) {
            draws++;
          }
        }
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
        <h2 className="text-2xl font-semibold text-ntu-green">歷史對戰記錄</h2>
        <p className="text-sm text-gray-600 mt-1">查看兩位選手之間的對戰歷史</p>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">選手 1</label>
            <select
              value={selectedPlayer1}
              onChange={(e) => setSelectedPlayer1(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
            >
              <option value="">選擇選手...</option>
              {players.map(player => (
                <option key={player.id} value={player.id}>
                  {player.name} {player.department ? `(${player.department})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">選手 2</label>
            <select
              value={selectedPlayer2}
              onChange={(e) => setSelectedPlayer2(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
            >
              <option value="">選擇選手...</option>
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
              <h3 className="font-semibold text-blue-900 mb-3">對戰總覽</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-700">{headToHead.player1Wins}</div>
                  <div className="text-sm text-blue-600">{headToHead.player1.name} 勝</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-700">{headToHead.draws}</div>
                  <div className="text-sm text-gray-600">平手</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-700">{headToHead.player2Wins}</div>
                  <div className="text-sm text-blue-600">{headToHead.player2.name} 勝</div>
                </div>
              </div>
            </div>

            {/* Match Details */}
            {headToHead.matches.length > 0 ? (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">對戰詳情</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">日期</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">比分</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">獲勝者</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">場地</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {headToHead.matches.map(match => {
                        const matchData = match as any;
                        const score = match.score1 && match.score2 ? `${match.score1}-${match.score2}` : "-";
                        const date = matchData.scheduled_time 
                          ? new Date(matchData.scheduled_time).toLocaleDateString('zh-TW')
                          : "-";
                        
                        return (
                          <tr key={match.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-700">{date}</td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{score}</td>
                            <td className="px-4 py-3 text-sm">
                              {match.winner ? (
                                <span className="font-semibold text-ntu-green">{match.winner.name}</span>
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
                <p>這兩位選手尚未有對戰記錄</p>
              </div>
            )}
          </div>
        )}

        {!headToHead && selectedPlayer1 && selectedPlayer2 && (
          <div className="text-center py-8 text-gray-500">
            <p>請選擇兩位不同的選手查看對戰記錄</p>
          </div>
        )}
      </div>
    </div>
  );
}

