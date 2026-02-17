"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";

const sportIcons: { [key: string]: string } = {
  tennis: "🎾",
  soccer: "⚽",
  basketball: "🏀",
  volleyball: "🏐",
  badminton: "🏸",
  tabletennis: "🏓",
  baseball: "⚾",
  softball: "🥎",
};

interface EventsListClientProps {
  events: any[];
  /** Sport code (e.g. "tennis", "soccer"). Defaults to "tennis". */
  sport?: string;
}

export default function EventsListClient({ events, sport = "tennis" }: EventsListClientProps) {
  const { t, locale } = useI18n();
  const sportLower = sport.toLowerCase();
  const sportName = sportLower ? sportLower.charAt(0).toUpperCase() + sportLower.slice(1) : "";
  const sportIcon = sportIcons[sportLower] || "🏆";

  return (
    <>
      <div className="mb-8 sm:mb-12 animate-fadeIn">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-ntu-green mb-3 sm:mb-4 text-center">
          {sportIcon} {t("sports.ntuSportEvents").replace("{sport}", sportName)}
        </h1>
        <p className="text-base sm:text-lg text-gray-600 text-center px-4">
          {t("sports.selectEvent")}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {events.map((event, index) => (
          <Link
            key={event.id}
            href={`/sports/${sportLower}/events/${event.id}`}
            className="bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border border-gray-100 p-5 sm:p-6 animate-scaleIn group"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <h2 className="text-xl sm:text-2xl font-bold text-ntu-green mb-3 sm:mb-4 group-hover:text-green-700 transition-colors">
              {event.name}
            </h2>
            <div className="space-y-2 text-xs sm:text-sm text-gray-700 mb-4">
              <p>
                <span className="font-semibold">{t('sports.dates')}：</span>
                {new Date(event.start_date).toLocaleDateString(locale === 'zh' ? 'zh-TW' : 'en-US')} - {new Date(event.end_date).toLocaleDateString(locale === 'zh' ? 'zh-TW' : 'en-US')}
              </p>
              <p>
                <span className="font-semibold">{t('sports.venue')}：</span>
                {event.venue}
              </p>
              {event.description && (
                <p className="text-gray-600 mt-3 line-clamp-2">
                  {event.description}
                </p>
              )}
            </div>
            <div className="mt-4 sm:mt-5 text-ntu-green font-medium text-sm sm:text-base group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
              {t('sports.viewEvent')} <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}

