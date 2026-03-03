"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { getCourtDisplay } from "@/lib/utils/getCourtDisplay";
import { formatScheduledTimeAsStored } from "@/lib/utils/formatScheduledTime";
import { useI18n } from "@/lib/i18n/context";

interface MatchRow {
  id: string;
  round?: number | string | null;
  matchNumber?: number;
  scheduled_time?: string | null;
  court?: string | null;
  slot?: { code?: string | null } | null;
  status?: string | null;
  player1?: { id: string; name: string } | null;
  player2?: { id: string; name: string } | null;
  score1?: number | null;
  score2?: number | null;
}

interface BracketMatchScheduleClientProps {
  matches: MatchRow[];
  sportSlug: string;
}

export default function BracketMatchScheduleClient({
  matches,
  sportSlug,
}: BracketMatchScheduleClientProps) {
  const { t } = useI18n();
  const [filterByPlayerId, setFilterByPlayerId] = useState<string | null>(null);

  const displayMatches = useMemo(() => {
    if (!filterByPlayerId) return matches;
    return matches.filter(
      (m) => m.player1?.id === filterByPlayerId || m.player2?.id === filterByPlayerId
    );
  }, [matches, filterByPlayerId]);

  const getName = (id: string) =>
    (matches.find((m) => m.player1?.id === id)?.player1?.name ||
      matches.find((m) => m.player2?.id === id)?.player2?.name) ?? "?";

  const timeStr = (m: MatchRow) => formatScheduledTimeAsStored(m.scheduled_time);

  const maxRound = useMemo(() => {
    const rounds = displayMatches.map((m) => Number(m.round) || 0);
    return Math.max(...rounds, 1);
  }, [displayMatches]);

  const getRoundLabel = (m: MatchRow): string => {
    const r = Number(m.round) || 1;
    if (r === maxRound && m.matchNumber === 2) return t("bracket.thirdPlace");
    if (r === maxRound) return t("bracket.final");
    if (r === maxRound - 1) return t("bracket.semifinals");
    if (r === maxRound - 2) return t("bracket.quarterfinals");
    const n = Math.pow(2, maxRound - r + 1);
    return t("bracket.roundOf").replace("{n}", String(n));
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
      {filterByPlayerId && (
        <div className="px-3 sm:px-4 py-2 bg-amber-50 border-b border-amber-200">
          <button
            type="button"
            onClick={() => setFilterByPlayerId(null)}
            className="px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200"
            title={t("seasonPlay.filterShowAll")}
          >
            ✕ {t("seasonPlay.filterShowingOnly").replace("{name}", getName(filterByPlayerId))}
          </button>
        </div>
      )}
      {/* Mobile: card list with time, court, round labeled */}
      <div className="md:hidden divide-y divide-gray-200">
        {displayMatches.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-gray-500">{t("seasonPlay.noMatchesForGroup")}</p>
        ) : (
          displayMatches.map((m) => {
            const court = getCourtDisplay(m);
            const p1 = m.player1?.name ?? "TBD";
            const p2 = m.player2?.name ?? "TBD";
            const score = m.score1 != null && m.score2 != null ? `${m.score1}-${m.score2}` : null;
            return (
              <Link
                key={m.id}
                href={`/sports/${sportSlug}/matches/${m.id}`}
                className="block p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-medium text-ntu-green">{getRoundLabel(m)}</span>
                  {m.status === "completed" && (
                    <span className="inline-block px-1.5 py-0.5 text-xs font-semibold text-green-800 bg-green-100 rounded">
                      {t("sports.completed")}
                    </span>
                  )}
                  {m.status === "live" && (
                    <span className="inline-block px-1.5 py-0.5 text-xs font-semibold text-red-800 bg-red-100 rounded animate-pulse">
                      {t("sports.live")}
                    </span>
                  )}
                  {m.status === "upcoming" && (
                    <span className="inline-block px-1.5 py-0.5 text-xs font-semibold text-gray-700 bg-gray-100 rounded">
                      {t("sports.upcoming")}
                    </span>
                  )}
                  {m.status === "delayed" && (
                    <span className="inline-block px-1.5 py-0.5 text-xs font-semibold text-amber-700 bg-amber-100 rounded">
                      {t("sports.delayed")}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-700 mb-3">
                  <span><span className="text-gray-500">{t("sports.time")}:</span> {timeStr(m)}</span>
                  <span><span className="text-gray-500">{t("sports.court")}:</span> {court}</span>
                </div>
                <div className="flex items-center justify-between gap-2 text-sm font-semibold text-gray-800">
                  <span className="min-w-0 truncate">{p1}</span>
                  <span className="shrink-0 text-ntu-green font-bold">
                    {score ?? "VS"}
                  </span>
                  <span className="min-w-0 truncate text-right">{p2}</span>
                </div>
              </Link>
            );
          })
        )}
      </div>
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("schedule.orderLabel")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("sports.time")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("sports.court")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("seasonPlay.player1")}
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("seasonPlay.vs")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("seasonPlay.player2")}
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("sports.status")}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {displayMatches.map((m, idx) => {
              const timeStr = formatScheduledTimeAsStored(m.scheduled_time);
              const court = getCourtDisplay(m);
              const p1 = m.player1?.name ?? "TBD";
              const p2 = m.player2?.name ?? "TBD";
              const score = m.score1 != null && m.score2 != null ? `${m.score1}-${m.score2}` : null;
              return (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{timeStr}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{court}</td>
                  <td
                    className={`px-4 py-3 text-sm font-semibold cursor-pointer rounded ${filterByPlayerId === m.player1?.id ? "ring-2 ring-amber-400 bg-amber-100" : ""} ${m.player1?.id ? "hover:bg-gray-50/80" : ""}`}
                    onClick={
                      m.player1?.id
                        ? () =>
                            setFilterByPlayerId((prev) =>
                              prev === m.player1?.id ? null : m.player1?.id ?? null
                            )
                        : undefined
                    }
                    title={m.player1?.id ? t("seasonPlay.filterByTeamHint") : undefined}
                  >
                    {m.player1?.id ? (
                      <Link
                        href={`/sports/${sportSlug}/teams/${m.player1.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-gray-800 hover:text-ntu-green hover:underline"
                      >
                        {p1}
                      </Link>
                    ) : (
                      <span className="text-gray-600">{p1}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-sm">
                    <Link
                      href={`/sports/${sportSlug}/matches/${m.id}`}
                      className="text-ntu-green hover:underline font-semibold"
                    >
                      {t("sports.vs")}
                    </Link>
                    {score != null && (
                      <span className="ml-1 text-gray-600">({score})</span>
                    )}
                  </td>
                  <td
                    className={`px-4 py-3 text-sm font-semibold cursor-pointer rounded ${filterByPlayerId === m.player2?.id ? "ring-2 ring-amber-400 bg-amber-100" : ""} ${m.player2?.id ? "hover:bg-gray-50/80" : ""}`}
                    onClick={
                      m.player2?.id
                        ? () =>
                            setFilterByPlayerId((prev) =>
                              prev === m.player2?.id ? null : m.player2?.id ?? null
                            )
                        : undefined
                    }
                    title={m.player2?.id ? t("seasonPlay.filterByTeamHint") : undefined}
                  >
                    {m.player2?.id ? (
                      <Link
                        href={`/sports/${sportSlug}/teams/${m.player2.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-gray-800 hover:text-ntu-green hover:underline"
                      >
                        {p2}
                      </Link>
                    ) : (
                      <span className="text-gray-600">{p2}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                    {m.status === "completed" ? (
                      <span className="inline-block px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded">
                        {t("sports.completed")}
                      </span>
                    ) : m.status === "live" ? (
                      <span className="inline-block px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded animate-pulse">
                        {t("sports.live")}
                      </span>
                    ) : m.status === "delayed" ? (
                      <span className="inline-block px-2 py-1 text-xs font-semibold text-amber-700 bg-amber-100 rounded">
                        {t("sports.delayed")}
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-100 rounded">
                        {t("sports.upcoming")}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
