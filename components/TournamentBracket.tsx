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
const MATCH_HEIGHT = 124; // 60px block + 4px gap + 60px block
const BASE_GAP = 40;
const S = MATCH_HEIGHT + BASE_GAP; // 164

const P1_CENTER_Y = 30;
const P2_CENTER_Y = MATCH_HEIGHT - 30; // 94
const VISUAL_CENTER_Y = MATCH_HEIGHT / 2; // 62

const getMarginTop = (roundIndex: number) => roundIndex === 0 ? 0 : (S / 2) * (Math.pow(2, roundIndex) - 1);
const getMarginBottom = (roundIndex: number) => S * Math.pow(2, roundIndex) - MATCH_HEIGHT;
const getConnectorDistance = (roundIndex: number) => S * Math.pow(2, roundIndex - 1) / 2;

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

  // SVG Connector Sub-component
  const Connector = ({ roundIndex, match, prevMatch1, prevMatch2 }: any) => {
    if (roundIndex === 0) return null; // No feeders for round 1
    const D = getConnectorDistance(roundIndex);
    
    return (
      <svg className="absolute pointer-events-none z-0" style={{ left: '-48px', top: '0', width: '48px', height: '1px', overflow: 'visible' }}>
        {prevMatch1 && (() => {
           const endY = -D + VISUAL_CENTER_Y;
           const isHighlighted = !!prevMatch1.winner && !!match?.player1 && prevMatch1.winner.id === match.player1.id;
           const radius = Math.min(12, Math.abs(endY - P1_CENTER_Y) / 2);
           if (Math.abs(endY - P1_CENTER_Y) < 1) return <path d={`M 48 ${P1_CENTER_Y} L 0 ${P1_CENTER_Y}`} className={isHighlighted ? "stroke-ntu-green stroke-[2.5px]" : "stroke-gray-300 stroke-[2px] opacity-70"} fill="none" />;
           const sign = Math.sign(endY - P1_CENTER_Y);
           return <path d={`M 48 ${P1_CENTER_Y} L ${24 + radius} ${P1_CENTER_Y} Q 24 ${P1_CENTER_Y} 24 ${P1_CENTER_Y + sign * radius} L 24 ${endY - sign * radius} Q 24 ${endY} ${24 - radius} ${endY} L 0 ${endY}`} className={isHighlighted ? "stroke-ntu-green stroke-[2.5px]" : "stroke-gray-300 stroke-[2px] opacity-70"} fill="none" />;
        })()}
        {prevMatch2 && (() => {
           const endY = D + VISUAL_CENTER_Y;
           const isHighlighted = !!prevMatch2.winner && !!match?.player2 && prevMatch2.winner.id === match.player2.id;
           const radius = Math.min(12, Math.abs(endY - P2_CENTER_Y) / 2);
           if (Math.abs(endY - P2_CENTER_Y) < 1) return <path d={`M 48 ${P2_CENTER_Y} L 0 ${P2_CENTER_Y}`} className={isHighlighted ? "stroke-ntu-green stroke-[2.5px]" : "stroke-gray-300 stroke-[2px] opacity-70"} fill="none" />;
           const sign = Math.sign(endY - P2_CENTER_Y);
           return <path d={`M 48 ${P2_CENTER_Y} L ${24 + radius} ${P2_CENTER_Y} Q 24 ${P2_CENTER_Y} 24 ${P2_CENTER_Y + sign * radius} L 24 ${endY - sign * radius} Q 24 ${endY} ${24 - radius} ${endY} L 0 ${endY}`} className={isHighlighted ? "stroke-ntu-green stroke-[2.5px]" : "stroke-gray-300 stroke-[2px] opacity-70"} fill="none" />;
        })()}
      </svg>
    );
  };

  // Match Node Sub-component handles exact margin stacking to form the tree
  const MatchNode = ({ match, round, roundIndex, index, forceMobile = false, isThirdPlace = false }: any) => {
    let mt = forceMobile ? 0 : (index === 0 ? getMarginTop(roundIndex) : 0);
    let mb = forceMobile ? 16 : getMarginBottom(roundIndex);

    if (isThirdPlace) {
      mt = forceMobile ? 0 : 48;
      mb = forceMobile ? 16 : 0;
    }

    const prevRoundMatches = roundIndex > 0 ? gridMatches[round - 1] : [];
    const prevMatch1 = prevRoundMatches ? prevRoundMatches[index * 2] : null;
    const prevMatch2 = prevRoundMatches ? prevRoundMatches[index * 2 + 1] : null;

    const player1IsWinner = match && match.winner && match.winner.id === match.player1?.id;
    const player1IsLoser = match && match.winner && match.winner.id !== match.player1?.id;
    const player2IsWinner = match && match.winner && match.winner.id === match.player2?.id;
    const player2IsLoser = match && match.winner && match.winner.id !== match.player2?.id;
    
    const isActualFinalRound = round === actualTotalRounds;

    // Build context strings for Mobile view
    const getContextStr = (prevContextMatch: Match | null | undefined) => {
      if (!forceMobile || !prevContextMatch || isThirdPlace) return undefined;
      
      // If the player has already advanced from that match:
      if (prevContextMatch.winner) {
        // Technically we can figure out who they beat, but simply identifying the match origin is safest
        return `Winner M${prevContextMatch.matchNumber}`;
      }
      return `Waiting M${prevContextMatch.matchNumber}`;
    };

    const p1ContextLabel = getContextStr(prevMatch1);
    const p2ContextLabel = getContextStr(prevMatch2);

    return (
      <div className="relative" style={{ marginTop: `${mt}px`, marginBottom: `${mb}px` }}>
        {/* Draw the backwards-pointing SVG lines */}
        {!isThirdPlace && !forceMobile && (
           <Connector roundIndex={roundIndex} match={match} prevMatch1={prevMatch1} prevMatch2={prevMatch2} />
        )}
        
        {match ? (
          <Link
            id={`match-${match.id}`}
            href={`/sports/${sportName.toLowerCase()}/matches/${match.id}`}
            className="block relative group hover:scale-[1.02] active:scale-95 transition-transform duration-300 z-10 scroll-mt-24 w-max"
          >
            <div className="relative flex flex-col gap-1 w-[150px] md:w-[200px]">
              <PlayerBlock player={match.player1 || null} slot={(match as Match).slot1} isWinner={player1IsWinner} isLoser={player1IsLoser} isThirdPlace={isThirdPlace} textPlaceholder={round === Math.min(...rounds) ? t("bracket.bye") : t("bracket.tbd")} contextLabel={p1ContextLabel} />
              <div className="h-1"></div>
              <PlayerBlock player={match.player2 || null} slot={(match as Match).slot2} isWinner={player2IsWinner} isLoser={player2IsLoser} isThirdPlace={isThirdPlace} textPlaceholder={round === Math.min(...rounds) ? t("bracket.bye") : t("bracket.tbd")} contextLabel={p2ContextLabel} />
              
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
        ) : (
          <div className="flex flex-col gap-1 opacity-40 relative z-10 w-[150px] md:w-[200px]">
             <PlayerBlock player={null} textPlaceholder={round === Math.min(...rounds) ? t("bracket.bye") : t("bracket.tbd")} contextLabel={p1ContextLabel} />
             <div className="h-1"></div>
             <PlayerBlock player={null} textPlaceholder={round === Math.min(...rounds) ? t("bracket.bye") : t("bracket.tbd")} contextLabel={p2ContextLabel} />
          </div>
        )}
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
                 <MatchNode match={match} round={activeTabRound} roundIndex={0} index={i} forceMobile={true} />
              </div>
            ))
          )}
          
          {/* Mobile 3rd Place Match */}
          {activeTabRound === actualTotalRounds && !hideThirdPlace && has3rdPlaceMatch && (
            <div className="w-full max-w-sm mx-auto mt-6 pt-6 border-t border-gray-200 flex justify-center flex-col items-center">
               <h4 className="text-xs uppercase tracking-wider font-bold text-gray-400 mb-4">3rd Place Match</h4>
               <MatchNode match={getThirdPlaceMatch()} round={activeTabRound} roundIndex={0} index={1} forceMobile={true} isThirdPlace={true} />
            </div>
          )}
        </div>
      )}

      {/* Desktop & Full Mobile Flex View */}
      <p className={`${mobileViewMode === "full" ? "block" : "hidden"} md:hidden text-xs text-gray-400 text-center mb-2`}>← {t("bracket.swipeHint")} →</p>
      <div className={`${mobileViewMode === "full" ? "flex" : "hidden md:flex"} gap-12 min-w-max px-4 relative overflow-x-auto pb-6`}>
        {rounds.map((round, roundIndex) => (
          <div key={`col-${round}`} className="flex flex-col relative w-[150px] lg:w-[200px]">
             {/* Header */}
             <div className="mb-8 text-center sticky top-0 bg-white z-20 pb-2 border-b border-gray-200">
                 <h3 className="text-sm lg:text-base font-semibold text-ntu-green">{generateRoundName(round)}</h3>
                 <p className="text-[10px] lg:text-xs text-gray-500 mt-1">{gridMatches[round]?.filter(m=>m).length || 0} matches</p>
             </div>
             {/* Matches logic strictly driven by margin math */}
             <div className="flex-1 relative">
                {gridMatches[round]?.map((match, i) => (
                   <MatchNode key={`d-${round}-${i}`} match={match} round={round} roundIndex={roundIndex} index={i} forceMobile={false} />
                ))}
                
                {/* 3rd place handling cleanly breaks out of the margin math flow */}
                {round === actualTotalRounds && !hideThirdPlace && has3rdPlaceMatch && (
                   <>
                     <div className="w-full flex items-center justify-center gap-2 mt-8 mb-4">
                        <hr className="flex-1 border-gray-200" /><span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold whitespace-nowrap">3rd Place</span><hr className="flex-1 border-gray-200" />
                     </div>
                     <MatchNode match={getThirdPlaceMatch()} round={round} roundIndex={roundIndex} index={1} forceMobile={false} isThirdPlace={true} />
                   </>
                )}
             </div>
          </div>
        ))}
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
