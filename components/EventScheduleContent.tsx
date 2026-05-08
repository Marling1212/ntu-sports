import MarkdownText from "@/components/MarkdownText";
import { getLocale, getT } from "@/lib/i18n/server";
import { getTiebreakerRulesText } from "@/lib/standings";
import type { TiebreakerConfig } from "@/types/database";

interface ScheduleItemRow {
  id: string;
  day_number: number;
  order_number: number;
  day_title?: string | null;
  location?: string | null;
  group_name?: string | null;
  round_name?: string | null;
  match_count?: number | string | null;
  scheduled_time?: string | null;
}

interface DayGroup {
  dayNumber: number;
  items: ScheduleItemRow[];
  dayInfo: ScheduleItemRow | null;
}

interface EventScheduleContentProps {
  event: { name?: string | null; schedule_notes?: string | null; schedule_updated_at?: string | null; contact_info?: string | null };
  rules: { id: string; order_number: number; content: string }[];
  scheduleByDay: DayGroup[];
  /** Used for fallback title, e.g. "tennis" or sport from URL */
  sportSlug?: string;
  /** Override page title (e.g. for Rules page) */
  pageTitle?: string;
  /** Override page subtitle */
  pageSubtitle?: string;
  /** Season-play tiebreaker order (regular season / qualifiers). Omit on single elimination. */
  tiebreakerConfig?: TiebreakerConfig | null;
  /** When false, hide the ranking-rules block (e.g. single elimination). */
  showTiebreakerRules?: boolean;
}

/** Shared view: tournament rules + schedule_items by day. Used for Schedule (bracket) and Rules page. Data from admin Settings. */
export default async function EventScheduleContent({
  event,
  rules,
  scheduleByDay,
  sportSlug = "",
  pageTitle,
  pageSubtitle,
  tiebreakerConfig,
  showTiebreakerRules = false,
}: EventScheduleContentProps) {
  const locale = await getLocale();
  const t = getT(locale);
  const title = pageTitle ?? event.name ?? t("schedule.pageTitleWithSport").replace("{sport}", sportSlug);
  const subtitle = pageSubtitle ?? t("schedule.matchSchedulesDesc");
  const tiebreakerRulesLines = getTiebreakerRulesText(
    tiebreakerConfig,
    locale === "zh" ? "zh" : "en"
  );

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-ntu-green mb-4">{title}</h1>
        <p className="text-lg text-gray-600">{subtitle}</p>
      </div>

      {rules && rules.length > 0 && (
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-8 mb-8">
          <h2 className="text-2xl font-bold text-ntu-green mb-6 flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {t("schedule.tournamentRules")}
          </h2>
          <div className="space-y-6">
            {rules.map((rule) => (
              <div key={rule.id} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-ntu-green text-white rounded-full flex items-center justify-center font-bold">
                  {rule.order_number}
                </div>
                <div className="flex-1">
                  <MarkdownText content={rule.content} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showTiebreakerRules && tiebreakerRulesLines.length > 0 && (
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-8">
          <h2 className="text-xl font-bold text-ntu-green mb-3">
            {locale === "zh" ? "排名規則（同分時依序比較）" : "Ranking rules (tiebreakers in order)"}
          </h2>
          <ul className="list-disc ml-5 text-sm text-gray-700 space-y-1">
            {tiebreakerRulesLines.map((line, i) => (
              <li key={`${i}-${line}`}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {scheduleByDay.length > 0 && (
        <div className={`grid gap-8 mb-8 ${scheduleByDay.length === 1 ? "md:grid-cols-1" : "md:grid-cols-2"}`}>
          {scheduleByDay.map((day, dayIndex) =>
            day.items.length > 0 ? (
              <div key={day.dayNumber} className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                <div className="bg-ntu-green text-white p-6">
                  <h2 className="text-2xl font-bold">
                    {day.dayInfo?.day_title || t("schedule.dayN").replace("{n}", String(day.dayNumber))}
                  </h2>
                  {day.dayInfo?.location && <p className="text-sm mt-2 opacity-90">{day.dayInfo.location}</p>}
                </div>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("schedule.orderLabel")}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("schedule.groupLabel")}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("schedule.roundLabel")}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("schedule.matchesLabel")}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("schedule.timeLabel")}</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {day.items.map((item, index) => {
                        let globalOrder = index + 1;
                        for (let i = 0; i < dayIndex; i++) globalOrder += scheduleByDay[i].items.length;
                        return (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{globalOrder}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{item.group_name ?? ""}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{item.round_name ?? ""}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 text-center">{item.match_count ?? ""}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-ntu-green">{item.scheduled_time ?? ""}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="md:hidden divide-y divide-gray-200">
                  {day.items.map((item, index) => {
                    let globalOrder = index + 1;
                    for (let i = 0; i < dayIndex; i++) globalOrder += scheduleByDay[i].items.length;
                    return (
                      <div key={item.id} className="p-4 bg-white hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-500">#{globalOrder}</span>
                            <span className="text-sm font-semibold text-ntu-green">{item.round_name ?? ""}</span>
                          </div>
                          <span className="text-sm font-semibold text-ntu-green">{item.scheduled_time ?? ""}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          {item.group_name && (
                            <span>
                              <span className="text-gray-500">{t("schedule.groupLabel")}:</span> <span className="font-medium">{item.group_name}</span>
                            </span>
                          )}
                          {item.match_count != null && item.match_count !== "" && (
                            <span>
                              <span className="text-gray-500">{t("schedule.matchesLabel")}:</span> <span className="font-medium">{item.match_count}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null
          )}
        </div>
      )}

      {(event.schedule_notes || event.schedule_updated_at || event.contact_info) && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-blue-800">{t("schedule.notesTitle")}</h3>
              <div className="mt-2 text-sm text-blue-700">
                {event.schedule_notes && (
                  <div className="mb-2">
                    <MarkdownText content={event.schedule_notes} />
                  </div>
                )}
                {event.schedule_updated_at && (
                  <p className="text-xs text-gray-600 mb-3">
                    {t("schedule.lastUpdated")}: {event.schedule_updated_at}
                  </p>
                )}
                {event.contact_info && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <MarkdownText content={event.contact_info} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
