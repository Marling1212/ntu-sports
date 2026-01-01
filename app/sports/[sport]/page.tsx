import Link from "next/link";
import CountdownTimerWrapper from "@/components/CountdownTimerWrapper";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { getSportMatches, getSportAnnouncements } from "@/lib/utils/getSportEvent";
import MarkdownText from "@/components/MarkdownText";
import { getCourtDisplay } from "@/lib/utils/getCourtDisplay";

// Sport icons mapping
const sportIcons: { [key: string]: string } = {
  Tennis: "🎾",
  Soccer: "⚽",
  Basketball: "🏀",
  Volleyball: "🏐",
  Badminton: "🏸",
  TableTennis: "🏓",
  Baseball: "⚾",
  Softball: "🥎",
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SportPage(context: any) {
  const supabase = await createClient();
  const params = (context?.params || {}) as { sport?: string };
  const sportParam = (params.sport || "").toLowerCase();
  // Capitalize first letter of sport name
  const sportName = sportParam ? sportParam.charAt(0).toUpperCase() + sportParam.slice(1) : "";
  const sportIcon = sportIcons[sportName] || "🏆";
  
  // Get all active events for this sport (case-insensitive)
  // Database stores sport names in lowercase, so normalize the input
  // Only get visible events for public display
  const sportLower = sportParam;
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .eq("sport", sportLower)
    .eq("is_visible", true)
    .order("start_date", { ascending: false });

  const activeEvents = events || [];

  // If no events found, show 404 or empty state
  if (activeEvents.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-ntu-green mb-4">
            {sportIcon} {sportName}
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            No events found for {sportName}. Please check back later.
          </p>
          <Link
            href="/"
            className="text-ntu-green hover:underline font-semibold"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // If only one event, show it directly
  // If multiple events, show event list
  const singleEvent = activeEvents.length === 1 ? activeEvents[0] : null;

  // Tournament start date
  const tournamentStartDate = singleEvent?.start_date 
    ? new Date(singleEvent.start_date) 
    : new Date("2025-11-08T08:00:00+08:00");
  const hasStarted = new Date() >= tournamentStartDate;

  // Multiple events - show event list
  if (activeEvents.length > 1) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-ntu-green mb-4 text-center">
            {sportIcon} NTU {sportName} Events
          </h1>
          <p className="text-lg text-gray-600 text-center">
            選擇一個賽事查看詳情
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeEvents.map((event) => (
            <Link
              key={event.id}
              href={`/sports/${sportParam}/events/${event.id}`}
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 border border-gray-100"
            >
              <h2 className="text-2xl font-bold text-ntu-green mb-3">
                {event.name}
              </h2>
              <div className="space-y-2 text-sm text-gray-700">
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
              <div className="mt-4 text-ntu-green font-medium">
                查看賽事 →
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // Single event - show event intro page
  // Fetch matches and announcements at component level
  let matches: any[] = [];
  let announcements: any[] = [];
  
  if (singleEvent) {
    matches = await getSportMatches(singleEvent.id);
    announcements = await getSportAnnouncements(singleEvent.id);
  }

  // Process matches for display
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
  
  const title = hasUpcomingToday ? `今日賽程（${sportName}）` : `明日賽程預告（${sportName}）`;
  const emptyMessage = hasUpcomingToday ? "今日沒有已排定的比賽。" : "明日沒有已排定的比賽。";
  
  const latestAnnouncement = (announcements || [])[0];

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header Section */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-ntu-green mb-4">
          {singleEvent?.name || `NTU ${sportName} Tournament`}
        </h1>
      </div>

      {/* Tournament Overview */}
      {singleEvent && (
        <div className="bg-white rounded-xl shadow-md p-8 mb-8 border border-gray-100">
          <h2 className="text-2xl font-semibold text-ntu-green mb-4">Tournament Overview</h2>
          <div className="space-y-3 text-gray-700">
            <div className="flex items-start">
              <span className="font-semibold text-gray-800 min-w-[100px]">Type:</span>
              <span>{singleEvent.tournament_type === 'season_play' ? 'Season Play (Regular Season + Playoffs)' : 'Single-elimination Bracket'}</span>
            </div>
            <div className="flex items-start">
              <span className="font-semibold text-gray-800 min-w-[100px]">Dates:</span>
              <span>
                {new Date(singleEvent.start_date).toLocaleDateString('zh-TW')} - {new Date(singleEvent.end_date).toLocaleDateString('zh-TW')}
              </span>
            </div>
            <div className="flex items-start">
              <span className="font-semibold text-gray-800 min-w-[100px]">Venue:</span>
              <span>{singleEvent.venue}</span>
            </div>
            {singleEvent.description && (
              <div className="flex items-start">
                <span className="font-semibold text-gray-800 min-w-[100px]">Description:</span>
                <span>{singleEvent.description}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Today's or Tomorrow's Matches */}
      {singleEvent && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8 rounded-lg">
          <div className="flex items-start justify-between mb-3">
            <h2 className="text-lg font-semibold text-yellow-800">{title}</h2>
            <span className="text-sm text-yellow-700">依照目前排定之賽程時間產生</span>
          </div>
          {matchesToShow.length === 0 ? (
            <p className="text-yellow-800 text-sm">{emptyMessage}</p>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="min-w-full divide-y divide-yellow-200">
                <thead>
                  <tr className="bg-yellow-100">
                    <th className="px-3 py-2 text-left text-xs font-medium text-yellow-800 uppercase tracking-wider">時間</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-yellow-800 uppercase tracking-wider">場地</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-yellow-800 uppercase tracking-wider">對戰組合</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-yellow-800 uppercase tracking-wider">狀態</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-yellow-200">
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
      )}

      {/* Latest Announcement */}
      {singleEvent && latestAnnouncement && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-100">
          <div className="flex items-start justify-between mb-3">
            <h2 className="text-xl font-semibold text-ntu-green">最新公告</h2>
            <Link href={`/sports/${sportParam}/announcements`} className="text-ntu-green hover:underline text-sm">
              查看全部 →
            </Link>
          </div>
          <div className="text-sm text-gray-500 mb-2">
            {new Date(latestAnnouncement.created_at).toLocaleString("zh-TW")}
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">{latestAnnouncement.title}</h3>
          <div className="prose max-w-none">
            <MarkdownText content={latestAnnouncement.content} />
          </div>
        </div>
      )}

      {/* Purpose Statement */}
      {singleEvent?.description && (
        <div className="bg-white rounded-xl shadow-md p-8 mb-8 border border-gray-100">
          <h2 className="text-2xl font-semibold text-ntu-green mb-4">賽事說明</h2>
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
            {singleEvent.description}
          </p>
        </div>
      )}

      {/* Countdown Timer (only show before start) */}
      {!hasStarted && (
        <div className="bg-white rounded-xl shadow-md p-8 mb-8 border border-gray-100">
          <h2 className="text-2xl font-semibold text-ntu-green mb-6 text-center">
            Time Until Tournament Starts
          </h2>
          <CountdownTimerWrapper targetDate={tournamentStartDate} />
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href={`/sports/${sportParam}/draw`}
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
            <h3 className="text-2xl font-semibold mb-3">
              {singleEvent?.tournament_type === 'season_play' ? 'Season Overview' : 'Draw'}
            </h3>
            <p className="text-white text-opacity-90 text-sm">
              {singleEvent?.tournament_type === 'season_play'
                ? 'View regular season schedule, groups, standings, and playoffs'
                : 'View tournament draw and bracket information'}
            </p>
          </div>
        </Link>

        <Link
          href={`/sports/${sportParam}/schedule`}
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
              {singleEvent?.tournament_type === 'season_play'
                ? 'Full season schedule by date and time'
                : 'Match schedules and timing information'}
            </p>
          </div>
        </Link>

        <Link
          href={`/sports/${sportParam}/announcements`}
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

