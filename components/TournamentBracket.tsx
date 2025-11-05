"use client";

import { Player, Match } from "@/types/tournament";

interface TournamentBracketProps {
  matches: Match[];
  players: Player[];
  sportName?: string;
  totalRounds?: number; // Total rounds in the entire tournament (not just this section)
  hideThirdPlace?: boolean; // Hide the 3rd place match display
  compactLayout?: boolean; // Use compact sequential layout instead of centered positioning
}

export default function TournamentBracket({
  matches,
  players,
  sportName = "Tennis",
  totalRounds: propTotalRounds,
  hideThirdPlace = false,
  compactLayout = false,
}: TournamentBracketProps) {
  // Calculate dynamic values based on actual data
  const maxRound = Math.max(...matches.map(m => m.round), 1);
  
  // Get unique rounds that actually have matches (instead of showing all rounds from 1 to maxRound)
  const uniqueRounds = [...new Set(matches.map(m => m.round))].sort((a, b) => a - b);
  const rounds = uniqueRounds.length > 0 ? uniqueRounds : Array.from({ length: maxRound }, (_, i) => i + 1);
  
  const firstRoundMatches = matches.filter(m => m.round === 1).length;
  const bracketSize = firstRoundMatches * 2;
  const totalPlayers = players.length;
  const numSeeds = players.filter(p => p.seed).length;

  // Use propTotalRounds if provided, otherwise calculate from matches
  const actualTotalRounds = propTotalRounds || maxRound;
  
  // Check if there's a 3rd place match (match_number = 2 in the ACTUAL final round of the entire tournament)
  // Only check for 3rd place if we're showing the actual final round
  const has3rdPlaceMatch = matches.some(m => m.round === actualTotalRounds && m.matchNumber === 2);


  // Generate round names dynamically
  const generateRoundName = (round: number): string => {
    if (round === actualTotalRounds) return "Final";
    if (round === actualTotalRounds - 1) return "Semifinals";
    if (round === actualTotalRounds - 2) return "Quarterfinals";
    
    // Calculate number of players in this round
    // Round 1 has 2^actualTotalRounds players, Round 2 has 2^(actualTotalRounds-1) players, etc.
    const playersInRound = Math.pow(2, actualTotalRounds - round + 1);
    return `Round of ${playersInRound}`;
  };

  const roundNames = rounds.map(r => generateRoundName(r));

  const getMatchesForRound = (round: number) => {
    // For ACTUAL final round with 3rd place match, only show match #1 (the final)
    // Only apply this filter if we're looking at the actual final round of the entire tournament
    if (round === actualTotalRounds && has3rdPlaceMatch) {
      return matches
        .filter((m) => m.round === round && m.matchNumber === 1)
        .sort((a, b) => a.matchNumber - b.matchNumber);
    }
    return matches
      .filter((m) => m.round === round)
      .sort((a, b) => a.matchNumber - b.matchNumber);
  };
  
  const getThirdPlaceMatch = () => {
    return matches.find(m => m.round === maxRound && m.matchNumber === 2);
  };

  // Constants for sizing
  const blockHeight = 60;
  const blockSpacing = 2; // Reduced spacing between players in same match
  const vsHeight = 12; // Reduced VS label height
  const matchHeight = blockHeight * 2 + blockSpacing + vsHeight;
  const spacing = 8; // Spacing between different matches
  const matchWidth = 180; // Width of match blocks
  const roundGap = 12 * 16; // Gap between rounds (12rem = 192px)

  // Calculate vertical position for matches
  // Each match should be centered between the two feeding matches from previous round
  const calculateMatchPosition = (round: number, matchNumber: number): number => {
    // For compact layout: first round uses sequential positioning, later rounds use centered positioning
    const firstRoundInBracket = Math.min(...rounds);
    
    if (compactLayout && round === firstRoundInBracket) {
      return (matchNumber - 1) * (matchHeight + spacing);
    }
    
    // Special case: ACTUAL Final round (not just last round in bracket) should align with previous round
    // Only apply this if we're showing the actual final round of the entire tournament
    if (round === actualTotalRounds) {
      const prevRoundMatches = getMatchesForRound(round - 1);
      
      // For the final round, we want to align with the previous round directly
      // Match 1 (Final) aligns with SF Match 1
      // Match 2 (3rd Place, if exists) aligns with SF Match 2
      if (prevRoundMatches.length >= matchNumber) {
        // Get the corresponding match from the previous round
        const prevMatch = prevRoundMatches.sort((a, b) => a.matchNumber - b.matchNumber)[matchNumber - 1];
        if (prevMatch) {
          return calculateMatchPosition(round - 1, prevMatch.matchNumber);
        }
      }
    }
    
    // For standard layout or later rounds in compact mode, use centered positioning
    if (round === firstRoundInBracket && !compactLayout) {
      return (matchNumber - 1) * (matchHeight + spacing);
    } else {
      // Find actual previous round matches that exist
      const prevRoundMatches = getMatchesForRound(round - 1);
      
      // For this match, we need to find the two previous matches that feed into it
      const prevMatch1Num = (matchNumber - 1) * 2 + 1;
      const prevMatch2Num = (matchNumber - 1) * 2 + 2;
      
      const prevMatch1 = prevRoundMatches.find(m => m.matchNumber === prevMatch1Num);
      const prevMatch2 = prevRoundMatches.find(m => m.matchNumber === prevMatch2Num);
      
      if (prevMatch1 && prevMatch2) {
        const pos1 = calculateMatchPosition(round - 1, prevMatch1.matchNumber);
        const pos2 = calculateMatchPosition(round - 1, prevMatch2.matchNumber);
        
        const center1 = pos1 + matchHeight / 2;
        const center2 = pos2 + matchHeight / 2;
        const middlePoint = (center1 + center2) / 2;
        return middlePoint - matchHeight / 2;
      } else if (prevMatch1) {
        const pos1 = calculateMatchPosition(round - 1, prevMatch1.matchNumber);
        return pos1 + (matchHeight + spacing);
      } else if (prevMatch2) {
        const pos2 = calculateMatchPosition(round - 1, prevMatch2.matchNumber);
        return pos2 + (matchHeight + spacing);
      } else {
        // If no previous matches found, use sequential positioning
        return (matchNumber - 1) * (matchHeight + spacing) * Math.pow(2, round - 1);
      }
    }
  };


  // Player Block Component - individual player representation
  const PlayerBlock = ({ 
    player, 
    isWinner, 
    isLoser,
    position,
    matchId,
    round,
  }: { 
    player: Player | null; 
    isWinner?: boolean;
    isLoser?: boolean;
    position: "top" | "bottom";
    matchId: string;
    round: number;
  }) => {
    // Determine display text
    const displayText = player?.name || (round === 1 ? "BYE" : "TBD");
    const isBye = !player && round === 1;
    
    return (
      <div
        className={`rounded-lg border-2 shadow-sm p-3 w-[200px] transition-all duration-500 ${
          isBye
            ? "border-gray-200 bg-gray-50"
            : isWinner
            ? "border-ntu-green bg-ntu-green bg-opacity-10 scale-105"
            : isLoser
            ? "border-gray-300 bg-gray-100 opacity-50 scale-95"
            : "border-gray-300 bg-white"
        } ${isWinner ? "animate-pulse" : ""}`}
        style={{
          animation: isWinner ? "winnerAdvance 0.8s ease-out" : isLoser ? "loserFade 0.8s ease-out" : "none",
          height: `${blockHeight}px`,
        }}
      >
        <div className="flex items-center gap-2 h-full">
          {player?.seed && (
            <span className="text-xs font-bold text-white bg-ntu-green px-1.5 py-0.5 rounded flex-shrink-0">
              {player.seed}
            </span>
          )}
          <div className="flex-1 min-w-0">
            <div className={`text-sm font-medium truncate leading-tight ${isBye ? 'text-gray-400 italic' : ''}`}>
              {displayText}
            </div>
            {player?.school && (
              <div className="text-xs text-gray-500 truncate mt-0.5 leading-tight">
                {player.school}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <style jsx>{`
        @keyframes winnerAdvance {
          0% {
            transform: scale(1);
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          50% {
            transform: scale(1.05) translateY(-2px);
            box-shadow: 0 8px 12px rgba(0, 105, 78, 0.3);
          }
          100% {
            transform: scale(1.05);
            box-shadow: 0 4px 6px rgba(0, 105, 78, 0.2);
          }
        }
        
        @keyframes loserFade {
          0% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0.5;
            transform: scale(0.95);
          }
        }
      `}</style>
      
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-ntu-green mb-2">
            {sportName} Tournament Bracket
          </h2>
          <p className="text-sm text-gray-600">
            Single Elimination • {totalPlayers} Players • {bracketSize}-Draw • {numSeeds} Seeds • {maxRound} Rounds
          </p>
        </div>

        <div className="overflow-x-auto pb-6">
          <div className="flex gap-12 min-w-max px-4 relative">
            {rounds.map((round, roundIndex) => {
              const roundMatches = getMatchesForRound(round);

              return (
                <div key={round} className="flex flex-col relative">
                  {/* Round Header */}
                  <div className="mb-4 text-center sticky top-0 bg-white z-10 pb-2 border-b border-gray-200 w-[200px]">
                    <h3 className="text-base font-semibold text-ntu-green">
                      {roundNames[roundIndex]}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {roundMatches.length} {roundMatches.length === 1 ? "match" : "matches"}
                    </p>
                  </div>

                  {/* Matches Container */}
                  <div 
                    className="relative pt-4"
                    style={{ 
                      minHeight: roundMatches.length > 0 
                        ? `${Math.max(...roundMatches.map(m => 
                            calculateMatchPosition(round, m.matchNumber) + matchHeight
                          )) + 100}px`
                        : '200px'
                    }}
                  >
                    {roundMatches.map((match) => {
                      const matchPosition = calculateMatchPosition(round, match.matchNumber);

                      // Determine winner/loser status
                      const player1IsWinner = match.winner?.id === match.player1?.id;
                      const player1IsLoser = match.winner && match.winner.id !== match.player1?.id;
                      const player2IsWinner = match.winner?.id === match.player2?.id;
                      const player2IsLoser = match.winner && match.winner.id !== match.player2?.id;

                      return (
                        <div
                          key={match.id}
                          className="absolute"
                          style={{ top: `${matchPosition}px` }}
                        >
                          <div className="relative flex flex-col gap-1">
                            {/* Player 1 Block */}
                            <PlayerBlock
                              player={match.player1 || null}
                              isWinner={player1IsWinner || undefined}
                              isLoser={player1IsLoser || undefined}
                              position="top"
                              matchId={match.id}
                              round={round}
                            />
                            
                            {/* Spacing */}
                            <div className="h-1"></div>
                            
                            {/* Player 2 Block */}
                            <PlayerBlock
                              player={match.player2 || null}
                              isWinner={player2IsWinner || undefined}
                              isLoser={player2IsLoser || undefined}
                              position="bottom"
                              matchId={match.id}
                              round={round}
                            />
                            
                            {/* VS Label / Score Display - Overlapping */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                              {match.status === "completed" && match.score ? (
                                <div className="bg-white border-2 border-ntu-green rounded-lg px-3 py-2 shadow-lg">
                                  <div className="text-sm font-bold text-ntu-green whitespace-nowrap">
                                    {match.score}
                                  </div>
                                </div>
                              ) : (
                                <div className={`rounded-full w-12 h-12 flex items-center justify-center shadow-md transition-all duration-300 ${
                                  match.status === 'live' 
                                    ? 'bg-red-500 border-2 border-red-600 animate-pulse' 
                                    : 'bg-white border-2 border-gray-300'
                                }`}>
                                  <span className={`text-lg font-bold ${
                                    match.status === 'live' ? 'text-white' : 'text-gray-600'
                                  }`}>
                                    VS
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            
            {/* 3rd Place Match (if exists and not hidden) */}
            {!hideThirdPlace && has3rdPlaceMatch && (() => {
              const thirdPlaceMatch = getThirdPlaceMatch();
              if (!thirdPlaceMatch) return null;

              const player1IsWinner = thirdPlaceMatch.winner?.id === thirdPlaceMatch.player1?.id;
              const player1IsLoser = thirdPlaceMatch.winner && thirdPlaceMatch.winner.id !== thirdPlaceMatch.player1?.id;
              const player2IsWinner = thirdPlaceMatch.winner?.id === thirdPlaceMatch.player2?.id;
              const player2IsLoser = thirdPlaceMatch.winner && thirdPlaceMatch.winner.id !== thirdPlaceMatch.player2?.id;

              return (
                <div className="flex flex-col relative border-l-2 border-dashed border-amber-400 pl-12">
                  {/* 3rd Place Header */}
                  <div className="mb-4 text-center sticky top-0 bg-white z-10 pb-2 border-b border-gray-200 w-[200px]">
                    <h3 className="text-base font-semibold text-amber-600">
                      🥉 3rd Place
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Bronze Medal Match
                    </p>
                  </div>

                  {/* 3rd Place Match */}
                  <div className="relative pt-4">
                    <div className="relative flex flex-col gap-1">
                      {/* Player 1 Block */}
                      <PlayerBlock
                        player={thirdPlaceMatch.player1 || null}
                        isWinner={player1IsWinner || undefined}
                        isLoser={player1IsLoser || undefined}
                        position="top"
                        matchId={thirdPlaceMatch.id}
                        round={thirdPlaceMatch.round}
                      />
                      
                      {/* Spacing */}
                      <div className="h-1"></div>
                      
                      {/* Player 2 Block */}
                      <PlayerBlock
                        player={thirdPlaceMatch.player2 || null}
                        isWinner={player2IsWinner || undefined}
                        isLoser={player2IsLoser || undefined}
                        position="bottom"
                        matchId={thirdPlaceMatch.id}
                        round={thirdPlaceMatch.round}
                      />
                      
                      {/* VS Label / Score Display - Overlapping */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                        {thirdPlaceMatch.status === "completed" && thirdPlaceMatch.score ? (
                          <div className="bg-white border-2 border-amber-500 rounded-lg px-3 py-2 shadow-lg">
                            <div className="text-sm font-bold text-amber-600 whitespace-nowrap">
                              {thirdPlaceMatch.score}
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-full w-12 h-12 flex items-center justify-center shadow-md bg-amber-500 border-2 border-amber-600">
                            <span className="text-lg font-bold text-white">
                              🥉
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-8 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Legend</h4>
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-ntu-green rounded bg-ntu-green bg-opacity-10"></div>
              <span className="text-gray-600">Winner (Advancing)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-gray-300 rounded bg-gray-100 opacity-50"></div>
              <span className="text-gray-600">Loser (Eliminated)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white bg-ntu-green px-1.5 py-0.5 rounded">
                1
              </span>
              <span className="text-gray-600">Seed Number</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="border-2 border-ntu-green rounded px-2 py-1 bg-white">
                <span className="text-ntu-green text-[10px] font-bold">6-4, 6-2</span>
              </div>
              <span className="text-gray-600">Final Score</span>
            </div>
            {has3rdPlaceMatch && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">🥉</span>
                </div>
                <span className="text-gray-600">3rd Place Match</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
