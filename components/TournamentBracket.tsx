"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { Player, Match, SlotPlaceholder } from "@/types/tournament";
import { useI18n } from "@/lib/i18n/context";

interface TournamentBracketProps {
  matches: Match[];
  players: Player[];
  sportName?: string;
  totalRounds?: number; // Total rounds in the entire tournament (not just this section)
  hideThirdPlace?: boolean; // Hide the 3rd place match display
  compactLayout?: boolean; // Not strictly used with the new tree architect, but keeping for prop compat
}

// --- Configuration Constants ---
// Math-based absolute margins are removed in V3. We use pure nested flexbox alignment.

export default function TournamentBracket({
  matches,
  players,
  sportName = "Tennis",
  totalRounds: propTotalRounds,
  hideThirdPlace = false,
  compactLayout = false,
}: TournamentBracketProps) {
  const { t } = useI18n();
  const maxRound = Math.max(...matches.map(m => m.round), 1);
  const uniqueRounds = [...new Set(matches.map(m => m.round))].sort((a, b) => a - b);
  const rounds = uniqueRounds.length > 0 ? uniqueRounds : Array.from({ length: maxRound }, (_, i) => i + 1);
  
  const firstRoundMatches = matches.filter(m => m.round === Math.min(...rounds)).length;
  // Estimate draw size using power of 2
  const bracketSize = Math.max(2, Math.pow(2, Math.ceil(Math.log2(firstRoundMatches * 2))));
  const totalPlayers = players.length;
  const numSeeds = players.filter(p => p.seed).length;

  const actualTotalRounds = propTotalRounds || maxRound;
  const has3rdPlaceMatch = matches.some(m => m.round === actualTotalRounds && m.matchNumber === 2);
  const getThirdPlaceMatch = () => matches.find(m => m.round === actualTotalRounds && m.matchNumber === 2);

  const generateRoundName = (round: number): string => {
    if (round === actualTotalRounds) return t("bracket.final");
    if (round === actualTotalRounds - 1) return t("bracket.semifinals");
    if (round === actualTotalRounds - 2) return t("bracket.quarterfinals");
    const playersInRound = Math.pow(2, actualTotalRounds - round + 1);
    return t("bracket.roundOf").replace("{n}", String(playersInRound));
  };

  // Normalize the bracket so we don't drop empty slots (which would break tree margin alignments)
  const gridMatches = useMemo(() => {
    const grid: Record<number, (Match | null)[]> = {};
    rounds.forEach(round => {
      const matchCountInRound = Math.pow(2, actualTotalRounds - round);
      grid[round] = Array.from({ length: matchCountInRound }).map((_, i) => {
        return matches.find(m => m.round === round && m.matchNumber === i + 1) || null;
      });
    });
    return grid;
  }, [matches, actualTotalRounds, rounds]);

  const [activeTabRound, setActiveTabRound] = useState<number>(rounds[0]);
  const [mobileViewMode, setMobileViewMode] = useState<"full" | "tabs">("full");

  // Player Block Sub-component
  const PlayerBlock = ({ 
    player, slot, isWinner, isLoser, isThirdPlace = false, textPlaceholder, contextLabel 
  }: { 
    player: Player | null; slot?: SlotPlaceholder | null; isWinner?: boolean; isLoser?: boolean; isThirdPlace?: boolean; textPlaceholder: string; contextLabel?: string 
  }) => {
    const isBye = !player && !slot && textPlaceholder === t("bracket.bye");
    const displayText = player?.name || (slot ? `Seed ${slot.seed} Group ${slot.group}` : textPlaceholder);
    
    return (
      <div
        className={`rounded-lg border-2 shadow-sm p-2 md:p-3 w-[150px] md:w-[200px] h-[60px] transition-all duration-300 relative ${
          isBye ? "border-gray-200 bg-gray-50"
          : isWinner
            ? isThirdPlace ? "border-amber-500 bg-amber-50 z-10" : "border-ntu-green bg-ntu-green border-opacity-30 bg-opacity-10 z-10"
            : isLoser
              ? "border-gray-300 bg-gray-100 opacity-50"
              : isThirdPlace ? "border-amber-400 bg-amber-50" : "border-gray-300 bg-white"
        }`}
      >
        <div className="flex items-center gap-1.5 md:gap-2 h-full">
          {player?.seed && (
            <span className="text-[10px] md:text-xs font-bold text-white bg-ntu-green px-1.5 py-0.5 rounded flex-shrink-0">
              {player.seed}
            </span>
          )}
          <div className="flex-1 min-w-0">
            <div className={`text-xs md:text-sm font-medium truncate leading-tight ${isBye ? 'text-gray-400 italic' : ''}`}>
              {displayText}
            </div>
            {player?.school && (
              <div className="text-[10px] text-gray-500 truncate mt-0.5 leading-tight">
                {player.school}
              </div>
            )}
            {contextLabel && (
              <div className="text-[9px] text-gray-400 truncate leading-tight">
                {contextLabel}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // The pure visual block for a Match (used by both Mobile Tabs and the Recursive Tree)
  const MatchCard = ({ match, round, index, isThirdPlace = false, forceMobile = false }: any) => {
    const prevRoundMatches = round > Math.min(...rounds) ? gridMatches[round - 1] : [];
    const prevMatch1 = prevRoundMatches ? prevRoundMatches[index * 2] : null;
    const prevMatch2 = prevRoundMatches ? prevRoundMatches[index * 2 + 1] : null;

    const player1IsWinner = match && match.winner && match.winner.id === match.player1?.id;
    const player1IsLoser = match && match.winner && match.winner.id !== match.player1?.id;
    const player2IsWinner = match && match.winner && match.winner.id === match.player2?.id;
    const player2IsLoser = match && match.winner && match.winner.id !== match.player2?.id;
    
    const isActualFinalRound = round === actualTotalRounds;

    const getContextStr = (prevContextMatch: Match | null | undefined) => {
      if (!forceMobile || !prevContextMatch || isThirdPlace) return undefined;
      if (prevContextMatch.winner) return `Winner M${prevContextMatch.matchNumber}`;
      return `Waiting M${prevContextMatch.matchNumber}`;
    };

    const p1ContextLabel = getContextStr(prevMatch1);
    const p2ContextLabel = getContextStr(prevMatch2);

    if (!match) {
      return (
        <div className="flex flex-col gap-1 opacity-40 relative z-10 w-[150px] md:w-[200px]">
           <PlayerBlock player={null} textPlaceholder={round === Math.min(...rounds) ? t("bracket.bye") : t("bracket.tbd")} contextLabel={p1ContextLabel} />
           <div className="h-1"></div>
           <PlayerBlock player={null} textPlaceholder={round === Math.min(...rounds) ? t("bracket.bye") : t("bracket.tbd")} contextLabel={p2ContextLabel} />
        </div>
      );
    }

    return (
      <Link
        id={`match-${match.id}`}
        href={`/sports/${sportName.toLowerCase()}/matches/${match.id}`}
        className="block relative group hover:scale-[1.02] active:scale-95 transition-transform duration-300 z-10 scroll-mt-24 w-max"
      >
        <div className="relative flex flex-col gap-1 w-[150px] md:w-[200px]">
          <PlayerBlock player={match.player1 || null} slot={match.slot1} isWinner={player1IsWinner} isLoser={player1IsLoser} isThirdPlace={isThirdPlace} textPlaceholder={round === Math.min(...rounds) ? t("bracket.bye") : t("bracket.tbd")} contextLabel={p1ContextLabel} />
          <div className="h-1"></div>
          <PlayerBlock player={match.player2 || null} slot={match.slot2} isWinner={player2IsWinner} isLoser={player2IsLoser} isThirdPlace={isThirdPlace} textPlaceholder={round === Math.min(...rounds) ? t("bracket.bye") : t("bracket.tbd")} contextLabel={p2ContextLabel} />
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
             {match.status === "completed" && match.score ? (
                <div className={`bg-white border-2 rounded-lg px-2 py-1 shadow-md ${isThirdPlace ? 'border-amber-500 text-amber-600' : isActualFinalRound && !isThirdPlace ? 'border-yellow-500 text-yellow-600' : 'border-ntu-green text-ntu-green'}`}>
                   <div className="text-[10px] md:text-xs font-bold whitespace-nowrap">{match.score}</div>
                </div>
             ) : (
                <div className={`rounded-full w-6 h-6 md:w-8 md:h-8 flex items-center justify-center shadow-sm transition-all duration-300 ${isThirdPlace ? 'bg-amber-500 border-2 border-amber-600 text-white' : isActualFinalRound && !isThirdPlace ? 'bg-yellow-500 border-2 border-yellow-600 text-white' : match.status === 'live' ? 'bg-red-500 border-2 border-red-600 text-white animate-pulse' : match.status === 'delayed' ? 'bg-amber-100 border-2 border-amber-400 text-amber-700 animate-pulse' : 'bg-white border-2 border-gray-300 text-gray-500'}`}>
                   <span className="text-[10px] md:text-xs font-bold">{isThirdPlace ? '🥉' : isActualFinalRound && !isThirdPlace ? '🏆' : 'VS'}</span>
                </div>
             )}
          </div>
        </div>
      </Link>
    );
  };

  // Pure Flexbox Recursive Tree Renderer 
  // It guarantees perfect CSS alignment by nesting the branches without absolute margin math.
  const RecursiveMatchTree = ({ match, round, index, isThirdPlace = false }: any) => {
    const hasFeeders = round > Math.min(...rounds);
    const prevMatch1 = hasFeeders ? gridMatches[round - 1]?.[index * 2] || null : null;
    const prevMatch2 = hasFeeders ? gridMatches[round - 1]?.[index * 2 + 1] || null : null;

    const isWinner1 = !!(prevMatch1?.winner && match?.player1 && prevMatch1.winner.id === match.player1.id);
    const isWinner2 = !!(prevMatch2?.winner && match?.player2 && prevMatch2.winner.id === match.player2.id);
    const tieLineLit = isWinner1 || isWinner2;

    return (
      <div className="flex items-center">
        {hasFeeders && !isThirdPlace && (
          <>
            <div className="flex flex-col justify-center relative">
               <div className="relative flex items-center">
                  <RecursiveMatchTree match={prevMatch1} round={round - 1} index={index * 2} />
                  {/* Top Feeder Curve Connector */}
                  <div className={`absolute right-[-24px] top-1/2 bottom-0 w-[24px] border-r-2 border-t-2 rounded-tr-[12px] opacity-70 ${isWinner1 ? 'border-ntu-green opacity-100 z-10' : 'border-gray-300'} pointer-events-none`}></div>
               </div>
               <div className="relative flex items-center">
                  <RecursiveMatchTree match={prevMatch2} round={round - 1} index={index * 2 + 1} />
                  {/* Bottom Feeder Curve Connector */}
                  <div className={`absolute right-[-24px] top-0 bottom-1/2 w-[24px] border-r-2 border-b-2 rounded-br-[12px] opacity-70 ${isWinner2 ? 'border-ntu-green opacity-100 z-10' : 'border-gray-300'} pointer-events-none`}></div>
               </div>
            </div>
            
            {/* Horizontal Tie Line linking the joined curves to the parent node */}
            <div className={`w-[24px] shrink-0 border-t-2 opacity-70 ${tieLineLit ? 'border-ntu-green opacity-100 z-10' : 'border-gray-300'} pointer-events-none ml-[24px]`}></div>
          </>
        )}

        {/* The Card wrapper handles the vertical spacing between matchups natively using simple padding */}
        <div className="py-3 md:py-4 relative z-20 shrink-0">
           <MatchCard match={match} round={round} index={index} isThirdPlace={isThirdPlace} forceMobile={false} />
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-4 md:p-6 border border-gray-100 w-full overflow-hidden">
      <div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-end gap-2">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold text-ntu-green mb-1 md:mb-2">{sportName} Tournament Bracket</h2>
          <p className="text-xs md:text-sm text-gray-600">Single Elimination • {totalPlayers} Players • {bracketSize}-Draw • {numSeeds} Seeds • {maxRound} Rounds</p>
        </div>

        {/* Mobile View Toggle */}
        <div className="md:hidden flex bg-gray-100 p-1 rounded-lg w-full max-w-sm self-center mt-2">
          <button
            onClick={() => setMobileViewMode("full")}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-md text-sm font-medium transition-all ${
              mobileViewMode === "full" ? "bg-white shadow-sm text-ntu-green" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <span>🌳</span> {t("bracket.fullBracket")}
          </button>
          <button
            onClick={() => setMobileViewMode("tabs")}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-md text-sm font-medium transition-all ${
              mobileViewMode === "tabs" ? "bg-white shadow-sm text-ntu-green" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <span>🗂️</span> {t("bracket.roundView")}
          </button>
        </div>
      </div>

      {/* Mobile Tabs */}
      {mobileViewMode === "tabs" && (
        <div className="md:hidden flex overflow-x-auto gap-2 mb-6 pb-2 border-b">
          {rounds.map(r => (
            <button 
              key={`tab-${r}`}
              onClick={() => setActiveTabRound(r)}
              className={`px-4 py-2 whitespace-nowrap text-sm font-semibold border-b-2 transition-colors ${activeTabRound === r ? 'border-ntu-green text-ntu-green' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {generateRoundName(r)}
            </button>
          ))}
        </div>
      )}

      {/* Mobile View */}
      {mobileViewMode === "tabs" && (
        <div className="md:hidden flex flex-col gap-4">
          {gridMatches[activeTabRound]?.filter(m => m !== null).length === 0 ? (
             <p className="text-gray-400 text-center italic py-8 text-sm">No matches available in this round yet.</p>
          ) : (
            gridMatches[activeTabRound]?.filter(m => m !== null).map((match, i) => (
              <div key={`mobile-${match?.id || i}`} className="w-full max-w-sm mx-auto flex justify-center">
                 <MatchCard match={match} round={activeTabRound} index={i} forceMobile={true} />
              </div>
            ))
          )}
          
          {/* Mobile 3rd Place Match */}
          {activeTabRound === actualTotalRounds && !hideThirdPlace && has3rdPlaceMatch && (
            <div className="w-full max-w-sm mx-auto mt-6 pt-6 border-t border-gray-200 flex justify-center flex-col items-center">
               <h4 className="text-xs uppercase tracking-wider font-bold text-gray-400 mb-4">3rd Place Match</h4>
               <MatchCard match={getThirdPlaceMatch()} round={activeTabRound} index={1} forceMobile={true} isThirdPlace={true} />
            </div>
          )}
        </div>
      )}

      {/* Desktop & Full Mobile Flex View */}
      <p className={`${mobileViewMode === "full" ? "block" : "hidden"} md:hidden text-xs text-gray-400 text-center mb-2`}>← {t("bracket.swipeHint")} →</p>
      
      <div className={`${mobileViewMode === "full" ? "block" : "hidden md:block"} w-full overflow-x-auto overflow-y-hidden pb-6 relative`}>
        <div 
          className="px-4 pt-2 mx-auto" 
          style={{ minWidth: `calc(${rounds.length} * 150px + ${Math.max(0, rounds.length - 1)} * 48px)`, width: "max-content" }}
        >
          
          {/* Flex Column Headers */}
          <div className="flex sticky top-0 bg-white z-30 pb-2 mb-4 border-b border-gray-200 w-full" style={{ gap: '48px' }}>
            {rounds.map(round => (
              <div key={`header-${round}`} className="w-[150px] md:w-[200px] shrink-0 text-center">
                 <h3 className="text-sm md:text-base font-semibold text-ntu-green">{generateRoundName(round)}</h3>
                 <p className="text-[10px] md:text-xs text-gray-500 mt-1">{gridMatches[round]?.filter(m => m !== null).length || 0} matches</p>
              </div>
            ))}
          </div>

          {/* The Recursive Bracket Tree */}
          {/* We start the recursion at the final round (the right-most column). The branches will build leftwards. */}
          <div className="flex">
            <div className="flex flex-col justify-center gap-12 w-[150px] md:w-[200px]">
               {gridMatches[rounds[rounds.length - 1]]?.map((match, i) => (
                  <RecursiveMatchTree key={`root-${i}`} match={match} round={rounds[rounds.length - 1]} index={i} />
               ))}
            </div>
          </div>
          
          {/* 3rd Place Match Positioned Under the Final Column */}
          {rounds.includes(actualTotalRounds) && !hideThirdPlace && has3rdPlaceMatch && (
            <div className="flex mt-12 pt-8 border-t border-gray-200 relative w-full">
               <div style={{ width: `calc((150px * ${rounds.length - 1}) + (48px * ${rounds.length - 1}))` }} className="md:hidden shrink-0"></div>
               <div style={{ width: `calc((200px * ${rounds.length - 1}) + (48px * ${rounds.length - 1}))` }} className="hidden md:block shrink-0"></div>
               
               <div className="w-[150px] md:w-[200px] shrink-0 flex flex-col items-center">
                  <h4 className="text-xs uppercase tracking-wider font-bold text-gray-400 mb-4 whitespace-nowrap">3rd Place Match</h4>
                  <MatchCard match={getThirdPlaceMatch()} round={actualTotalRounds} index={1} isThirdPlace={true} />
               </div>
            </div>
          )}
          
        </div>
      </div>

      {/* Legend */}
      <div className="mt-8 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Legend</h4>
        <div className="flex flex-wrap gap-4 md:gap-6 text-xs md:text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 md:w-4 md:h-4 border-2 border-ntu-green rounded bg-ntu-green bg-opacity-10"></div>
            <span className="text-gray-600">Winner</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 md:w-4 md:h-4 border-2 border-gray-300 rounded bg-gray-100 opacity-50"></div>
            <span className="text-gray-600">Eliminated</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 md:w-8 md:h-8 bg-amber-100 border-2 border-amber-400 rounded-full"></div>
            <span className="text-gray-600">Delayed</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] md:text-xs font-bold text-white bg-ntu-green px-1.5 py-0.5 rounded">1</span>
            <span className="text-gray-600">Seed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="border-2 border-ntu-green rounded px-2 py-0.5 md:py-1 bg-white">
              <span className="text-ntu-green text-[10px] font-bold">6-4, 6-2</span>
            </div>
            <span className="text-gray-600">Score</span>
          </div>
        </div>
      </div>
    </div>
  );
}
