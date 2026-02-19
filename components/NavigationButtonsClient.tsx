"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";

interface NavigationButtonsClientProps {
  eventId?: string;
  sport?: string;
  /** When "season_play", show a fourth card linking to Playoffs. */
  tournamentType?: string;
}

export default function NavigationButtonsClient({ eventId, sport = "tennis", tournamentType }: NavigationButtonsClientProps) {
  const { t } = useI18n();
  
  // Build URLs - if eventId is provided, link to event-specific pages
  const basePath = `/sports/${sport}`;
  const drawUrl = eventId ? `${basePath}/events/${eventId}/draw` : `${basePath}/draw`;
  const scheduleUrl = eventId ? `${basePath}/events/${eventId}/schedule` : `${basePath}/schedule`;
  const playoffsUrl = eventId ? `${basePath}/events/${eventId}/playoffs` : `${basePath}/playoffs`;
  const rulesUrl = eventId ? `${basePath}/events/${eventId}/rules` : `${basePath}/rules`;
  const announcementsUrl = eventId ? `${basePath}/events/${eventId}/announcements` : `${basePath}/announcements`;
  const showPlayoffs = tournamentType === "season_play";

  return (
    <div className={`grid grid-cols-1 gap-6 ${showPlayoffs ? "md:grid-cols-5" : "md:grid-cols-4"}`}>
      <Link
        href={drawUrl}
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
          <h3 className="text-2xl font-semibold mb-3">{t('navigation.draw')}</h3>
          <p className="text-white text-opacity-90 text-sm">
            {t('navigation.drawDescription')}
          </p>
        </div>
      </Link>

      <Link
        href={scheduleUrl}
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
          <h3 className="text-2xl font-semibold mb-3">{t('navigation.schedule')}</h3>
          <p className="text-white text-opacity-90 text-sm">
            {t('navigation.scheduleDescription')}
          </p>
        </div>
      </Link>

      {showPlayoffs && (
        <Link
          href={playoffsUrl}
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
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold mb-3">{t('navigation.playoffs')}</h3>
            <p className="text-white text-opacity-90 text-sm">
              {t('navigation.playoffsDescription')}
            </p>
          </div>
        </Link>
      )}

      <Link
        href={rulesUrl}
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-2xl font-semibold mb-3">{t('navigation.rules')}</h3>
          <p className="text-white text-opacity-90 text-sm">
            {t('navigation.rulesDescription')}
          </p>
        </div>
      </Link>

      <Link
        href={announcementsUrl}
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
          <h3 className="text-2xl font-semibold mb-3">{t('navigation.announcements')}</h3>
          <p className="text-white text-opacity-90 text-sm">
            {t('navigation.announcementsDescription')}
          </p>
        </div>
      </Link>
    </div>
  );
}

