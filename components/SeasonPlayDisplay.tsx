"use client";

import { Match, Player } from "@/types/tournament";
import { useState } from "react";
import TournamentBracket from "./TournamentBracket";

interface SeasonPlayDisplayProps {
  matches: Match[];
  players: Player[];
  sportName?: string;
}

export default function SeasonPlayDisplay({ matches, players, sportName = "Tennis" }: SeasonPlayDisplayProps) {
  const [view, setView] = useState<"regular" | "playoffs" | "standings">("regular");

  // Separate regular season (round 0) and playoff matches (round >= 1)
  const regularSeasonMatches = matches.filter(m => m.round === 0).sort((a, b) => a.matchNumber - b.matchNumber);
  const playoffMatches = matches.filter(m => m.round >= 1);
  
  const hasRegularSeason = regularSeasonMatches.length > 0;
  const hasPlayoffs = playoffMatches.length > 0;

  // Calculate standings from regular season
  const calculateStandings = () => {
    const standings: { [playerId: string]: { player: Player; wins: number; losses: number; points: number } } = {};
    
    players.forEach(player => {
      standings[player.id] = { player, wins: 0, losses: 0, points: 0 };
    });

    regularSeasonMatches.forEach((match) => {
      if (match.status === 'completed' && match.winner) {
        const winnerId = match.winner.id;
        const loserId = match.player1?.id === winnerId ? match.player2?.id : match.player1?.id;
        
        if (winnerId && standings[winnerId]) {
          standings[winnerId].wins++;
          standings[winnerId].points += 3; // 3 points for a win
        }
        
        if (loserId && standings[loserId]) {
          standings[loserId].losses++;
        }
      }
    });

    return Object.values(standings).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return a.losses - b.losses;
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
          {hasRegularSeason && (
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
          {hasRegularSeason && (
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
          {hasPlayoffs && (
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
            <p className="text-sm text-blue-800">
              <strong>Regular Season Progress:</strong> {completedRegularMatches} / {totalRegularMatches} matches completed
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-ntu-green text-white">
                  <tr>
                    <th className="px-4 py-3 text-left">Match #</th>
                    <th className="px-4 py-3 text-left">Player 1</th>
                    <th className="px-4 py-3 text-center">VS</th>
                    <th className="px-4 py-3 text-left">Player 2</th>
                    <th className="px-4 py-3 text-center">Score</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {regularSeasonMatches.map((match, idx) => (
                    <tr key={match.id} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="px-4 py-3 font-semibold text-gray-700">#{match.matchNumber}</td>
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
                  ))}
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
            <p className="text-sm text-blue-800">
              <strong>Standings:</strong> Based on regular season results (3 points per win)
            </p>
          </div>

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
                  </tr>
                </thead>
                <tbody>
                  {standings.map((standing, idx) => (
                    <tr 
                      key={standing.player.id} 
                      className={`${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'} ${idx < 4 ? 'border-l-4 border-yellow-400' : ''}`}
                    >
                      <td className="px-4 py-3 text-center font-bold text-gray-700">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {idx < 4 && <span className="text-yellow-500">🏆</span>}
                          <span className="font-semibold">{standing.player.name}</span>
                          {standing.player.seed && (
                            <span className="text-xs text-gray-500">(Seed {standing.player.seed})</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-green-600">{standing.wins}</td>
                      <td className="px-4 py-3 text-center font-semibold text-red-600">{standing.losses}</td>
                      <td className="px-4 py-3 text-center font-bold text-ntu-green">{standing.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

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

