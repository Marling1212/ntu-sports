import { createClient } from "@/lib/supabase/server";
import { getEventForPublicPage, getDivisionIdsForEventAndSport, getSportMatches, getSportAnnouncements } from "@/lib/utils/getSportEvent";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import CountdownTimerWrapper from "@/components/CountdownTimerWrapper";
import MarkdownText from "@/components/MarkdownText";
import { getCourtDisplay } from "@/lib/utils/getCourtDisplay";
import { getMatchTimeDisplay } from "@/lib/utils/formatScheduledTime";
import { processMatchesForDisplay } from "@/lib/utils/matchFilters";
import { getLocale, getT } from "@/lib/i18n/server";
import EventSponsorBanner from "@/components/EventSponsorBanner";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sport: string; eventId: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const event = await getEventByIdAndSport(resolvedParams.eventId, resolvedParams.sport.toLowerCase());
  
  if (!event) {
    return {
      title: 'Event Not Found | NTU Sports',
    };
  }

  const title = `${event.name} | 臺大體育賽事`;
  const description = event.description || `View schedules, draws, and announcements for ${event.name}.`;
  
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
  };
}

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

export default async function SportEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ sport: string; eventId: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const resolvedParams = await params;
  const { preview } = await searchParams;
  const sport = resolvedParams.sport;
  const eventId = resolvedParams.eventId;
  const locale = await getLocale();
  const t = getT(locale);
  const supabase = await createClient();
  const sportParam = sport.toLowerCase();
  const sportName = sportParam ? sportParam.charAt(0).toUpperCase() + sportParam.slice(1) : "";
  const sportIcon = sportIcons[sportName] || "🏆";

  const event = await getEventForPublicPage(eventId, sportParam, { preview });
  if (!event) notFound();

  // Division filter: show only matches/players for this sport within the event
  const divisionIds = await getDivisionIdsForEventAndSport(event.id, sportParam);
  const matches = await getSportMatches(event.id, divisionIds.length > 0 ? divisionIds : undefined);
  const announcements = await getSportAnnouncements(event.id);

  const tournamentStartDate = event.start_date
    ? new Date(event.start_date)
    : new Date("2025-11-08T08:00:00+08:00");
  const hasStarted = new Date() >= tournamentStartDate;
  const { data: sponsorsRaw } = await supabase
    .from("sponsors")
    .select("id, name, logo_url, website_url, tier")
    .eq("event_id", event.id);
  const tierOrder = { Gold: 0, Silver: 1, Bronze: 2 } as const;
  const sponsors = (sponsorsRaw || []).sort(
    (a, b) => (tierOrder[a.tier as keyof typeof tierOrder] ?? 3) - (tierOrder[b.tier as keyof typeof tierOrder] ?? 3)
  );

  // Process matches for display using shared utility
  const { matchesToShow, titleKey, emptyMessageKey } = processMatchesForDisplay(matches);
  const title = t(titleKey).replace("{sport}", sportName);
  const emptyMessage = t(emptyMessageKey);
  
  const latestAnnouncement = (announcements || [])[0];

  return (
    <div className="container mx-auto px-4 py-12 pb-[max(2rem,env(safe-area-inset-bottom)+140px)]">
      {preview === "1" && (
        <div className="mb-6 p-4 bg-amber-100 border border-amber-400 rounded-lg text-amber-900">
          <p className="font-semibold">{locale === "zh" ? "管理員預覽" : "Admin preview"}</p>
          <p className="text-sm mt-1">{locale === "zh" ? "此賽事目前對外隱藏，僅你可見此頁面。公開後，觀眾將看到與此相同內容。" : "This event is currently hidden from the public. Only you can see this page. When you make it visible, the public will see this same content."}</p>
        </div>
      )}
      {/* Header Section */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-ntu-green mb-4">
          {sportIcon} {event.name || t("sports.ntuSportTournament").replace("{sport}", sportName)}
        </h1>
      </div>

      {/* Sponsors - moved to top for maximum visibility */}
      {sponsors.length > 0 && (
        <EventSponsorBanner
          sponsors={sponsors.map((s) => ({ id: s.id, name: s.name, logo_url: s.logo_url, website_url: s.website_url }))}
          label="Supported by"
        />
      )}

      {/* Tournament Overview */}
      <div className="bg-white rounded-xl shadow-md p-8 mb-8 border border-gray-100">
        <h2 className="text-2xl font-semibold text-ntu-green mb-4">{t("sports.tournamentOverview")}</h2>
        <div className="space-y-3 text-gray-700">
          <div className="flex items-start">
            <span className="font-semibold text-gray-800 min-w-[100px]">{t("sports.typeLabel")}:</span>
            <span>{event.tournament_type === 'season_play' ? t("sports.tournamentTypeSeason") : t("sports.tournamentTypeBracket")}</span>
          </div>
          <div className="flex items-start">
            <span className="font-semibold text-gray-800 min-w-[100px]">{t("sports.dateLabel")}:</span>
            <span>
              {new Date(event.start_date).toLocaleDateString(locale === "zh" ? "zh-TW" : "en-US")} - {new Date(event.end_date).toLocaleDateString(locale === "zh" ? "zh-TW" : "en-US")}
            </span>
          </div>
          <div className="flex items-start">
            <span className="font-semibold text-gray-800 min-w-[100px]">{t("sports.venueLabel")}:</span>
            <span>{event.venue}</span>
          </div>
          {event.description && (
            <div className="flex items-start">
              <span className="font-semibold text-gray-800 min-w-[100px]">{t("sports.descriptionLabel")}:</span>
              <span>{event.description}</span>
            </div>
          )}
        </div>
      </div>

      {/* Today's or Tomorrow's Matches */}
      {matchesToShow.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8 rounded-lg">
          <div className="flex items-start justify-between mb-3">
            <h2 className="text-lg font-semibold text-yellow-800">{title}</h2>
          </div>
          <div className="overflow-x-auto -mx-2">
            <table className="min-w-full divide-y divide-yellow-200">
              <thead>
                <tr className="bg-yellow-100">
                  <th className="px-3 py-2 text-left text-xs font-medium text-yellow-800 uppercase tracking-wider">{t("sports.time")}</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-yellow-800 uppercase tracking-wider">{t("sports.court")}</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-yellow-800 uppercase tracking-wider">{t("sports.matchup")}</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-yellow-800 uppercase tracking-wider">{t("sports.status")}</th>
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
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">{timeStr}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">{court}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800">
                        <Link 
                          href={`/sports/${sportParam}/matches/${m.id}`}
                          className="hover:text-ntu-green hover:underline"
                        >
                          <span className="font-semibold">{p1}</span>
                          <span className="mx-2 text-gray-400">{t("sports.vs")}</span>
                          <span className="font-semibold">{p2}</span>
                        </Link>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-center">
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

      {matchesToShow.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 p-6 mb-8 rounded-xl flex items-center justify-center min-h-[120px]">
          <p className="text-gray-500 font-medium text-center">{emptyMessage}</p>
        </div>
      )}

      {/* Latest Announcement */}
      {latestAnnouncement && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-100">
          <div className="flex items-start justify-between mb-3">
            <h2 className="text-xl font-semibold text-ntu-green">{t("announcements.title")}</h2>
            <Link href={`/sports/${sportParam}/events/${event.id}/announcements`} className="text-ntu-green hover:underline text-sm">
              {t("announcements.viewAllArrow")}
            </Link>
          </div>
          <div className="text-sm text-gray-500 mb-2">
            {new Date(latestAnnouncement.created_at).toLocaleString(locale === "zh" ? "zh-TW" : "en-US")}
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">{latestAnnouncement.title}</h3>
          <div className="prose max-w-none">
            <MarkdownText content={latestAnnouncement.content} />
          </div>
        </div>
      )}

      {/* Countdown Timer (only show before start) */}
      {!hasStarted && (
        <div className="bg-white rounded-xl shadow-md p-8 mb-8 border border-gray-100">
          <h2 className="text-2xl font-semibold text-ntu-green mb-6 text-center">
            {t("sports.timeUntilStart")}
          </h2>
          <CountdownTimerWrapper targetDate={tournamentStartDate} />
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-1 gap-3 sm:gap-6 md:grid-cols-4">
        <Link
          href={`/sports/${sportParam}/events/${event.id}/draw`}
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
              {event.tournament_type === 'season_play' ? t("navigation.seasonOverview") : t("navigation.draw")}
            </h3>
            <p className="text-white text-opacity-90 text-xs sm:text-sm hidden sm:block">
              {event.tournament_type === 'season_play'
                ? t("navigation.seasonOverviewDescription")
                : t("navigation.drawDescription")}
            </p>
          </div>
        </Link>

        <Link
          href={`/sports/${sportParam}/events/${event.id}/schedule`}
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
              {event.tournament_type === 'season_play'
                ? t("schedule.fullSeasonDesc")
                : t("schedule.matchSchedulesDesc")}
            </p>
          </div>
        </Link>

        <Link
          href={`/sports/${sportParam}/events/${event.id}/rules`}
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
          href={`/sports/${sportParam}/events/${event.id}/announcements`}
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

