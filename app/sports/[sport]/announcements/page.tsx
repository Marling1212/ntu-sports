import { getSportEvent, getSportAnnouncements, getSportMatches } from "@/lib/utils/getSportEvent";
import MarkdownText from "@/components/MarkdownText";
import TennisNavbarClient from "@/components/TennisNavbarClient";

export default async function SportAnnouncementsPage({ params }: { params: { sport: string } }) {
  const sportName = params.sport.charAt(0).toUpperCase() + params.sport.slice(1);
  const event = await getSportEvent(params.sport); // Pass lowercase version for case-insensitive lookup
  const announcements = event ? await getSportAnnouncements(event.id) : [];

  // Build "next day" scheduled matches announcement (view-only, not persisted)
  let nextDayMatches: any[] = [];
  if (event) {
    const matches = await getSportMatches(event.id);
    const tz = "Asia/Taipei";
    const now = new Date();
    // Compute next day's start/end in Taipei timezone by using local date components
    const nowTz = new Date(now.toLocaleString("en-US", { timeZone: tz }));
    const nextDayStart = new Date(nowTz);
    nextDayStart.setDate(nextDayStart.getDate() + 1);
    nextDayStart.setHours(0, 0, 0, 0);
    const nextDayEnd = new Date(nextDayStart);
    nextDayEnd.setHours(23, 59, 59, 999);

    nextDayMatches = (matches || [])
      .filter((m: any) => !!m.scheduled_time)
      .filter((m: any) => {
        const d = new Date(m.scheduled_time);
        // Convert to Taipei-local time for comparison
        const dTz = new Date(d.toLocaleString("en-US", { timeZone: tz }));
        return dTz >= nextDayStart && dTz <= nextDayEnd;
      })
      .sort((a: any, b: any) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());
  }

  return (
    <>
      <TennisNavbarClient eventName={event?.name} />
      <div className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-ntu-green mb-4">{sportName} Announcements</h1>
        <p className="text-lg text-gray-600">
          明日賽程將自動顯示於此頁，不需手動發布
        </p>
      </div>

      {/* Auto announcement: next-day scheduled matches (view-only, generated on load) */}
      {event && (
        <div className="space-y-4 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-start justify-between mb-3">
              <h2 className="text-xl font-semibold text-ntu-green">
                明日賽程預告（{sportName}）
              </h2>
              <span className="text-sm text-gray-500">
                依照目前排定之賽程時間產生
              </span>
            </div>
            {nextDayMatches.length === 0 ? (
              <p className="text-gray-600">明日沒有已排定的比賽。</p>
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
                    {nextDayMatches.map((m: any) => {
                      const timeStr = new Intl.DateTimeFormat("zh-TW", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Asia/Taipei",
                      }).format(new Date(m.scheduled_time));
                      const court = m.court_name || m?.slot?.event_courts?.name || "-";
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
                <MarkdownText text={announcement.content} />
              </div>
            </div>
          ))
        )}
      </div>
      </div>
    </>
  );
}

