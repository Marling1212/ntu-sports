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
  _locale?: string
): string {
  if (!startDateStr || !endDateStr) return "—";

  const extractParts = (str: string) => {
    // 1. Regex match for YYYY-MM-DD or YYYY/MM/DD (strips any T... timestamp / timezone)
    const match = str.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
    if (match) {
      return { year: match[1], month: match[2], day: match[3] };
    }
    // 2. Fallback to Date object
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const year = String(d.getFullYear());
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return { year, month, day };
    }
    // 3. Fallback: split by T and clean
    const cleaned = str.split("T")[0].replace(/-/g, "/");
    return { raw: cleaned };
  };

  const s = extractParts(startDateStr);
  const e = extractParts(endDateStr);

  if ("year" in s && "year" in e) {
    if (s.year === e.year) {
      return `${s.year}/${s.month}/${s.day} – ${e.month}/${e.day}`;
    }
    return `${s.year}/${s.month}/${s.day} – ${e.year}/${e.month}/${e.day}`;
  }

  const sStr = "raw" in s ? s.raw : `${s.year}/${s.month}/${s.day}`;
  const eStr = "raw" in e ? e.raw : `${e.year}/${e.month}/${e.day}`;
  return `${sStr} – ${eStr}`;
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

      {/* Tournament Overview: Compact Pill Cluster */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-6 sm:mb-8 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-slate-700 font-medium border border-slate-200/80 shadow-2xs">
          <span>🏆</span>
          <span>
            {event.tournament_type === "season_play"
              ? t("sports.tournamentTypeSeason")
              : t("sports.tournamentTypeBracket")}
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-slate-700 font-medium border border-slate-200/80 shadow-2xs">
          <span>📅</span>
          <span>{formatDateRange(event.start_date, event.end_date, locale)}</span>
        </span>
        {event.venue && event.venue.trim() !== "" && event.venue !== "—" && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-slate-700 font-medium border border-slate-200/80 shadow-2xs truncate max-w-[260px]">
            <span>📍</span>
            <span className="truncate">{event.venue}</span>
          </span>
        )}
      </div>

      {event.description && (
        <div className="max-w-2xl mx-auto -mt-3 mb-6 text-center text-xs text-slate-500 line-clamp-2 px-2">
          {event.description}
        </div>
      )}

      {/* Today's or Tomorrow's Matches: Matchday Spotlight Card */}
      {matchesToShow.length > 0 && (
        <div className="rounded-2xl border-2 border-emerald-300/80 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/40 p-4 sm:p-6 shadow-sm shadow-emerald-500/5 mb-6 sm:mb-8">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative flex h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-emerald-500"></span>
              </span>
              <h2 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight truncate">
                <span className="sm:hidden">{locale === "zh" ? "今日賽程" : "Today's Matches"}</span>
                <span className="hidden sm:inline">{title} ‧ Matchday Live</span>
              </h2>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-100/90 border border-emerald-200/80 px-2.5 py-0.5 rounded-full shrink-0">
              {matchesToShow.length} {locale === "zh" ? "場賽事" : matchesToShow.length === 1 ? "Match" : "Matches"}
            </span>
          </div>

          <div className="space-y-3.5">
            {matchesToShow.map((m: any) => {
              const timeStr = getMatchTimeDisplay(m);
              const rawCourt = getCourtDisplay(m);
              const courtVenue = (rawCourt && rawCourt !== "—" && rawCourt.trim() !== "")
                ? rawCourt.trim()
                : (event.venue && event.venue !== "—" && event.venue.trim() !== "" ? event.venue.trim() : null);
              const p1 = m.player1?.name || "TBD";
              const p2 = m.player2?.name || "TBD";

              return (
                <Link
                  key={m.id}
                  href={`/sports/${sportParam}/matches/${m.id}${previewSuffix}`}
                  className="block bg-white rounded-xl border border-emerald-200/80 hover:border-emerald-400 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 group"
                >
                  {/* Top row: Match Time + Status pill */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-100/70 px-2.5 py-1 rounded-md">
                      <span>🕒</span>
                      <span>{timeStr}</span>
                    </span>
                    {m.status === "completed" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>{t("sports.completed")}</span>
                      </span>
                    ) : m.status === "live" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        <span>{t("sports.live")}</span>
                      </span>
                    ) : m.status === "delayed" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span>{t("sports.delayed")}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span>{t("sports.upcoming")}</span>
                      </span>
                    )}
                  </div>

                  {/* Middle row: Showdown Matchup */}
                  <div className="flex items-center justify-between gap-3 py-1 sm:py-2">
                    <div className="flex-1 text-left min-w-0">
                      <span className="text-base sm:text-lg font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors truncate block">
                        {p1}
                      </span>
                    </div>
                    <div className="shrink-0 px-2.5 py-1 rounded text-xs font-black bg-slate-100 text-slate-400 border border-slate-200/60">
                      VS
                    </div>
                    <div className="flex-1 text-right min-w-0">
                      <span className="text-base sm:text-lg font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors truncate block">
                        {p2}
                      </span>
                    </div>
                  </div>

                  {/* Bottom row: Venue + CTA link */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1 truncate text-slate-500 font-medium">
                      {courtVenue ? (
                        <>
                          <span>📍</span>
                          <span className="truncate">{courtVenue}</span>
                        </>
                      ) : (
                        <span>&nbsp;</span>
                      )}
                    </div>
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 group-hover:text-emerald-700 shrink-0">
                      <span>{locale === "zh" ? "查看即時戰報 / 進入對戰" : "View Live Match"}</span>
                      <span className="group-hover:translate-x-0.5 transition-transform duration-150">→</span>
                    </span>
                  </div>
                </Link>
              );
            })}
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

