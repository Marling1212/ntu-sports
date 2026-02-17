import { createClient } from "@/lib/supabase/server";
import MarkdownText from "@/components/MarkdownText";
import TennisNavbarClient from "@/components/TennisNavbarClient";
import { notFound } from "next/navigation";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SportEventSchedulePage({
  params,
}: {
  params: Promise<{ sport: string; eventId: string }>;
}) {
  const { sport, eventId } = await params;
  const sportParam = sport.toLowerCase();
  const supabase = await createClient();
  const t = getT("zh");

  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .eq("sport", sportParam)
    .eq("is_visible", true)
    .maybeSingle();

  if (error || !event) {
    notFound();
  }

  const { data: rules } = await supabase
    .from("tournament_rules")
    .select("*")
    .eq("event_id", event.id)
    .order("order_number", { ascending: true });

  const { data: scheduleItems } = await supabase
    .from("schedule_items")
    .select("*")
    .eq("event_id", event.id)
    .order("day_number", { ascending: true })
    .order("order_number", { ascending: true });

  const uniqueDays = [...new Set(scheduleItems?.map((s) => s.day_number) || [])].sort();
  const scheduleByDay = uniqueDays.map((dayNumber) => ({
    dayNumber,
    items: scheduleItems?.filter((s) => s.day_number === dayNumber) || [],
    dayInfo: scheduleItems?.find((s) => s.day_number === dayNumber) || null,
  }));

  return (
    <>
      <TennisNavbarClient eventName={event.name} tournamentType={event.tournament_type} />
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-ntu-green mb-4">
            {event.name || t("schedule.pageTitleWithSport").replace("{sport}", sportParam)}
          </h1>
          <p className="text-lg text-gray-600">
            {t("schedule.matchSchedulesDesc")}
          </p>
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

        {scheduleByDay.length > 0 && (
          <div className={`grid gap-8 mb-8 ${scheduleByDay.length === 1 ? "md:grid-cols-1" : "md:grid-cols-2"}`}>
            {scheduleByDay.map((day, dayIndex) =>
              day.items.length > 0 ? (
                <div key={day.dayNumber} className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                  <div className="bg-ntu-green text-white p-6">
                    <h2 className="text-2xl font-bold">{day.dayInfo?.day_title || t("schedule.dayN").replace("{n}", String(day.dayNumber))}</h2>
                    {day.dayInfo?.location && <p className="text-sm mt-2 opacity-90">{day.dayInfo.location}</p>}
                  </div>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Group</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Round</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Matches</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {day.items.map((item, index) => {
                          let globalOrder = index + 1;
                          for (let i = 0; i < dayIndex; i++) globalOrder += scheduleByDay[i].items.length;
                          return (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{globalOrder}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{item.group_name}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{item.round_name}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 text-center">{item.match_count}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-ntu-green">{item.scheduled_time}</td>
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
                              <span className="text-sm font-semibold text-ntu-green">{item.round_name}</span>
                            </div>
                            <span className="text-sm font-semibold text-ntu-green">{item.scheduled_time}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            {item.group_name && (
                              <span>
                                <span className="text-gray-500">Group:</span> <span className="font-medium">{item.group_name}</span>
                              </span>
                            )}
                            {item.match_count && (
                              <span>
                                <span className="text-gray-500">Matches:</span> <span className="font-medium">{item.match_count}</span>
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
            <h3 className="text-sm font-medium text-blue-800">Notes</h3>
            <div className="mt-2 text-sm text-blue-700">
              {event.schedule_notes && <div className="mb-2"><MarkdownText content={event.schedule_notes} /></div>}
              {event.schedule_updated_at && <p className="text-xs text-gray-600 mb-3">Last updated: {event.schedule_updated_at}</p>}
              {event.contact_info && <div className="mt-3 pt-3 border-t border-blue-200"><MarkdownText content={event.contact_info} /></div>}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
