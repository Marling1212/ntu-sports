"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";

export default function NavigationButtonsClient() {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
      <Link
        href="/sports/tennis/draw"
        className="bg-ntu-green text-white rounded-xl shadow-md p-6 sm:p-8 hover:shadow-xl transition-all duration-300 hover:scale-105 text-center group"
      >
        <div className="text-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white bg-opacity-20 rounded-lg flex items-center justify-center mx-auto mb-3 sm:mb-4 group-hover:bg-opacity-30 transition-colors">
            <svg
              className="w-7 h-7 sm:w-8 sm:h-8 text-white"
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
          <h3 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-3">{t('navigation.draw')}</h3>
          <p className="text-white text-opacity-90 text-xs sm:text-sm">
            {t('navigation.drawDescription')}
          </p>
        </div>
      </Link>

      <Link
        href="/sports/tennis/schedule"
        className="bg-ntu-green text-white rounded-xl shadow-md p-6 sm:p-8 hover:shadow-xl transition-all duration-300 hover:scale-105 text-center group"
      >
        <div className="text-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white bg-opacity-20 rounded-lg flex items-center justify-center mx-auto mb-3 sm:mb-4 group-hover:bg-opacity-30 transition-colors">
            <svg
              className="w-7 h-7 sm:w-8 sm:h-8 text-white"
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
          <h3 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-3">{t('navigation.schedule')}</h3>
          <p className="text-white text-opacity-90 text-xs sm:text-sm">
            {t('navigation.scheduleDescription')}
          </p>
        </div>
      </Link>

      <Link
        href="/sports/tennis/announcements"
        className="bg-ntu-green text-white rounded-xl shadow-md p-6 sm:p-8 hover:shadow-xl transition-all duration-300 hover:scale-105 text-center group"
      >
        <div className="text-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white bg-opacity-20 rounded-lg flex items-center justify-center mx-auto mb-3 sm:mb-4 group-hover:bg-opacity-30 transition-colors">
            <svg
              className="w-7 h-7 sm:w-8 sm:h-8 text-white"
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
          <h3 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-3">{t('navigation.announcements')}</h3>
          <p className="text-white text-opacity-90 text-xs sm:text-sm">
            {t('navigation.announcementsDescription')}
          </p>
        </div>
      </Link>
    </div>
  );
}

