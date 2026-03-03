"use client";

import { useState, useMemo, useCallback } from "react";
import { Match, Player, SlotPlaceholder } from "@/types/tournament";
import { useI18n } from "@/lib/i18n/context";

interface BracketPlayerSearchProps {
  matches: Match[];
  players: Player[];
  /** For team events: map player_id -> team members with names */
  teamMembers?: Record<string, Array<{ name?: string }>>;
  /** Scroll to match by ID. For sectioned brackets, parent should switch section first if needed. */
  onScrollToMatch: (matchId: string) => void;
  /** Optional: which section (1-based) contains this match. If provided, parent may switch section before scrolling. */
  getSectionForMatch?: (matchId: string) => number | null;
  /** Called when user wants to navigate to a match in another section */
  onSectionChange?: (section: number) => void;
}

function matchContainsSearch(
  match: Match,
  query: string,
  teamMembers?: Record<string, Array<{ name?: string }>>
): boolean {
  if (!query || query.trim().length === 0) return false;
  const q = query.trim().toLowerCase();

  const checkName = (name: string | null | undefined) =>
    name && name.toLowerCase().includes(q);

  const checkSlot = (slot: SlotPlaceholder | null | undefined) => {
    if (!slot) return false;
    const seedStr = `seed ${slot.seed}`;
    const groupStr = `group ${slot.group}`;
    return seedStr.includes(q) || groupStr.includes(q) || String(slot.seed).includes(q) || String(slot.group).includes(q);
  };

  if (checkName(match.player1?.name)) return true;
  if (checkName(match.player2?.name)) return true;
  if (checkSlot((match as Match).slot1)) return true;
  if (checkSlot((match as Match).slot2)) return true;

  if (teamMembers) {
    const p1 = match.player1?.id ? teamMembers[match.player1.id] : [];
    const p2 = match.player2?.id ? teamMembers[match.player2.id] : [];
    for (const m of [...(p1 || []), ...(p2 || [])]) {
      if (checkName(m?.name)) return true;
    }
  }

  return false;
}

export default function BracketPlayerSearch({
  matches,
  players,
  teamMembers,
  onScrollToMatch,
  getSectionForMatch,
  onSectionChange,
}: BracketPlayerSearchProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");

  const matchingMatches = useMemo(() => {
    if (!query.trim()) return [];
    return matches.filter((m) =>
      matchContainsSearch(m, query, teamMembers)
    );
  }, [matches, query, teamMembers]);

  const handleJumpTo = useCallback(
    (matchId: string) => {
      const section = getSectionForMatch?.(matchId);
      if (section != null && onSectionChange) {
        onSectionChange(section);
        requestAnimationFrame(() => {
          setTimeout(() => onScrollToMatch(matchId), 100);
        });
      } else {
        onScrollToMatch(matchId);
      }
    },
    [getSectionForMatch, onSectionChange, onScrollToMatch]
  );

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3">
      <div className="relative flex-1 min-w-0 w-full sm:min-w-[200px] sm:max-w-xs">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("bracket.searchPlaceholder")}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 sm:px-4 sm:py-2 pl-9 sm:pl-10 text-sm min-h-[44px] sm:min-h-0 focus:border-ntu-green focus:outline-none focus:ring-1 focus:ring-ntu-green"
          aria-label={t("bracket.searchPlaceholder")}
        />
        <svg
          className="absolute left-2.5 sm:left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      {query.trim() && (
        <div className="flex flex-wrap items-center gap-2">
          {matchingMatches.length === 0 ? (
            <span className="text-sm text-gray-500">
              {t("bracket.searchNoResults")}
            </span>
          ) : (
            <>
              <span className="text-sm text-gray-600">
                {t("bracket.searchFound").replace("{n}", String(matchingMatches.length))}
              </span>
              <div className="flex flex-wrap gap-1">
                {matchingMatches.slice(0, 8).map((m, idx) => {
                  const section = getSectionForMatch?.(m.id);
                  const label =
                    section != null && onSectionChange
                      ? t("bracket.searchJumpToSection")
                          .replace("{section}", String(section))
                          .replace("{round}", String(m.round))
                          .replace("{match}", String(m.matchNumber))
                      : t("bracket.searchJumpToMatch")
                          .replace("{round}", String(m.round))
                          .replace("{match}", String(m.matchNumber));
                  return (
                    <button
                      key={m.id}
                      onClick={() => handleJumpTo(m.id)}
                      className="rounded-md bg-ntu-green/10 px-2.5 py-1.5 sm:px-2 sm:py-1 text-xs font-medium text-ntu-green hover:bg-ntu-green/20 min-h-[36px] sm:min-h-0 touch-manipulation"
                    >
                      {label}
                    </button>
                  );
                })}
                {matchingMatches.length > 8 && (
                  <span className="px-2 py-1 text-xs text-gray-500">
                    +{matchingMatches.length - 8} {t("bracket.searchMore")}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
