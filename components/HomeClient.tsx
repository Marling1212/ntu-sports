"use client";

import { useI18n } from "@/lib/i18n/context";
import LoadingLink from "@/components/LoadingLink";
import GlobalSponsorBanner, { GlobalSponsorItem } from "@/components/GlobalSponsorBanner";

const sportIcons: { [key: string]: string } = {
  Tennis: "🎾",
  Soccer: "⚽",
  Basketball: "🏀",
  Volleyball: "🏐",
  Badminton: "🏸",
  TableTennis: "🏓",
  Baseball: "⚾",
  Softball: "🥎",
  Other: "🏆",
};

const sportColors: { [key: string]: string } = {
  Tennis: "bg-green-500",
  Soccer: "bg-emerald-500",
  Basketball: "bg-orange-500",
  Volleyball: "bg-blue-500",
  Badminton: "bg-yellow-500",
  TableTennis: "bg-red-500",
  Baseball: "bg-indigo-500",
  Softball: "bg-pink-500",
};

export interface MultiSportEvent {
  id: string;
  name: string;
  linkSport: string;
  sports: string[];
  venue?: string;
}

interface HomeClientProps {
  sportsToShow: string[];
  multiSportEvents: MultiSportEvent[];
  globalSponsors?: GlobalSponsorItem[];
}

export default function HomeClient({ sportsToShow, multiSportEvents, globalSponsors = [] }: HomeClientProps) {
  const { t } = useI18n();

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12 sm:pt-12 sm:pb-16 max-w-7xl">
      {/* Compact SaaS Hero Section */}
      <div className="text-center pt-2 pb-6 sm:pt-4 sm:pb-8 animate-fadeIn">
        {/* Status Pill / Badge */}
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 text-xs font-medium px-3 py-1 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
          <span>{t("home.statusBadge")}</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-4">
          {t("home.title")}
        </h1>

        {/* Subheadline */}
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-3 max-w-xl mx-auto leading-relaxed">
          {t("home.subtitle")}
        </p>
      </div>

      {/* Sports section: one card per sport */}
      <div className="mb-8 sm:mb-12 animate-fadeIn" style={{ animationDelay: "0.15s" }}>
        <h2 className="text-base sm:text-xl font-bold text-slate-800 dark:text-slate-200 mb-1 text-center">
          {t("home.sports")}
        </h2>
        <p className="text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-4 sm:mb-6 px-2 sm:px-4 hidden sm:block">
          {t("home.sportsDescription")}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-6">
          {sportsToShow.map((sport, index) => {
            const sportLower = sport.toLowerCase();
            const icon = sportIcons[sport] || "🏆";
            const colorClass = sportColors[sport] || "bg-ntu-green";
            return (
              <LoadingLink
                key={sport}
                href={`/sports/${sportLower.replace(/\s+/g, "")}`}
                className="bg-white dark:bg-slate-900 rounded-lg sm:rounded-xl shadow-md hover:shadow-xl sm:hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border border-gray-100 dark:border-slate-800 group p-3 sm:p-8 animate-scaleIn active:scale-[0.98]"
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <div className="text-center">
                  <div
                    className={`w-10 h-10 sm:w-16 sm:h-16 ${colorClass} rounded-lg sm:rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-md sm:shadow-lg`}
                  >
                    <span className="text-2xl sm:text-4xl">{icon}</span>
                  </div>
                  <h3 className="text-sm sm:text-2xl font-semibold text-ntu-green dark:text-emerald-400 mb-0.5 sm:mb-3">{sport}</h3>
                  <p className="text-gray-500 dark:text-slate-400 text-[10px] sm:text-sm leading-tight sm:leading-relaxed mb-1 sm:mb-4 hidden sm:block">
                    {t("home.viewDraw")}
                  </p>
                  <div className="text-gray-400 sm:text-ntu-green dark:sm:text-emerald-400 font-medium text-[10px] sm:text-sm group-hover:translate-x-1 transition-transform inline-flex items-center gap-0.5 sm:gap-1">
                    <span className="hidden sm:inline">{t("home.viewDetails")}</span>{" "}
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </div>
              </LoadingLink>
            );
          })}
        </div>
      </div>

      {/* Multi-sport events: only events with more than one distinct sport */}
      {multiSportEvents.length > 0 && (
        <div className="mb-8 sm:mb-12 animate-fadeIn" style={{ animationDelay: "0.25s" }}>
          <h2 className="text-base sm:text-xl font-bold text-slate-800 dark:text-slate-200 mb-1 text-center">
            {t("home.multiSportEvents")}
          </h2>
          <p className="text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-4 sm:mb-6 px-2 sm:px-4">
            {t("home.multiSportEventsSubtitle")}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {multiSportEvents.map((evt, index) => (
              <LoadingLink
                key={evt.id}
                href={`/sports/${evt.linkSport}/events/${evt.id}`}
                className="bg-white dark:bg-slate-900 rounded-lg sm:rounded-xl shadow-md hover:shadow-xl sm:hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border border-gray-100 dark:border-slate-800 group p-4 sm:p-6 animate-scaleIn active:scale-[0.98] text-left"
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <h3 className="text-base sm:text-xl font-semibold text-ntu-green dark:text-emerald-400 mb-2 sm:mb-3 group-hover:underline">
                  {evt.name}
                </h3>
                <div className="flex flex-wrap gap-1.5 mb-2 sm:mb-3">
                  {evt.sports.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 text-xs sm:text-sm font-medium"
                    >
                      <span>{sportIcons[s] || "🏆"}</span>
                      {s}
                    </span>
                  ))}
                </div>
                {evt.venue && (
                  <p className="text-gray-500 dark:text-slate-400 text-xs sm:text-sm truncate" title={evt.venue}>
                    {evt.venue}
                  </p>
                )}
                <div className="text-ntu-green dark:text-emerald-400 font-medium text-xs sm:text-sm mt-2 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                  {t("home.viewDetails")} <span>→</span>
                </div>
              </LoadingLink>
            ))}
          </div>
        </div>
      )}

      {/* Global Sponsors */}
      <GlobalSponsorBanner sponsors={globalSponsors} />
    </div>
  );
}
