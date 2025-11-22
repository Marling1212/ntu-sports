import { getSportEvent, getSportAnnouncements, getSportMatches } from "@/lib/utils/getSportEvent";
import MarkdownText from "@/components/MarkdownText";
import TennisNavbarClient from "@/components/TennisNavbarClient";
import { getCourtDisplay } from "@/lib/utils/getCourtDisplay";

export default async function SportAnnouncementsPage(context: any) {
  const params = (context?.params || {}) as { sport?: string };
  const sportParam = (params.sport || "").toLowerCase();
  const sportName = sportParam ? sportParam.charAt(0).toUpperCase() + sportParam.slice(1) : "";
  const event = sportParam ? await getSportEvent(sportParam) : null; // Pass lowercase version for case-insensitive lookup
  const announcements = event ? await getSportAnnouncements(event.id) : [];

  // Build "today's or next day" scheduled matches announcement (view-only, not persisted)
  let matchesToShow: any[] = [];
  let showTitle = "";
  let emptyMessage = "";
  if (event) {
    const matches = await getSportMatches(event.id);
    const tz = "Asia/Taipei";
    const now = new Date();
    // Compute today's and next day's start/end in Taipei timezone
    const nowTz = new Date(now.toLocaleString("en-US", { timeZone: tz }));
    
    // Calculate today's date range
    const todayStart = new Date(nowTz);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(nowTz);
    todayEnd.setHours(23, 59, 59, 999);
    
    // Calculate tomorrow's date range
    const nextDayStart = new Date(nowTz);
    nextDayStart.setDate(nextDayStart.getDate() + 1);
    nextDayStart.setHours(0, 0, 0, 0);
    const nextDayEnd = new Date(nextDayStart);
    nextDayEnd.setHours(23, 59, 59, 999);
    
    // Get today's matches
    const todayMatches = (matches || [])
      .filter((m: any) => !!m.scheduled_time)
      .filter((m: any) => {
        const d = new Date(m.scheduled_time);
        const dTz = new Date(d.toLocaleString("en-US", { timeZone: tz }));
        return dTz >= todayStart && dTz <= todayEnd;
      })
      .sort((a: any, b: any) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());
    
    // Check if any of today's matches haven't started yet (scheduled_time > now)
    const hasUpcomingToday = todayMatches.some((m: any) => {
      const matchTime = new Date(m.scheduled_time);
      return matchTime > now && m.status !== "completed";
    });
    
    // Determine which matches to show
    if (hasUpcomingToday) {
      matchesToShow = todayMatches;
      showTitle = `今日賽程（${sportName}）`;
      emptyMessage = "今日沒有已排定的比賽。";
    } else {
      matchesToShow = (matches || [])
        .filter((m: any) => !!m.scheduled_time)
        .filter((m: any) => {
          const d = new Date(m.scheduled_time);
          const dTz = new Date(d.toLocaleString("en-US", { timeZone: tz }));
          return dTz >= nextDayStart && dTz <= nextDayEnd;
        })
        .sort((a: any, b: any) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());
      showTitle = `明日賽程預告（${sportName}）`;
      emptyMessage = "明日沒有已排定的比賽。";
    }
  }

  return (
    <>
      <TennisNavbarClient eventName={event?.name} tournamentType={event?.tournament_type} />
      <div className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-ntu-green mb-4">{sportName} Announcements</h1>
      </div>

      {/* Auto announcement: today's or next-day scheduled matches (view-only, generated on load) */}
      {event && (
        <div className="space-y-4 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-start justify-between mb-3">
              <h2 className="text-xl font-semibold text-ntu-green">
                {showTitle}
              </h2>
              <span className="text-sm text-gray-500">
                依照目前排定之賽程時間產生
              </span>
            </div>
            {matchesToShow.length === 0 ? (
              <p className="text-gray-600">{emptyMessage}</p>
            ) : (
              <div className="overflow-x-auto -mx-2">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">時間</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">場地</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">對戰組合</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">狀態</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {matchesToShow.map((m: any) => {
                      const timeStr = new Intl.DateTimeFormat("zh-TW", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Asia/Taipei",
                      }).format(new Date(m.scheduled_time));
                      // Get court: use unified logic
                      const court = getCourtDisplay(m);
                      const p1 = m.player1?.name || "TBD";
                      const p2 = m.player2?.name || "TBD";
                      return (
                        <tr key={m.id}>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">{timeStr}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">{court}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800">
                            <span className="font-semibold">{p1}</span>
                            <span className="mx-2 text-gray-400">vs</span>
                            <span className="font-semibold">{p2}</span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-center">
                            {m.status === "completed" ? (
                              <span className="inline-block px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded">Completed</span>
                            ) : m.status === "live" ? (
                              <span className="inline-block px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded animate-pulse">Live</span>
                            ) : m.status === "delayed" ? (
                              <span className="inline-block px-2 py-1 text-xs font-semibold text-amber-700 bg-amber-100 rounded">Delayed</span>
                            ) : (
                              <span className="inline-block px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-100 rounded">Upcoming</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {announcements.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-100">
            <p className="text-gray-600 text-lg">No announcements yet.</p>
          </div>
        ) : (
          announcements.map((announcement: any) => (
            <div key={announcement.id} className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <div className="flex items-start justify-between mb-3">
                <h2 className="text-xl font-semibold text-ntu-green">
                  {announcement.title}
                </h2>
                <span className="text-sm text-gray-500">
                  {new Date(announcement.created_at).toLocaleDateString('zh-TW', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="text-gray-700">
                <MarkdownText content={announcement.content} />
              </div>
            </div>
          ))
        )}
      </div>
      </div>
    </>
  );
}

