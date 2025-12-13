import { createClient } from "@/lib/supabase/server";
import MarkdownText from "@/components/MarkdownText";
import TennisNavbarClient from "@/components/TennisNavbarClient";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function TennisEventSchedulePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();
  
  // Get the specific event
  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .eq("sport", "tennis")
    .maybeSingle();

  // If event not found or not a tennis event, show 404
  if (error || !event) {
    notFound();
  }
  
  // Get tournament rules
  const { data: rules } = await supabase
    .from("tournament_rules")
    .select("*")
    .eq("event_id", event.id)
    .order("order_number", { ascending: true });

  // Get schedule items
  const { data: scheduleItems } = await supabase
    .from("schedule_items")
    .select("*")
    .eq("event_id", event.id)
    .order("day_number", { ascending: true })
    .order("order_number", { ascending: true });

  // Group schedule items by day
  const uniqueDays = [...new Set(scheduleItems?.map(s => s.day_number) || [])].sort();
  const scheduleByDay = uniqueDays.map(dayNumber => ({
    dayNumber,
    items: scheduleItems?.filter(s => s.day_number === dayNumber) || [],
    dayInfo: scheduleItems?.find(s => s.day_number === dayNumber) || null
  }));

  return (
    <>
      <TennisNavbarClient eventName={event.name} tournamentType={event.tournament_type} />
      <div className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-ntu-green mb-4">
          {event.name || "NTU Tennis – 114 Freshman Cup Schedule"}
        </h1>
        <p className="text-lg text-gray-600">
          比賽賽程時間表 Match Schedule
        </p>
      </div>

      {/* Important Rules Section */}
      {rules && rules.length > 0 && (
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-8 mb-8">
          <h2 className="text-2xl font-bold text-ntu-green mb-6 flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            重要賽事規則
          </h2>
          
          <div className="space-y-6">
            {rules.map((rule) => (
              <div key={rule.id} className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-ntu-green text-white rounded-full flex items-center justify-center font-bold">
                    {rule.order_number}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-gray-700 leading-relaxed">
                    <MarkdownText content={rule.content} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Schedule Days - Dynamic Grid */}
      {scheduleByDay.length > 0 && (
        <div className={`grid gap-8 mb-8 ${scheduleByDay.length === 1 ? 'md:grid-cols-1' : 'md:grid-cols-2'}`}>
          {scheduleByDay.map((day, dayIndex) => (
            day.items.length > 0 && (
              <div key={day.dayNumber} className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                <div className="bg-ntu-green text-white p-6">
                  <h2 className="text-2xl font-bold">{day.dayInfo?.day_title || `第 ${day.dayNumber} 天`}</h2>
                  {day.dayInfo?.location && (
                    <p className="text-sm mt-2 opacity-90">{day.dayInfo.location}</p>
                  )}
                </div>
              
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">順序</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">組別</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">輪次</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">場數</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">賽程時間</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {day.items.map((item, index) => {
                        // Calculate global order number
                        let globalOrder = index + 1;
                        for (let i = 0; i < dayIndex; i++) {
                          globalOrder += scheduleByDay[i].items.length;
                        }
                        
                        return (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {globalOrder}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                              {item.group_name}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                              {item.round_name}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 text-center">
                              {item.match_count}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-ntu-green">
                              {item.scheduled_time}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-gray-200">
                  {day.items.map((item, index) => {
                    // Calculate global order number
                    let globalOrder = index + 1;
                    for (let i = 0; i < dayIndex; i++) {
                      globalOrder += scheduleByDay[i].items.length;
                    }
                    
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
                            <span className="flex items-center gap-1">
                              <span className="text-gray-500">組別:</span>
                              <span className="font-medium">{item.group_name}</span>
                            </span>
                          )}
                          {item.match_count && (
                            <span className="flex items-center gap-1">
                              <span className="text-gray-500">場數:</span>
                              <span className="font-medium">{item.match_count}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {/* Notes Section */}
      {(event.schedule_notes || event.schedule_updated_at || event.contact_info) && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-blue-800">賽程說明 Notes</h3>
              <div className="mt-2 text-sm text-blue-700">
                {event.schedule_notes && (
                  <div className="mb-2">
                    <MarkdownText content={event.schedule_notes} />
                  </div>
                )}
                {event.schedule_updated_at && (
                  <p className="text-xs text-gray-600 mb-3">
                    最後更新：{event.schedule_updated_at}
                  </p>
                )}
                {event.contact_info && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <div className="text-sm text-gray-700">
                      <MarkdownText content={event.contact_info} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

