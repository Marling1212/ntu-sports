import Link from "next/link";
import { getCourtDisplay } from "@/lib/utils/getCourtDisplay";
import { formatScheduledTimeAsStored } from "@/lib/utils/formatScheduledTime";
import { getLocale, getT } from "@/lib/i18n/server";

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

interface BracketMatchScheduleProps {
  matches: MatchRow[];
  sportSlug: string;
  eventName?: string | null;
}

/** Full list of bracket matches (round, time, court, matchup, score, status). Used on Schedule page for bracket events. */
export default async function BracketMatchSchedule({
  matches,
  sportSlug,
  eventName,
}: BracketMatchScheduleProps) {
  const locale = await getLocale();
  const t = getT(locale);

  const sorted = [...matches].sort((a, b) => {
    const at = a.scheduled_time ? new Date(a.scheduled_time).getTime() : 0;
    const bt = b.scheduled_time ? new Date(b.scheduled_time).getTime() : 0;
    if (at !== bt) return at - bt;
    const ar = Number(a.round) || 0;
    const br = Number(b.round) || 0;
    return ar - br;
  });

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-ntu-green mb-4">
          {eventName || t("schedule.pageTitleWithSport").replace("{sport}", sportSlug)}
        </h1>
        <p className="text-lg text-gray-600">{t("schedule.matchSchedulesDesc")}</p>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t("schedule.orderLabel")}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t("sports.time")}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t("sports.court")}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t("sports.matchup")}</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">{t("sports.status")}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sorted.map((m, idx) => {
                const timeStr = formatScheduledTimeAsStored(m.scheduled_time);
                const court = getCourtDisplay(m);
                const p1 = m.player1?.name ?? "TBD";
                const p2 = m.player2?.name ?? "TBD";
                const score = m.score1 != null && m.score2 != null ? `${m.score1}-${m.score2}` : null;
                return (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{idx + 1}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{timeStr}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{court}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      <span className="font-semibold">{p1}</span>
                      <Link
                        href={`/sports/${sportSlug}/matches/${m.id}`}
                        className="mx-2 text-ntu-green hover:underline font-semibold"
                      >
                        {t("sports.vs")}
                      </Link>
                      <span className="font-semibold">{p2}</span>
                      {score != null && (
                        <span className="ml-2 text-gray-600">({score})</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      {m.status === "completed" ? (
                        <span className="inline-block px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded">{t("sports.completed")}</span>
                      ) : m.status === "live" ? (
                        <span className="inline-block px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded animate-pulse">{t("sports.live")}</span>
                      ) : m.status === "delayed" ? (
                        <span className="inline-block px-2 py-1 text-xs font-semibold text-amber-700 bg-amber-100 rounded">{t("sports.delayed")}</span>
                      ) : (
                        <span className="inline-block px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-100 rounded">{t("sports.upcoming")}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
