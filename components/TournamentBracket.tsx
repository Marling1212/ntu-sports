"use client";

import Link from "next/link";
import { useState, useMemo, useRef, useLayoutEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Player, Match, SlotPlaceholder } from "@/types/tournament";
import { useI18n } from "@/lib/i18n/context";
import { getCourtDisplay } from "@/lib/utils/getCourtDisplay";

interface TournamentBracketProps {
  matches: Match[];
  players: Player[];
  sportName?: string;
  totalRounds?: number; // Total rounds in the entire tournament (not just this section)
  hideThirdPlace?: boolean; // Hide the 3rd place match display
  compactLayout?: boolean; // Not strictly used with the new tree architect, but keeping for prop compat
  /** Admin-only: first-round cells show check-in toggle; match cards are not links to the public site. */
  adminCheckIn?: {
    checkedInByPlayerId: Record<string, boolean>;
    onToggleCheckIn: (player: Player) => void;
    busyPlayerId?: string | null;
  };
  /** PDF / screenshot: no match links, no zoom UI, no mobile tab bar — matches draw-page tree + connectors. */
  pdfCapture?: boolean;
}

// --- Configuration Constants ---
// Math-based absolute margins are removed in V3. We use pure nested flexbox alignment.

/** Tailwind `md` is 768px — treat ≤767px as mobile default zoom. */
const DEFAULT_ZOOM_MOBILE = 0.7;
const DEFAULT_ZOOM_DESKTOP = 1;

function getDefaultBracketZoomForViewport(): number {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return DEFAULT_ZOOM_DESKTOP;
  }
  return window.matchMedia("(max-width: 767px)").matches ? DEFAULT_ZOOM_MOBILE : DEFAULT_ZOOM_DESKTOP;
}

