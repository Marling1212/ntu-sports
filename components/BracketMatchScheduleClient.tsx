"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { getCourtDisplay } from "@/lib/utils/getCourtDisplay";
import { formatScheduledTimeAsStored } from "@/lib/utils/formatScheduledTime";
import { useI18n } from "@/lib/i18n/context";

interface MatchRow {
  id: string;
  round?: number | string | null;
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

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
      {filterByPlayerId && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200">
          <button
            type="button"
            onClick={() => setFilterByPlayerId(null)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200"
            title={t("seasonPlay.filterShowAll")}
          >
            ✕ {t("seasonPlay.filterShowingOnly").replace("{name}", getName(filterByPlayerId))}
          </button>
        </div>
      )}
      <div className="overflow-x-auto">
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
                    className={`px-4 py-3 text-sm font-semibold cursor-pointer rounded ${filterByPlayerId === m.player1?.id ? "ring-2 ring-ntu-green bg-ntu-green/10" : ""} ${m.player1?.id ? "hover:bg-gray-50/80" : ""}`}
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
                    className={`px-4 py-3 text-sm font-semibold cursor-pointer rounded ${filterByPlayerId === m.player2?.id ? "ring-2 ring-ntu-green bg-ntu-green/10" : ""} ${m.player2?.id ? "hover:bg-gray-50/80" : ""}`}
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
