import { createClient } from "@/lib/supabase/server";
import { getEventByIdAndSport, getEventForPublicPage, getDivisionIdsForEventAndSport, getSportMatches, getSportAnnouncements } from "@/lib/utils/getSportEvent";
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

function formatDateRange(
  startDateStr: string | null | undefined,
  endDateStr: string | null | undefined,
  locale: string
): string {
  if (!startDateStr || !endDateStr) return "—";
  const start = new Date(startDateStr.replace(/-/g, "/"));
  const end = new Date(endDateStr.replace(/-/g, "/"));
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return `${startDateStr} – ${endDateStr}`;
  }
  const isZh = locale === "zh";
  const startFormatted = start.toLocaleDateString(isZh ? "zh-TW" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const sameYear = start.getFullYear() === end.getFullYear();
  const endFormatted = end.toLocaleDateString(isZh ? "zh-TW" : "en-US", {
    ...(sameYear ? {} : { year: "numeric" as const }),
    month: "2-digit",
    day: "2-digit",
  });
  return `${startFormatted} – ${endFormatted}`;
}

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
  const previewSuffix = preview === "1" ? "?preview=1" : "";

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
    <div className="container mx-auto px-4 py-6 sm:py-10 pb-24 sm:pb-12">
      {preview === "1" && (
        <div className="mb-6 p-4 bg-amber-100 border border-amber-400 rounded-lg text-amber-900">
          <p className="font-semibold">{locale === "zh" ? "管理員預覽" : "Admin preview"}</p>
          <p className="text-sm mt-1">{locale === "zh" ? "此賽事目前對外隱藏，僅你可見此頁面。公開後，觀眾將看到與此相同內容。" : "This event is currently hidden from the public. Only you can see this page. When you make it visible, the public will see this same content."}</p>
        </div>
      )}
      {/* Header Section */}
      <div className="text-center mb-6 sm:mb-10">
        <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 mb-2 sm:mb-3">
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

      {/* Compact Tournament Overview Card */}
      <div className="bg-white rounded-xl shadow-xs sm:shadow-md p-4 sm:p-6 mb-6 sm:mb-8 border border-slate-200/80">
        <h2 className="text-base sm:text-xl font-semibold text-slate-900 mb-3 sm:mb-4">
          {t("sports.tournamentOverview")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4">
          {/* Type */}
          <div className="bg-slate-50/80 rounded-lg p-3 border border-slate-100 flex flex-col justify-center">
            <span className="text-xs text-slate-400 font-medium mb-1">
              {t("sports.typeLabel")}
            </span>
            <span className="text-sm font-semibold text-slate-800">
              {event.tournament_type === "season_play"
                ? t("sports.tournamentTypeSeason")
                : t("sports.tournamentTypeBracket")}
            </span>
          </div>

          {/* Dates */}
          <div className="bg-slate-50/80 rounded-lg p-3 border border-slate-100 flex flex-col justify-center">
            <span className="text-xs text-slate-400 font-medium mb-1">
              {t("sports.dateLabel")}
            </span>
            <span className="text-sm font-semibold text-slate-800">
              {formatDateRange(event.start_date, event.end_date, locale)}
            </span>
          </div>

          {/* Venue */}
          <div className="bg-slate-50/80 rounded-lg p-3 border border-slate-100 flex flex-col justify-center">
            <span className="text-xs text-slate-400 font-medium mb-1">
              {t("sports.venueLabel")}
            </span>
            <span className="text-sm font-semibold text-slate-800 truncate" title={event.venue}>
              {event.venue || "—"}
            </span>
          </div>
        </div>

        {event.description && (
          <div className="mt-3 pt-3 border-t border-slate-100 text-xs sm:text-sm text-slate-600 leading-relaxed">
            {event.description}
          </div>
        )}
      </div>

      {/* Today's or Tomorrow's Matches */}
      {matchesToShow.length > 0 && (
        <div className="bg-white rounded-xl shadow-xs sm:shadow-md p-4 sm:p-6 mb-6 sm:mb-8 border border-slate-200/80">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-xl font-semibold text-slate-900">{title}</h2>
          </div>

          {/* Mobile Layout: Touch-friendly Match Cards */}
          <div className="space-y-3 sm:hidden">
            {matchesToShow.map((m: any) => {
              const timeStr = getMatchTimeDisplay(m);
              const court = getCourtDisplay(m);
              const p1 = m.player1?.name || "TBD";
              const p2 = m.player2?.name || "TBD";
              return (
                <Link
                  key={m.id}
                  href={`/sports/${sportParam}/matches/${m.id}${previewSuffix}`}
                  className="block bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-xs hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <span>🕒 {timeStr}</span>
                    {m.status === "completed" ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {t("sports.completed")}
                      </span>
                    ) : m.status === "live" ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                        {t("sports.live")}
                      </span>
                    ) : m.status === "delayed" ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        {t("sports.delayed")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        {t("sports.upcoming")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between font-bold text-slate-900 text-sm">
                    <span className="truncate flex-1">{p1}</span>
                    <span className="text-xs font-semibold text-slate-400 px-2 shrink-0">{t("sports.vs")}</span>
                    <span className="truncate flex-1 text-right">{p2}</span>
                  </div>
                  {court && (
                    <div className="text-[11px] text-slate-400 mt-2 truncate">📍 {court}</div>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Tablet/Desktop Layout: Clean Data Table */}
          <div className="hidden sm:block overflow-x-auto -mx-2 sm:mx-0">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr className="bg-slate-50/80">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">{t("sports.time")}</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">{t("sports.court")}</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">{t("sports.matchup")}</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">{t("sports.status")}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {matchesToShow.map((m: any) => {
                  const timeStr = getMatchTimeDisplay(m);
                  const court = getCourtDisplay(m);
                  const p1 = m.player1?.name || "TBD";
                  const p2 = m.player2?.name || "TBD";
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">{timeStr}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">{court}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-800">
                        <Link 
                          href={`/sports/${sportParam}/matches/${m.id}${previewSuffix}`}
                          className="hover:text-ntu-green hover:underline"
                        >
                          <span className="font-semibold">{p1}</span>
                          <span className="mx-2 text-slate-400">{t("sports.vs")}</span>
                          <span className="font-semibold">{p2}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        {m.status === "completed" ? (
                          <span className="inline-block px-2.5 py-0.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full">{t("sports.completed")}</span>
                        ) : m.status === "live" ? (
                          <span className="inline-block px-2.5 py-0.5 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-full animate-pulse">{t("sports.live")}</span>
                        ) : m.status === "delayed" ? (
                          <span className="inline-block px-2.5 py-0.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full">{t("sports.delayed")}</span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full">{t("sports.upcoming")}</span>
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
        <div className="bg-white border border-slate-200/80 p-6 mb-6 sm:mb-8 rounded-xl shadow-xs flex items-center justify-center min-h-[100px]">
          <p className="text-slate-500 font-medium text-center text-sm">{emptyMessage}</p>
        </div>
      )}

      {/* Latest Announcement */}
      {latestAnnouncement && (
        <div className="bg-white rounded-xl shadow-xs sm:shadow-md p-4 sm:p-6 mb-6 sm:mb-8 border border-slate-200/80">
          <div className="flex items-start justify-between mb-3">
            <h2 className="text-base sm:text-xl font-semibold text-slate-900">{t("announcements.title")}</h2>
            <Link href={`/sports/${sportParam}/events/${event.id}/announcements${previewSuffix}`} className="text-emerald-600 hover:text-emerald-700 font-medium text-xs sm:text-sm">
              {t("announcements.viewAllArrow")}
            </Link>
          </div>
          <div className="text-xs text-slate-400 mb-2">
            {new Date(latestAnnouncement.created_at).toLocaleString(locale === "zh" ? "zh-TW" : "en-US")}
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-2">{latestAnnouncement.title}</h3>
          <div className="prose max-w-none text-slate-600 text-sm">
            <MarkdownText content={latestAnnouncement.content} />
          </div>
        </div>
      )}

      {/* Countdown Timer (only show before start) */}
      {!hasStarted && (
        <div className="bg-white rounded-xl shadow-xs sm:shadow-md p-4 sm:p-8 mb-6 sm:mb-8 border border-slate-200/80">
          <h2 className="text-base sm:text-xl font-semibold text-slate-900 mb-4 sm:mb-6 text-center">
            {t("sports.timeUntilStart")}
          </h2>
          <CountdownTimerWrapper targetDate={tournamentStartDate} />
        </div>
      )}
    </div>
  );
}

