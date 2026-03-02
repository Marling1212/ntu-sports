"use client";

import { useI18n } from "@/lib/i18n/context";
import CountdownTimerWrapper from "./CountdownTimerWrapper";
import { getCourtDisplay } from "@/lib/utils/getCourtDisplay";
import { getMatchTimeDisplay } from "@/lib/utils/formatScheduledTime";
import Link from "next/link";
import MarkdownText from "./MarkdownText";

interface SponsorItem {
  id: string;
  name: string;
  logo_url?: string | null;
  website_url?: string | null;
  tier: string;
}

interface SportsPageClientProps {
  singleEvent: any;
  hasStarted: boolean;
  tournamentStartDate: Date;
  matchesToShow: any[];
  hasUpcomingToday: boolean;
  latestAnnouncement?: any;
  /** If set, links (e.g. announcements, match URLs) use event-specific paths. */
  eventId?: string;
  sponsors?: SponsorItem[];
}

export default function SportsPageClient({
  singleEvent,
  hasStarted,
  tournamentStartDate,
  matchesToShow,
  hasUpcomingToday,
  latestAnnouncement,
  eventId,
  sponsors = [],
}: SportsPageClientProps) {
  const { t, locale } = useI18n();
  const sport = (singleEvent?.sport ?? "tennis").toString().toLowerCase();
  const basePath = `/sports/${sport}`;
  const announcementsUrl = eventId ? `${basePath}/events/${eventId}/announcements` : `${basePath}/announcements`;
  const matchesBasePath = basePath; // match links are /sports/{sport}/matches/{id} (no event in path)

  const title = hasUpcomingToday ? t('sports.todaySchedule') : t('sports.tomorrowSchedule');
  const emptyMessage = hasUpcomingToday ? t('sports.noMatchesToday') : t('sports.noMatchesTomorrow');

  return (
    <>
      {/* Header Section (aligned with others: title only, fixed size) */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-ntu-green mb-4">
          {singleEvent?.name || "NTU Tennis – 114 Freshman Cup"}
        </h1>
      </div>

      {/* Tournament Overview (with Type, same styling as others) */}
      {singleEvent && (
        <div className="bg-white rounded-xl shadow-md p-8 mb-8 border border-gray-100">
          <h2 className="text-2xl font-semibold text-ntu-green mb-4">{t('sports.tournamentOverview')}</h2>
          <div className="space-y-3 text-gray-700">
            <div className="flex items-start">
              <span className="font-semibold text-gray-800 min-w-[100px]">{t('sports.typeLabel')}:</span>
              <span>{singleEvent.tournament_type === 'season_play' ? t('sports.tournamentTypeSeason') : t('sports.tournamentTypeBracket')}</span>
            </div>
            <div className="flex items-start">
              <span className="font-semibold text-gray-800 min-w-[100px]">{t('sports.dates')}:</span>
              <span>
                {new Date(singleEvent.start_date).toLocaleDateString(locale === 'zh' ? 'zh-TW' : 'en-US')} - {new Date(singleEvent.end_date).toLocaleDateString(locale === 'zh' ? 'zh-TW' : 'en-US')}
              </span>
            </div>
            <div className="flex items-start">
              <span className="font-semibold text-gray-800 min-w-[100px]">{t('sports.venue')}:</span>
              <span>{singleEvent.venue}</span>
            </div>
            {singleEvent.description && (
              <div className="flex items-start">
                <span className="font-semibold text-gray-800 min-w-[100px]">{t('sports.descriptionLabel')}:</span>
                <span>{singleEvent.description}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sponsors */}
      {sponsors.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-8 mb-8 border border-gray-100">
          <h2 className="text-2xl font-semibold text-ntu-green mb-6">Sponsors</h2>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
            {sponsors.map((s) => {
              const content = (
                <>
                  {s.logo_url ? (
                    <img
                      src={s.logo_url}
                      alt={s.name}
                      className="max-h-16 w-auto object-contain"
                    />
                  ) : (
                    <span className="text-lg font-semibold text-gray-600">{s.name}</span>
                  )}
                  <span className={`text-xs font-medium ${
                    s.tier === "Gold" ? "text-amber-600" : s.tier === "Silver" ? "text-gray-500" : "text-amber-800"
                  }`}>
                    {s.tier} Sponsor
                  </span>
                </>
              );
              return s.website_url ? (
                <a
                  key={s.id}
                  href={s.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 group hover:opacity-80 transition-opacity"
                >
                  {content}
                </a>
              ) : (
                <div key={s.id} className="flex flex-col items-center gap-2">
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Today's or Tomorrow's Matches (styling aligned with others) */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8 rounded-lg">
        <div className="flex items-start justify-between mb-3">
          <h2 className="text-lg font-semibold text-yellow-800">{title}</h2>
          <span className="text-sm text-yellow-700">{t('sports.autoGenerated')}</span>
        </div>
        {matchesToShow.length === 0 ? (
          <p className="text-yellow-800 text-sm">{emptyMessage}</p>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto -mx-2">
              <table className="min-w-full divide-y divide-yellow-200">
                <thead>
                  <tr className="bg-yellow-100">
                    <th className="px-3 py-2 text-left text-xs font-medium text-yellow-800 uppercase tracking-wider">{t('sports.time')}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-yellow-800 uppercase tracking-wider">{t('sports.court')}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-yellow-800 uppercase tracking-wider">{t('sports.matchup')}</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-yellow-800 uppercase tracking-wider">{t('sports.status')}</th>
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
                          <span className="font-semibold">{p1}</span>
                          <Link
                            href={`${matchesBasePath}/matches/${m.id}`}
                            className="mx-2 text-ntu-green hover:underline"
                          >
                            {t('sports.vs')}
                          </Link>
                          <span className="font-semibold">{p2}</span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-center">
                          {m.status === "completed" ? (
                            <span className="inline-block px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded">{t('sports.completed')}</span>
                          ) : m.status === "live" ? (
                            <span className="inline-block px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded animate-pulse">{t('sports.live')}</span>
                          ) : m.status === "delayed" ? (
                            <span className="inline-block px-2 py-1 text-xs font-semibold text-amber-700 bg-amber-100 rounded">{t('sports.delayed')}</span>
                          ) : (
                            <span className="inline-block px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-100 rounded">{t('sports.upcoming')}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="md:hidden space-y-3">
              {matchesToShow.map((m: any) => {
                const timeStr = getMatchTimeDisplay(m);
                const court = getCourtDisplay(m);
                const p1 = m.player1?.name || "TBD";
                const p2 = m.player2?.name || "TBD";
                return (
                  <Link
                    key={m.id}
                    href={`${matchesBasePath}/matches/${m.id}`}
                    className="block bg-white rounded-lg p-4 shadow-sm border border-yellow-200 hover:border-ntu-green hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">{timeStr}</span>
                      {m.status === "completed" ? (
                        <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded">{t('sports.completed')}</span>
                      ) : m.status === "live" ? (
                        <span className="px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded animate-pulse">{t('sports.live')}</span>
                      ) : m.status === "delayed" ? (
                        <span className="px-2 py-1 text-xs font-semibold text-amber-700 bg-amber-100 rounded">{t('sports.delayed')}</span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-100 rounded">{t('sports.upcoming')}</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">{t('sports.courtLabel')}{court}</div>
                    <div className="text-sm text-gray-800">
                      <span className="font-semibold">{p1}</span>
                      <span className="mx-2 text-ntu-green font-semibold">{t('sports.vs')}</span>
                      <span className="font-semibold">{p2}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Latest Announcement (full content, same as others) */}
      {latestAnnouncement && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-100">
          <div className="flex items-start justify-between mb-3">
            <h2 className="text-xl font-semibold text-ntu-green">{t('announcements.title')}</h2>
            <Link href={announcementsUrl} className="text-ntu-green hover:underline text-sm">
              {t('announcements.viewAllArrow')}
            </Link>
          </div>
          <div className="text-sm text-gray-500 mb-2">
            {new Date(latestAnnouncement.created_at).toLocaleString(locale === 'zh' ? 'zh-TW' : 'en-US')}
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">{latestAnnouncement.title}</h3>
          <div className="prose max-w-none">
            <MarkdownText content={latestAnnouncement.content} />
          </div>
        </div>
      )}

      {/* Countdown Timer (plain styling, same as others) */}
      {!hasStarted && (
        <div className="bg-white rounded-xl shadow-md p-8 mb-8 border border-gray-100">
          <h2 className="text-2xl font-semibold text-ntu-green mb-6 text-center">
            {t('sports.timeUntilStart')}
          </h2>
          <CountdownTimerWrapper targetDate={tournamentStartDate} />
        </div>
      )}
    </>
  );
}

