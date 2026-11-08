"use client";

import { useI18n } from "@/lib/i18n/context";
import LoadingLink from "@/components/LoadingLink";
import GlobalSponsorBanner, { GlobalSponsorItem } from "@/components/GlobalSponsorBanner";

interface SportStyle {
  icon: string;
  iconBg: string;
  hoverBorder: string;
}

const sportStyles: Record<string, SportStyle> = {
  Soccer: {
    icon: "⚽",
    iconBg: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/20",
    hoverBorder: "hover:border-emerald-400",
  },
  Tennis: {
    icon: "🎾",
    iconBg: "bg-lime-50 text-lime-800 ring-1 ring-lime-500/20",
    hoverBorder: "hover:border-lime-400",
  },
  Basketball: {
    icon: "🏀",
    iconBg: "bg-orange-50 text-orange-700 ring-1 ring-orange-500/20",
    hoverBorder: "hover:border-orange-400",
  },
  Volleyball: {
    icon: "🏐",
    iconBg: "bg-blue-50 text-blue-700 ring-1 ring-blue-500/20",
    hoverBorder: "hover:border-blue-400",
  },
  Badminton: {
    icon: "🏸",
    iconBg: "bg-amber-50 text-amber-700 ring-1 ring-amber-500/20",
    hoverBorder: "hover:border-amber-400",
  },
  TableTennis: {
    icon: "🏓",
    iconBg: "bg-rose-50 text-rose-700 ring-1 ring-rose-500/20",
    hoverBorder: "hover:border-rose-400",
  },
  Baseball: {
    icon: "⚾",
    iconBg: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500/20",
    hoverBorder: "hover:border-indigo-400",
  },
  Softball: {
    icon: "🥎",
    iconBg: "bg-pink-50 text-pink-700 ring-1 ring-pink-500/20",
    hoverBorder: "hover:border-pink-400",
  },
};

const defaultSportStyle: SportStyle = {
  icon: "🏆",
  iconBg: "bg-slate-100 text-slate-700 ring-1 ring-slate-300/30",
  hoverBorder: "hover:border-slate-400",
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
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      {/* Subtle ambient gradient glow behind hero */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 flex justify-center overflow-hidden"
        aria-hidden="true"
      >
        <div className="h-[360px] sm:h-[440px] w-[700px] sm:w-[1000px] max-w-full -translate-y-16 bg-gradient-to-b from-emerald-100/40 via-blue-50/25 to-transparent blur-3xl opacity-80" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12 sm:pt-12 sm:pb-16 max-w-7xl">
        {/* Compact SaaS Hero Section */}
        <div className="text-center pt-2 pb-6 sm:pt-4 sm:pb-8 animate-fadeIn">
          {/* Status Pill / Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold px-3.5 py-1 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
            <span>{t("home.statusBadge")}</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 mt-4">
            {t("home.title")}
          </h1>

          {/* Subheadline */}
          <p className="text-base sm:text-lg text-slate-600 mt-3 max-w-xl mx-auto leading-relaxed">
            {t("home.subtitle")}
          </p>
        </div>

        {/* Sports section: one card per sport */}
        <div className="mb-8 sm:mb-12 animate-fadeIn" style={{ animationDelay: "0.15s" }}>
          <h2 className="text-lg sm:text-2xl font-bold text-slate-900 mb-1 text-center">
            {t("home.sports")}
          </h2>
          <p className="text-center text-xs sm:text-sm text-slate-500 mb-6 px-2 sm:px-4 hidden sm:block">
            {t("home.sportsDescription")}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-6">
            {sportsToShow.map((sport, index) => {
              const sportLower = sport.toLowerCase();
              const style = sportStyles[sport] || defaultSportStyle;
              return (
                <LoadingLink
                  key={sport}
                  href={`/sports/${sportLower.replace(/\s+/g, "")}`}
                  className={`bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border border-slate-200/80 ${style.hoverBorder} group p-5 sm:p-7 animate-scaleIn active:scale-[0.99]`}
                  style={{ animationDelay: `${index * 0.06}s` }}
                >
                  <div className="text-center">
                    <div
                      className={`w-12 h-12 sm:w-16 sm:h-16 ${style.iconBg} rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 group-hover:scale-105 transition-transform duration-200`}
                    >
                      <span className="text-2xl sm:text-4xl">{style.icon}</span>
                    </div>
                    <h3 className="text-base sm:text-xl font-bold text-slate-900 group-hover:text-ntu-green transition-colors mb-1">
                      {sport}
                    </h3>
                    <p className="text-slate-500 text-xs sm:text-sm leading-relaxed mb-3 hidden sm:block">
                      {t("home.viewDraw")}
                    </p>
                    <div className="text-ntu-green font-semibold text-xs sm:text-sm group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                      <span className="hidden sm:inline">{t("home.viewDetails")}</span>{" "}
                      <span>→</span>
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
            <h2 className="text-lg sm:text-2xl font-bold text-slate-900 mb-1 text-center">
              {t("home.multiSportEvents")}
            </h2>
            <p className="text-center text-xs sm:text-sm text-slate-500 mb-6 px-2 sm:px-4">
              {t("home.multiSportEventsSubtitle")}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {multiSportEvents.map((evt, index) => (
                <LoadingLink
                  key={evt.id}
                  href={`/sports/${evt.linkSport}/events/${evt.id}`}
                  className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border border-slate-200/80 hover:border-emerald-400 p-5 group animate-scaleIn active:scale-[0.99] text-left"
                  style={{ animationDelay: `${index * 0.06}s` }}
                >
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2 group-hover:text-ntu-green transition-colors">
                    {evt.name}
                  </h3>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {evt.sports.map((s) => {
                      const style = sportStyles[s] || defaultSportStyle;
                      return (
                        <span
                          key={s}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-semibold"
                        >
                          <span>{style.icon}</span>
                          {s}
                        </span>
                      );
                    })}
                  </div>
                  {evt.venue && (
                    <p className="text-slate-500 text-xs mt-1 truncate" title={evt.venue}>
                      📍 {evt.venue}
                    </p>
                  )}
                  <div className="text-ntu-green font-semibold text-xs sm:text-sm mt-3 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
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
    </div>
  );
}
