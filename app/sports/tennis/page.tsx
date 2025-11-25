import Link from "next/link";
import CountdownTimerWrapper from "@/components/CountdownTimerWrapper";
import { createClient } from "@/lib/supabase/server";
import { getSportMatches, getSportAnnouncements } from "@/lib/utils/getSportEvent";
import MarkdownText from "@/components/MarkdownText";
import { getCourtDisplay } from "@/lib/utils/getCourtDisplay";
import ShareButton from "@/components/ShareButton";
import QRCodeShare from "@/components/QRCodeShare";

export default async function TennisPage() {
  const supabase = await createClient();
  
  // Get all active Tennis events (DB stores sport in lowercase)
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .eq("sport", "tennis")
    .order("start_date", { ascending: false });

  const activeEvents = events || [];

  // If only one event, show it directly
  // If multiple events, show event list
  const singleEvent = activeEvents.length === 1 ? activeEvents[0] : null;

  // Tournament start date: November 8, 2025 at 08:00 AM Taiwan time (114 academic year)
  // Format: YYYY-MM-DDTHH:MM:SS with explicit timezone (+08:00 for Taiwan)
  const tournamentStartDate = singleEvent?.start_date 
    ? new Date(singleEvent.start_date) 
    : new Date("2025-11-08T08:00:00+08:00");
  const hasStarted = new Date() >= tournamentStartDate;

  // Multiple events - show event list
  if (activeEvents.length > 1) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-8 sm:mb-12 animate-fadeIn">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-ntu-green mb-3 sm:mb-4 text-center">
            🎾 NTU Tennis Events
          </h1>
          <p className="text-base sm:text-lg text-gray-600 text-center px-4">
            選擇一個賽事查看詳情
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {activeEvents.map((event, index) => (
            <Link
              key={event.id}
              href={`/sports/tennis/events/${event.id}`}
              className="bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border border-gray-100 p-5 sm:p-6 animate-scaleIn group"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <h2 className="text-xl sm:text-2xl font-bold text-ntu-green mb-3 sm:mb-4 group-hover:text-green-700 transition-colors">
                {event.name}
              </h2>
              <div className="space-y-2 text-xs sm:text-sm text-gray-700 mb-4">
                <p>
                  <span className="font-semibold">日期：</span>
                  {new Date(event.start_date).toLocaleDateString('zh-TW')} - {new Date(event.end_date).toLocaleDateString('zh-TW')}
                </p>
                <p>
                  <span className="font-semibold">地點：</span>
                  {event.venue}
                </p>
                {event.description && (
                  <p className="text-gray-600 mt-3 line-clamp-2">
                    {event.description}
                  </p>
                )}
              </div>
              <div className="mt-4 sm:mt-5 text-ntu-green font-medium text-sm sm:text-base group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                查看賽事 <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // Single event - show event intro page
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Header Section */}
      <div className="text-center mb-8 sm:mb-12 animate-fadeIn">
        <div className="flex flex-col items-center justify-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-ntu-green px-4 leading-tight">
            {singleEvent?.name || "NTU Tennis – 114 Freshman Cup"}
          </h1>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-4 sm:mt-6 px-4">
          <ShareButton title={singleEvent?.name || "NTU Tennis 賽事"} className="w-full sm:w-auto" />
          <QRCodeShare title="掃描 QR Code 分享此賽事" className="w-full sm:w-auto" />
        </div>
      </div>

      {/* Tournament Overview */}
      {singleEvent && (
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 mb-6 sm:mb-8 border border-gray-100 animate-scaleIn hover:shadow-xl transition-shadow duration-300">
          <h2 className="text-xl sm:text-2xl font-semibold text-ntu-green mb-4 sm:mb-6">賽事概覽</h2>
          <div className="space-y-3 sm:space-y-4 text-gray-700">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-0">
              <span className="font-semibold text-gray-800 min-w-[80px] sm:min-w-[100px] text-sm sm:text-base">日期：</span>
              <span className="text-sm sm:text-base">
                {new Date(singleEvent.start_date).toLocaleDateString('zh-TW')} - {new Date(singleEvent.end_date).toLocaleDateString('zh-TW')}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-0">
              <span className="font-semibold text-gray-800 min-w-[80px] sm:min-w-[100px] text-sm sm:text-base">地點：</span>
              <span className="text-sm sm:text-base">{singleEvent.venue}</span>
            </div>
            {singleEvent.description && (
              <div className="flex flex-col sm:flex-row items-start gap-1 sm:gap-0">
                <span className="font-semibold text-gray-800 min-w-[80px] sm:min-w-[100px] text-sm sm:text-base">說明：</span>
                <span className="text-sm sm:text-base">{singleEvent.description}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Purpose Statement */}
      {singleEvent?.description && (
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 mb-6 sm:mb-8 border border-gray-100 animate-scaleIn hover:shadow-xl transition-shadow duration-300">
          <h2 className="text-xl sm:text-2xl font-semibold text-ntu-green mb-4 sm:mb-6">賽事說明</h2>
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
            {singleEvent.description}
          </p>
        </div>
      )}

      {/* Countdown Timer (only before start) */}
      {!hasStarted && (
        <div className="bg-gradient-to-br from-white to-green-50 rounded-xl shadow-lg p-6 sm:p-8 mb-6 sm:mb-8 border border-gray-100 animate-scaleIn">
          <h2 className="text-xl sm:text-2xl font-semibold text-ntu-green mb-4 sm:mb-6 text-center">
            距離賽事開始
          </h2>
          <CountdownTimerWrapper targetDate={tournamentStartDate} />
        </div>
      )}

      {/* Today's or Tomorrow's Matches */}
      {singleEvent && (async () => {
        const matches = await getSportMatches(singleEvent.id);
        const tz = "Asia/Taipei";
        const now = new Date();
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
        const matchesToShow = hasUpcomingToday ? todayMatches : (matches || [])
          .filter((m: any) => !!m.scheduled_time)
          .filter((m: any) => {
            const d = new Date(m.scheduled_time);
            const dTz = new Date(d.toLocaleString("en-US", { timeZone: tz }));
            return dTz >= nextDayStart && dTz <= nextDayEnd;
          })
          .sort((a: any, b: any) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());
        
        const title = hasUpcomingToday ? "今日賽程（Tennis）" : "明日賽程預告（Tennis）";
        const emptyMessage = hasUpcomingToday ? "今日沒有已排定的比賽。" : "明日沒有已排定的比賽。";
        
        return (
          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-yellow-400 p-4 sm:p-6 mb-6 sm:mb-8 rounded-xl shadow-md animate-scaleIn">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3 sm:mb-4 gap-2">
              <h2 className="text-base sm:text-lg font-semibold text-yellow-800">{title}</h2>
              <span className="text-xs sm:text-sm text-yellow-700">依照目前排定之賽程時間產生</span>
            </div>
            {matchesToShow.length === 0 ? (
              <p className="text-yellow-800 text-sm sm:text-base">{emptyMessage}</p>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto -mx-2">
                  <table className="min-w-full divide-y divide-yellow-200">
                    <thead>
                      <tr className="bg-yellow-100">
                        <th className="px-4 py-3 text-left text-xs font-medium text-yellow-800 uppercase tracking-wider">時間</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-yellow-800 uppercase tracking-wider">場地</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-yellow-800 uppercase tracking-wider">對戰組合</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-yellow-800 uppercase tracking-wider">狀態</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-yellow-200">
                      {matchesToShow.map((m: any) => {
                        const timeStr = new Intl.DateTimeFormat("zh-TW", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Asia/Taipei",
                        }).format(new Date(m.scheduled_time));
                        const court = getCourtDisplay(m);
                        const p1 = m.player1?.name || "TBD";
                        const p2 = m.player2?.name || "TBD";
                        return (
                          <tr key={m.id} className="hover:bg-yellow-50 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-700">{timeStr}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{court}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                              <span className="font-semibold">{p1}</span>
                              <span className="mx-2 text-gray-400">vs</span>
                              <span className="font-semibold">{p2}</span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                              {m.status === "completed" ? (
                                <span className="inline-block px-3 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">已完成</span>
                              ) : m.status === "live" ? (
                                <span className="inline-block px-3 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded-full animate-pulse">進行中</span>
                              ) : m.status === "delayed" ? (
                                <span className="inline-block px-3 py-1 text-xs font-semibold text-amber-700 bg-amber-100 rounded-full">延遲</span>
                              ) : (
                                <span className="inline-block px-3 py-1 text-xs font-semibold text-gray-700 bg-gray-100 rounded-full">即將開始</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {matchesToShow.map((m: any) => {
                    const timeStr = new Intl.DateTimeFormat("zh-TW", {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Asia/Taipei",
                    }).format(new Date(m.scheduled_time));
                    const court = getCourtDisplay(m);
                    const p1 = m.player1?.name || "TBD";
                    const p2 = m.player2?.name || "TBD";
                    return (
                      <div key={m.id} className="bg-white rounded-lg p-4 shadow-sm border border-yellow-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-700">{timeStr}</span>
                          {m.status === "completed" ? (
                            <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">已完成</span>
                          ) : m.status === "live" ? (
                            <span className="px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded-full animate-pulse">進行中</span>
                          ) : m.status === "delayed" ? (
                            <span className="px-2 py-1 text-xs font-semibold text-amber-700 bg-amber-100 rounded-full">延遲</span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-100 rounded-full">即將開始</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mb-2">場地：{court}</div>
                        <div className="text-sm text-gray-800">
                          <span className="font-semibold">{p1}</span>
                          <span className="mx-2 text-gray-400">vs</span>
                          <span className="font-semibold">{p2}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        );
      })()}

      {/* Latest Announcement */}
      {singleEvent && (async () => {
        const anns = await getSportAnnouncements(singleEvent.id);
        const latest = (anns || [])[0];
        if (!latest) return null;
        return (
          <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-100">
            <div className="flex items-start justify-between mb-3">
              <h2 className="text-xl font-semibold text-ntu-green">最新公告</h2>
              <Link href="/sports/tennis/announcements" className="text-ntu-green hover:underline text-sm">
                查看全部 →
              </Link>
            </div>
            <div className="text-sm text-gray-500 mb-2">
              {new Date(latest.created_at).toLocaleString("zh-TW")}
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">{latest.title}</h3>
            <div className="prose max-w-none">
              <MarkdownText content={latest.content} />
            </div>
          </div>
        );
      })()}

      {/* Navigation Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/sports/tennis/draw"
          className="bg-ntu-green text-white rounded-xl shadow-md p-8 hover:shadow-xl transition-all duration-300 hover:scale-105 text-center group"
        >
          <div className="text-center">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-opacity-30 transition-colors">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold mb-3">Draw</h3>
            <p className="text-white text-opacity-90 text-sm">
              View tournament draw and bracket information
            </p>
          </div>
        </Link>

        <Link
          href="/sports/tennis/schedule"
          className="bg-ntu-green text-white rounded-xl shadow-md p-8 hover:shadow-xl transition-all duration-300 hover:scale-105 text-center group"
        >
          <div className="text-center">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-opacity-30 transition-colors">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold mb-3">Schedule</h3>
            <p className="text-white text-opacity-90 text-sm">
              View match schedules and timing information
            </p>
          </div>
        </Link>

        <Link
          href="/sports/tennis/announcements"
          className="bg-ntu-green text-white rounded-xl shadow-md p-8 hover:shadow-xl transition-all duration-300 hover:scale-105 text-center group"
        >
          <div className="text-center">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-opacity-30 transition-colors">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold mb-3">Announcements</h3>
            <p className="text-white text-opacity-90 text-sm">
              Read important announcements and updates
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}

