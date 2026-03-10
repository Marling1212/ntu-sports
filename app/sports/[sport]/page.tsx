import Link from "next/link";
import { Metadata } from "next";
import CountdownTimerWrapper from "@/components/CountdownTimerWrapper";
import { createClient } from "@/lib/supabase/server";
import { getEventIdsForSport, getDivisionIdsForEventAndSport, getSportMatches, getSportAnnouncements } from "@/lib/utils/getSportEvent";
import MarkdownText from "@/components/MarkdownText";
import { getCourtDisplay } from "@/lib/utils/getCourtDisplay";
import { getMatchTimeDisplay } from "@/lib/utils/formatScheduledTime";
import { processMatchesForDisplay } from "@/lib/utils/matchFilters";
import { getLocale, getT } from "@/lib/i18n/server";

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

export async function generateMetadata(context: any): Promise<Metadata> {
  const params = await context.params;
  const sportParam = (params?.sport || "").toLowerCase();
  const sportName = sportParam ? sportParam.charAt(0).toUpperCase() + sportParam.slice(1) : "";
  const title = `NTU ${sportName} | 臺大體育賽事`;
  
  return {
    title,
    description: `NTU ${sportName} tournaments, matches, and standings.`,
    openGraph: {
      title,
      description: `NTU ${sportName} tournaments, matches, and standings.`,
      type: "website",
    },
  };
}