/** Core bracket UI (draw page + PDF). `previewSuffix` is normally from `useSearchParams` in the wrapper. */
export function TournamentBracketCore({
  previewSuffix,
  matches,
  players,
  sportName = "Tennis",
  totalRounds: propTotalRounds,
  hideThirdPlace = false,
  compactLayout = false,
  adminCheckIn,
  pdfCapture = false,
}: TournamentBracketProps & { previewSuffix: string }) {
  const { t } = useI18n();
  const hasMatches = Boolean(matches && matches.length > 0);
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
      // Rather than global bracket size, we look at the provided matches. 
      // BracketSection dynamically re-numbers the matchNumbers 1..N for the current view.
      const roundMatches = matches.filter(m => m.round === round);
      const maxMatchNum = roundMatches.length > 0 ? Math.max(...roundMatches.map(m => m.matchNumber)) : 0;
      
      // If we have matches, grid size matches the largest matchNumber present.
      // If empty, generate a fallback binary tree size based on depth from the current section's highest round.
      const matchCountInRound = maxMatchNum > 0 ? maxMatchNum : Math.pow(2, maxRound - round);
      
      grid[round] = Array.from({ length: matchCountInRound }).map((_, i) => {
        return matches.find(m => m.round === round && m.matchNumber === i + 1) || null;
      });
    });
    return grid;
  }, [matches, maxRound, rounds]);

  const [activeTabRound, setActiveTabRound] = useState<number>(rounds[0]);
  const [mobileViewMode, setMobileViewMode] = useState<"full" | "tabs">("full");
  /** Desktop default 100%; mobile 70% — applied after mount (see useLayoutEffect below). */
  const [bracketZoom, setBracketZoom] = useState(DEFAULT_ZOOM_DESKTOP);
  const MIN_ZOOM = 0.4; // keep current min (40%)
  const MAX_ZOOM = 1.2; // absolute 120%
  const STEP_ZOOM = 0.05;
  const zoomOut = () => setBracketZoom((z) => Math.max(MIN_ZOOM, Number((z - STEP_ZOOM).toFixed(2))));
  const zoomIn = () => setBracketZoom((z) => Math.min(MAX_ZOOM, Number((z + STEP_ZOOM).toFixed(2))));
  const resetZoom = () => setBracketZoom(getDefaultBracketZoomForViewport());

  useLayoutEffect(() => {
    if (pdfCapture) {
      setBracketZoom(1);
      return;
    }
    setBracketZoom(getDefaultBracketZoomForViewport());
  }, [pdfCapture]);

  /**
   * Zoom uses CSS transform, which doesn't change layout width. We wrap scaled content in a box
   * whose width matches the *visual* width (naturalWidth * zoom) so horizontal scroll has no extra
   * whitespace. A fixed formula underestimated wide trees (70+ players), and `overflow:hidden` on
   * that wrapper clipped the bracket — we measure the real scroll width instead.
   */
  const bracketContentRef = useRef<HTMLDivElement>(null);
  const [scaledContainerWidth, setScaledContainerWidth] = useState<number | null>(null);

  const recomputeScaledWidth = useCallback(() => {
    const el = bracketContentRef.current;
    if (!el) return;
    const natural = el.scrollWidth;
    if (natural > 0) setScaledContainerWidth(natural * bracketZoom);
  }, [bracketZoom]);

  useLayoutEffect(() => {
    recomputeScaledWidth();
  }, [recomputeScaledWidth, matches, mobileViewMode, rounds, bracketZoom, hideThirdPlace, has3rdPlaceMatch, actualTotalRounds]);

  useLayoutEffect(() => {
    const el = bracketContentRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => recomputeScaledWidth());
    ro.observe(el);
    return () => ro.disconnect();
  }, [recomputeScaledWidth]);

  // Player Block Sub-component
  const PlayerBlock = ({ 
    player, slot, isWinner, isLoser, isThirdPlace = false, textPlaceholder, contextLabel, adminCheckInSlot,
  }: { 
    player: Player | null; slot?: SlotPlaceholder | null; isWinner?: boolean; isLoser?: boolean; isThirdPlace?: boolean; textPlaceholder: string; contextLabel?: string;
    adminCheckInSlot?: { checked: boolean; disabled: boolean; onToggle: () => void };
  }) => {
    const isBye = !player && !slot && textPlaceholder === t("bracket.bye");
    const displayText = player?.name || (slot ? `Seed ${slot.seed} Group ${slot.group}` : textPlaceholder);
    
    return (
      <div
        className={`rounded-lg border-2 shadow-sm p-2 md:p-3 w-[150px] md:w-[200px] h-[60px] transition-all duration-300 relative ${!isBye && !isLoser ? "hover:scale-[1.02]" : ""} ${
          isBye ? "border-gray-200 bg-gray-50"
          : isWinner
            ? isThirdPlace ? "border-amber-500 bg-amber-50 z-10" : "border-ntu-green bg-ntu-green border-opacity-30 bg-opacity-10 z-10"
            : isLoser
              ? "border-gray-300 bg-gray-100 opacity-50"
              : isThirdPlace ? "border-amber-400 bg-amber-50" : "border-gray-300 bg-white"
        }`}
      >
        <div className="flex items-center gap-1.5 md:gap-2 h-full w-full min-w-0">
          {player?.seed && (
            <span className="text-[10px] md:text-xs font-bold text-white bg-ntu-green px-1.5 py-0.5 rounded flex-shrink-0">
              {player.seed}
            </span>
          )}
          <div className="flex-1 min-w-0">
            <div className={`text-base md:text-lg font-medium truncate leading-tight ${isBye ? 'text-gray-400 italic' : ''}`}>
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
          {adminCheckInSlot && player?.id && !isBye && (
            <button
              type="button"
              className={`shrink-0 text-[10px] md:text-xs px-1.5 py-1 rounded border font-semibold whitespace-nowrap ${
                adminCheckInSlot.checked ? "bg-ntu-green text-white border-ntu-green" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
              disabled={adminCheckInSlot.disabled}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                adminCheckInSlot.onToggle();
              }}
            >
              {adminCheckInSlot.checked ? "✓" : "報到"}
            </button>
          )}
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
           <PlayerBlock player={null} textPlaceholder={round === 1 ? t("bracket.bye") : t("bracket.tbd")} contextLabel={p1ContextLabel} />
           <div className="h-1"></div>
           <PlayerBlock player={null} textPlaceholder={round === 1 ? t("bracket.bye") : t("bracket.tbd")} contextLabel={p2ContextLabel} />
        </div>
      );
    }

    const courtLabel = getCourtDisplay(match);

    const p1Check =
      adminCheckIn && round === 1 && match.player1
        ? {
            checked: !!adminCheckIn.checkedInByPlayerId[match.player1.id],
            disabled: adminCheckIn.busyPlayerId === match.player1.id,
            onToggle: () => adminCheckIn.onToggleCheckIn(match.player1!),
          }
        : undefined;
    const p2Check =
      adminCheckIn && round === 1 && match.player2
        ? {
            checked: !!adminCheckIn.checkedInByPlayerId[match.player2.id],
            disabled: adminCheckIn.busyPlayerId === match.player2.id,
            onToggle: () => adminCheckIn.onToggleCheckIn(match.player2!),
          }
        : undefined;

    const cardInner = (
      <>
        <div className="relative flex flex-col gap-1 w-[150px] md:w-[200px]">
          <PlayerBlock
            player={match.player1 || null}
            slot={match.slot1}
            isWinner={player1IsWinner}
            isLoser={player1IsLoser}
            isThirdPlace={isThirdPlace}
            textPlaceholder={round === 1 ? t("bracket.bye") : t("bracket.tbd")}
            contextLabel={p1ContextLabel}
            adminCheckInSlot={p1Check}
          />
          <div className="h-1"></div>
          <PlayerBlock
            player={match.player2 || null}
            slot={match.slot2}
            isWinner={player2IsWinner}
            isLoser={player2IsLoser}
            isThirdPlace={isThirdPlace}
            textPlaceholder={round === 1 ? t("bracket.bye") : t("bracket.tbd")}
            contextLabel={p2ContextLabel}
            adminCheckInSlot={p2Check}
          />

          <div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 ${adminCheckIn ? "pointer-events-none" : ""}`}
          >
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
        {courtLabel !== "—" && (
          <div className="mt-1 text-[9px] md:text-[10px] text-gray-500 text-center truncate max-w-[150px] md:max-w-[200px] px-0.5 leading-tight">
            {courtLabel}
          </div>
        )}
      </>
    );

    if (adminCheckIn || pdfCapture) {
      return (
        <div id={`match-${match.id}`} className="block relative group z-10 scroll-mt-24 w-max">
          {cardInner}
        </div>
      );
    }

    return (
      <Link
        id={`match-${match.id}`}
        href={`/sports/${sportName.toLowerCase()}/matches/${match.id}${previewSuffix}`}
        className="block relative group hover:scale-[1.02] active:scale-95 transition-transform duration-300 z-10 scroll-mt-24 w-max"
      >
        {cardInner}
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

  if (!hasMatches) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 w-full min-w-0">
        <div className="text-center py-8">
          <h3 className="text-lg font-semibold text-ntu-green mb-2">尚無可預覽的籤表</h3>
          <p className="text-sm text-gray-600">
            請先產生或匯入籤表；若你已經建立比賽，請重新整理頁面再試一次。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-md p-4 md:p-6 border border-gray-100 w-full min-w-0 ${pdfCapture ? "overflow-visible" : "overflow-hidden"}`}>
      <div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-end gap-2">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold text-ntu-green mb-1 md:mb-2">
            {adminCheckIn ? t("admin.checkInBracketTitle") : `${sportName} Tournament Bracket`}
          </h2>
          <p className="text-xs md:text-sm text-gray-600">
            {adminCheckIn
              ? t("admin.checkInBracketHint")
              : `Single Elimination • ${totalPlayers} Players • ${bracketSize}-Draw • ${numSeeds} Seeds • ${maxRound} Rounds`}
          </p>
        </div>

        {/* Mobile View Toggle */}
        {!pdfCapture && (
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
        )}
      </div>

      {/* Mobile Tabs */}
      {!pdfCapture && mobileViewMode === "tabs" && (
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
      {!pdfCapture && mobileViewMode === "tabs" && (
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
      <div className={`${mobileViewMode === "full" ? "flex" : "hidden md:flex"} items-center justify-between gap-2 mb-2`}>
        {!pdfCapture && <p className="md:hidden text-xs text-gray-400">← {t("bracket.swipeHint")} →</p>}
        {!pdfCapture && (
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={zoomOut}
            disabled={bracketZoom <= MIN_ZOOM}
            className="px-2 py-1 rounded border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Zoom out bracket"
          >
            -
          </button>
          <button
            type="button"
            onClick={resetZoom}
            className="px-2 py-1 rounded border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-50"
            aria-label="Reset bracket zoom"
          >
            {Math.round(bracketZoom * 100)}%
          </button>
          <button
            type="button"
            onClick={zoomIn}
            disabled={bracketZoom >= MAX_ZOOM}
            className="px-2 py-1 rounded border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Zoom in bracket"
          >
            +
          </button>
        </div>
        )}
      </div>
      
      <div className={`${mobileViewMode === "full" ? "block" : "hidden md:block"} w-full min-w-0 ${pdfCapture ? "overflow-visible" : "overflow-x-auto overflow-y-hidden"} pb-6 relative`}>
        {(() => {
          // Generous single fallback (SSR-safe, no matchMedia) until ResizeObserver measures real width.
          const fallbackNatural =
            rounds.length * 280 + Math.max(0, rounds.length - 1) * 64 + Math.max(400, rounds.length * 80);
          const fallbackScaled = fallbackNatural * bracketZoom;
          const wrapW = scaledContainerWidth ?? fallbackScaled;
          return (
            <div className="pt-2" style={{ width: wrapW, minWidth: wrapW }}>
              <div
                ref={bracketContentRef}
                className="inline-block min-w-max"
                style={
                  pdfCapture
                    ? undefined
                    : {
                        transform: `scale(${bracketZoom})`,
                        transformOrigin: "top left",
                      }
                }
              >
          {/* Flex Column Headers */}
          <div className="flex bg-white z-30 pb-2 mb-4 border-b border-gray-200 w-full" style={{ gap: '48px' }}>
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
               {/*
                * Only the championship (final round, match #1) is the tree root. Match #2 in the same
                * round is the 3rd-place game — rendering it here builds empty feeder branches below the real bracket.
                */}
               {gridMatches[rounds[rounds.length - 1]]
                 ?.filter((match) => {
                   if (!match) return false;
                   // Only exclude the dedicated 3rd-place row when we are rendering
                   // the tournament's actual final round. For section views (earlier rounds),
                   // all roots in the highest visible round must be rendered.
                   const isThirdPlaceInFinalRound =
                     rounds[rounds.length - 1] === actualTotalRounds &&
                     has3rdPlaceMatch &&
                     match.matchNumber === 2;
                   return !isThirdPlaceInFinalRound;
                 })
                 .map((match, i) => (
                   <RecursiveMatchTree
                     key={`root-${match?.id ?? i}`}
                     match={match}
                     round={rounds[rounds.length - 1]}
                     index={i}
                   />
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
          );
        })()}
      </div>

      {/* Legend */}
      {!adminCheckIn && !pdfCapture && (
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
      )}
    </div>
  );
}

function TournamentBracketWithRouter(props: TournamentBracketProps) {
  const searchParams = useSearchParams();
  const previewSuffix = searchParams?.get("preview") === "1" ? "?preview=1" : "";
  return <TournamentBracketCore {...props} previewSuffix={previewSuffix} />;
}

export default TournamentBracketWithRouter;