export default async function SportPage(context: any) {
  const locale = await getLocale();
  const t = getT(locale);
  const supabase = await createClient();
  const params = (await context?.params) || {};
  const sportParam = (params.sport || "").toLowerCase();
  const sportName = sportParam ? sportParam.charAt(0).toUpperCase() + sportParam.slice(1) : "";
  const sportIcon = sportIcons[sportName] || "🏆";

  // Get all visible events that have this sport (event.sport or event_divisions)
  const eventIds = await getEventIdsForSport(sportParam);
  const { data: events } = eventIds.length > 0
    ? await supabase
        .from("events")
        .select("*")
        .in("id", eventIds)
        .eq("is_visible", true)
        .order("start_date", { ascending: false })
    : { data: [] };
  const activeEvents = events || [];

  if (activeEvents.length === 0) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-12">
        <div className="text-center">
          <h1 className="text-2xl sm:text-5xl font-bold text-ntu-green mb-3 sm:mb-4">
            {sportIcon} {sportName}
          </h1>
          <p className="text-sm sm:text-lg text-gray-600 mb-6 sm:mb-8">
            {t("sports.noEventsForSport").replace("{sport}", sportName)}
          </p>
          <Link
            href="/"
            className="text-ntu-green hover:underline font-semibold"
          >
            ← {t("common.backToHome")}
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

  if (activeEvents.length > 1) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-12">
        <div className="mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-5xl font-bold text-ntu-green mb-2 sm:mb-4 text-center">
            {sportIcon} {t("sports.ntuSportEvents").replace("{sport}", sportName)}
          </h1>
          <p className="text-sm sm:text-lg text-gray-600 text-center">
            {t("sports.selectEvent")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {activeEvents.map((event) => (
            <Link
              key={event.id}
              href={`/sports/${sportParam}/events/${event.id}`}
              className="bg-white rounded-lg sm:rounded-xl shadow-md p-4 sm:p-6 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] sm:hover:scale-105 border border-gray-100"
            >
              <h2 className="text-lg sm:text-2xl font-bold text-ntu-green mb-2 sm:mb-3">
                {event.name}
              </h2>
              <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-gray-700">
                <p>
                  <span className="font-semibold">{t("sports.dateLabel")}：</span>
                  {new Date(event.start_date).toLocaleDateString(locale === "zh" ? "zh-TW" : "en-US")} - {new Date(event.end_date).toLocaleDateString(locale === "zh" ? "zh-TW" : "en-US")}
                </p>
                <p>
                  <span className="font-semibold">{t("sports.venueLabel")}：</span>
                  {event.venue}
                </p>
                {event.description && (
                  <p className="text-gray-600 mt-3 line-clamp-2">
                    {event.description}
                  </p>
                )}
              </div>
              <div className="mt-4 text-ntu-green font-medium">
                {t("sports.viewEventArrow")}
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
    const divisionIds = await getDivisionIdsForEventAndSport(singleEvent.id, sportParam);
    matches = await getSportMatches(singleEvent.id, divisionIds.length > 0 ? divisionIds : undefined);
    announcements = await getSportAnnouncements(singleEvent.id);
  }

  // Process matches for display using shared utility
  const { matchesToShow, titleKey, emptyMessageKey } = processMatchesForDisplay(matches);
  const title = t(titleKey).replace("{sport}", sportName);
  const emptyMessage = t(emptyMessageKey);
  
  const latestAnnouncement = (announcements || [])[0];

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-12 pb-[max(2rem,env(safe-area-inset-bottom)+40px)]">
      {/* Header Section: compact on mobile */}
      <div className="text-center mb-4 sm:mb-12">
        <h1 className="text-2xl sm:text-5xl font-bold text-ntu-green mb-2 sm:mb-4 leading-tight">
          {singleEvent?.name || `NTU ${sportName} Tournament`}
        </h1>
      </div>

      {/* Tournament Overview: labels de‑emphasized so data stands out */}
      {singleEvent && (
        <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-4 sm:p-8 mb-4 sm:mb-8 border border-gray-100">
          <h2 className="text-xs sm:text-2xl font-semibold text-gray-400 sm:text-ntu-green mb-2 sm:mb-4 uppercase tracking-wider sm:normal-case sm:tracking-normal">{t("sports.tournamentOverview")}</h2>
          <div className="space-y-1.5 sm:space-y-3 text-sm sm:text-base">
            <div className="flex items-start gap-2">
              <span className="text-gray-400 sm:text-gray-800 text-xs sm:text-base shrink-0 w-14 sm:min-w-[100px]">{t("sports.typeLabel")}</span>
              <span className="text-gray-800 font-medium">{singleEvent.tournament_type === "season_play" ? t("sports.tournamentTypeSeason") : t("sports.tournamentTypeBracket")}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-gray-400 sm:text-gray-800 text-xs sm:text-base shrink-0 w-14 sm:min-w-[100px]">{t("sports.dates")}</span>
              <span className="text-gray-800 font-medium">
                {new Date(singleEvent.start_date).toLocaleDateString(locale === "zh" ? "zh-TW" : "en-US")} – {new Date(singleEvent.end_date).toLocaleDateString(locale === "zh" ? "zh-TW" : "en-US")}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-gray-400 sm:text-gray-800 text-xs sm:text-base shrink-0 w-14 sm:min-w-[100px]">{t("sports.venue")}</span>
              <span className="text-gray-800 font-medium">{singleEvent.venue}</span>
            </div>
            {singleEvent.description && (
              <div className="flex items-start gap-2">
                <span className="text-gray-400 sm:text-gray-800 text-xs sm:text-base shrink-0 w-14 sm:min-w-[100px]">{t("sports.descriptionLabel")}</span>
                <span className="text-gray-800">{singleEvent.description}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Today's or Tomorrow's Matches */}
      {singleEvent && (
        <>
          {matchesToShow.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 p-6 sm:p-8 mb-4 sm:mb-8 rounded-lg sm:rounded-xl flex items-center justify-center min-h-[120px]">
              <p className="text-gray-500 font-medium text-center text-sm sm:text-base">{emptyMessage}</p>
            </div>
          ) : (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 sm:p-4 mb-4 sm:mb-8 rounded-lg">
              <div className="flex items-start justify-between mb-2 sm:mb-3">
                <h2 className="text-base sm:text-lg font-semibold text-yellow-800">{title}</h2>
              </div>
              <div className="overflow-x-auto -mx-2">
                <table className="min-w-full divide-y divide-yellow-200">
                  <thead>
                    <tr className="bg-yellow-100">
                      <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[10px] sm:text-xs font-medium text-yellow-800 uppercase tracking-wider">{t("sports.time")}</th>
                      <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[10px] sm:text-xs font-medium text-yellow-800 uppercase tracking-wider">{t("sports.court")}</th>
                      <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[10px] sm:text-xs font-medium text-yellow-800 uppercase tracking-wider">{t("sports.matchup")}</th>
                      <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-center text-[10px] sm:text-xs font-medium text-yellow-800 uppercase tracking-wider">{t("sports.status")}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-yellow-200">
                    {matchesToShow.map((m: any) => {
                      const timeStr = getMatchTimeDisplay(m);
                      const court = getCourtDisplay(m);
                      const p1 = m.player1?.name || "TBD";
                      const p2 = m.player2?.name || "TBD";
                      return (
                        <tr key={m.id}>
                          <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap text-xs sm:text-sm text-gray-700">{timeStr}</td>
                          <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap text-xs sm:text-sm text-gray-700">{court}</td>
                          <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap text-xs sm:text-sm text-gray-800">
                            <span className="font-semibold">{p1}</span>
                            <span className="mx-1 sm:mx-2 text-gray-400">{t("sports.vs")}</span>
                            <span className="font-semibold">{p2}</span>
                          </td>
                          <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap text-xs sm:text-sm text-center">
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
          )}
        </>
      )}

      {/* Latest Announcement: section title subtle, content prominent */}
      {singleEvent && latestAnnouncement && (
        <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-4 sm:p-6 mb-4 sm:mb-8 border border-gray-100">
          <div className="flex items-start justify-between mb-1.5 sm:mb-3">
            <h2 className="text-xs sm:text-xl font-semibold text-gray-400 sm:text-ntu-green uppercase tracking-wider sm:normal-case sm:tracking-normal">{t("announcements.title")}</h2>
            <Link href={`/sports/${sportParam}/events/${singleEvent.id}/announcements`} className="text-gray-400 sm:text-ntu-green hover:underline text-xs sm:text-sm">
              {t("announcements.viewAllArrow")}
            </Link>
          </div>
          <div className="text-xs sm:text-sm text-gray-400 mb-1.5 sm:mb-2">
            {new Date(latestAnnouncement.created_at).toLocaleString(locale === "zh" ? "zh-TW" : "en-US")}
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2">{latestAnnouncement.title}</h3>
          <div className="prose max-w-none">
            <MarkdownText content={latestAnnouncement.content} />
          </div>
        </div>
      )}

      {/* Countdown Timer (only show before start) */}
      {!hasStarted && (
        <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-4 sm:p-8 mb-4 sm:mb-8 border border-gray-100">
          <h2 className="text-xs sm:text-2xl font-semibold text-gray-400 sm:text-ntu-green mb-3 sm:mb-6 text-center uppercase tracking-wider sm:normal-case sm:tracking-normal">
            {t("sports.timeUntilStart")}
          </h2>
          <CountdownTimerWrapper targetDate={tournamentStartDate} />
        </div>
      )}

      {/* Navigation Buttons: compact on mobile */}
      <div className="grid grid-cols-2 sm:grid-cols-1 gap-3 sm:gap-6 md:grid-cols-4">
        <Link
          href={`/sports/${sportParam}/events/${singleEvent.id}/draw`}
          className="bg-ntu-green text-white rounded-lg sm:rounded-xl shadow-md p-4 sm:p-8 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] sm:hover:scale-105 text-center group"
        >
          <div className="text-center">
            <div className="w-10 h-10 sm:w-16 sm:h-16 bg-white bg-opacity-20 rounded-lg flex items-center justify-center mx-auto mb-2 sm:mb-4 group-hover:bg-opacity-30 transition-colors">
              <svg
                className="w-5 h-5 sm:w-8 sm:h-8 text-white"
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
            <h3 className="text-base sm:text-2xl font-semibold mb-1 sm:mb-3">
              {singleEvent?.tournament_type === "season_play" ? t("navigation.seasonOverview") : t("navigation.draw")}
            </h3>
            <p className="text-white text-opacity-90 text-xs sm:text-sm hidden sm:block">
              {singleEvent?.tournament_type === "season_play" ? t("navigation.drawDescription") : t("navigation.drawDescription")}
            </p>
          </div>
        </Link>

        <Link
          href={`/sports/${sportParam}/events/${singleEvent.id}/schedule`}
          className="bg-ntu-green text-white rounded-lg sm:rounded-xl shadow-md p-4 sm:p-8 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] sm:hover:scale-105 text-center group"
        >
          <div className="text-center">
            <div className="w-10 h-10 sm:w-16 sm:h-16 bg-white bg-opacity-20 rounded-lg flex items-center justify-center mx-auto mb-2 sm:mb-4 group-hover:bg-opacity-30 transition-colors">
              <svg
                className="w-5 h-5 sm:w-8 sm:h-8 text-white"
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
            <h3 className="text-base sm:text-2xl font-semibold mb-1 sm:mb-3">{t("navigation.schedule")}</h3>
            <p className="text-white text-opacity-90 text-xs sm:text-sm hidden sm:block">
              {t("navigation.scheduleDescription")}
            </p>
          </div>
        </Link>

        <Link
          href={`/sports/${sportParam}/events/${singleEvent.id}/rules`}
          className="bg-ntu-green text-white rounded-lg sm:rounded-xl shadow-md p-4 sm:p-8 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] sm:hover:scale-105 text-center group"
        >
          <div className="text-center">
            <div className="w-10 h-10 sm:w-16 sm:h-16 bg-white bg-opacity-20 rounded-lg flex items-center justify-center mx-auto mb-2 sm:mb-4 group-hover:bg-opacity-30 transition-colors">
              <svg
                className="w-5 h-5 sm:w-8 sm:h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-base sm:text-2xl font-semibold mb-1 sm:mb-3">{t("navigation.rules")}</h3>
            <p className="text-white text-opacity-90 text-xs sm:text-sm hidden sm:block">
              {t("navigation.rulesDescription")}
            </p>
          </div>
        </Link>

        <Link
          href={`/sports/${sportParam}/events/${singleEvent.id}/announcements`}
          className="bg-ntu-green text-white rounded-lg sm:rounded-xl shadow-md p-4 sm:p-8 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] sm:hover:scale-105 text-center group"
        >
          <div className="text-center">
            <div className="w-10 h-10 sm:w-16 sm:h-16 bg-white bg-opacity-20 rounded-lg flex items-center justify-center mx-auto mb-2 sm:mb-4 group-hover:bg-opacity-30 transition-colors">
              <svg
                className="w-5 h-5 sm:w-8 sm:h-8 text-white"
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
            <h3 className="text-base sm:text-2xl font-semibold mb-1 sm:mb-3">{t("navigation.announcements")}</h3>
            <p className="text-white text-opacity-90 text-xs sm:text-sm hidden sm:block">
              {t("navigation.announcementsDescription")}
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}

