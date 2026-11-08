"use client";

import { useI18n } from "@/lib/i18n/context";
import LoadingLink from "@/components/LoadingLink";
import GlobalSponsorBanner, { GlobalSponsorItem } from "@/components/GlobalSponsorBanner";

interface SportCardStyle {
  icon: string;
  topBorder: string;
  iconBg: string;
  actionClass: string;
  hoverBorder: string;
  hoverShadow: string;
}

const sportCardStyles: Record<string, SportCardStyle> = {
  Soccer: {
    icon: "⚽",
    topBorder: "bg-gradient-to-r from-emerald-500 to-teal-400",
    iconBg: "bg-emerald-50 ring-1 ring-emerald-200/60 text-2xl",
    actionClass: "text-emerald-600 font-medium group-hover:text-emerald-700 group-hover:translate-x-1 transition-all",
    hoverBorder: "hover:border-emerald-300",
    hoverShadow: "hover:shadow-lg hover:shadow-emerald-500/5",
  },
  Tennis: {
    icon: "🎾",
    topBorder: "bg-gradient-to-r from-amber-500 to-orange-400",
    iconBg: "bg-amber-50 ring-1 ring-amber-200/60 text-2xl",
    actionClass: "text-amber-600 font-medium group-hover:text-amber-700 group-hover:translate-x-1 transition-all",
    hoverBorder: "hover:border-amber-300",
    hoverShadow: "hover:shadow-lg hover:shadow-amber-500/5",
  },
  Basketball: {
    icon: "🏀",
    topBorder: "bg-gradient-to-r from-orange-500 to-amber-400",
    iconBg: "bg-orange-50 ring-1 ring-orange-200/60 text-2xl",
    actionClass: "text-orange-600 font-medium group-hover:text-orange-700 group-hover:translate-x-1 transition-all",
    hoverBorder: "hover:border-orange-300",
    hoverShadow: "hover:shadow-lg hover:shadow-orange-500/5",
  },
  Volleyball: {
    icon: "🏐",
    topBorder: "bg-gradient-to-r from-blue-500 to-cyan-400",
    iconBg: "bg-blue-50 ring-1 ring-blue-200/60 text-2xl",
    actionClass: "text-blue-600 font-medium group-hover:text-blue-700 group-hover:translate-x-1 transition-all",
    hoverBorder: "hover:border-blue-300",
    hoverShadow: "hover:shadow-lg hover:shadow-blue-500/5",
  },
  Badminton: {
    icon: "🏸",
    topBorder: "bg-gradient-to-r from-yellow-500 to-amber-400",
    iconBg: "bg-amber-50 ring-1 ring-amber-200/60 text-2xl",
    actionClass: "text-amber-600 font-medium group-hover:text-amber-700 group-hover:translate-x-1 transition-all",
    hoverBorder: "hover:border-amber-300",
    hoverShadow: "hover:shadow-lg hover:shadow-amber-500/5",
  },
  TableTennis: {
    icon: "🏓",
    topBorder: "bg-gradient-to-r from-rose-500 to-red-400",
    iconBg: "bg-rose-50 ring-1 ring-rose-200/60 text-2xl",
    actionClass: "text-rose-600 font-medium group-hover:text-rose-700 group-hover:translate-x-1 transition-all",
    hoverBorder: "hover:border-rose-300",
    hoverShadow: "hover:shadow-lg hover:shadow-rose-500/5",
  },
  Baseball: {
    icon: "⚾",
    topBorder: "bg-gradient-to-r from-indigo-500 to-blue-400",
    iconBg: "bg-indigo-50 ring-1 ring-indigo-200/60 text-2xl",
    actionClass: "text-indigo-600 font-medium group-hover:text-indigo-700 group-hover:translate-x-1 transition-all",
    hoverBorder: "hover:border-indigo-300",
    hoverShadow: "hover:shadow-lg hover:shadow-indigo-500/5",
  },
  Softball: {
    icon: "🥎",
    topBorder: "bg-gradient-to-r from-pink-500 to-rose-400",
    iconBg: "bg-pink-50 ring-1 ring-pink-200/60 text-2xl",
    actionClass: "text-pink-600 font-medium group-hover:text-pink-700 group-hover:translate-x-1 transition-all",
    hoverBorder: "hover:border-pink-300",
    hoverShadow: "hover:shadow-lg hover:shadow-pink-500/5",
  },
};

const defaultSportStyle: SportCardStyle = {
  icon: "🏆",
  topBorder: "bg-gradient-to-r from-emerald-600 to-teal-500",
  iconBg: "bg-slate-50 ring-1 ring-slate-200/60 text-2xl",
  actionClass: "text-emerald-600 font-medium group-hover:text-emerald-700 group-hover:translate-x-1 transition-all",
  hoverBorder: "hover:border-emerald-300",
  hoverShadow: "hover:shadow-lg hover:shadow-emerald-500/5",
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
      {/* Subtle ambient mesh gradient glow behind hero */}
      <div
        className="pointer-events-none -z-10 absolute top-0 inset-x-0 flex justify-center overflow-hidden"
        aria-hidden="true"
      >
        <div className="h-[280px] w-[580px] max-w-full -translate-y-12 bg-gradient-to-tr from-blue-400/20 via-teal-300/15 to-emerald-400/15 blur-3xl rounded-full" />
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
              const style = sportCardStyles[sport] || defaultSportStyle;
              return (
                <LoadingLink
                  key={sport}
                  href={`/sports/${sportLower.replace(/\s+/g, "")}`}
                  className={`relative overflow-hidden bg-white rounded-2xl shadow-sm border border-slate-200/80 ${style.hoverBorder} ${style.hoverShadow} transition-all duration-200 hover:-translate-y-0.5 group p-5 sm:p-6 animate-scaleIn active:scale-[0.99] flex flex-col justify-between`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  {/* Top border accent line */}
                  <div className={`absolute top-0 inset-x-0 h-[3px] ${style.topBorder}`} />

                  {/* Top row: Icon badge + Status pill */}
                  <div>
                    <div className="flex items-start justify-between mb-3.5">
                      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${style.iconBg} shadow-sm group-hover:scale-105 transition-transform duration-200`}>
                        <span>{style.icon}</span>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
                        <span>{t("home.statusLive")}</span>
                      </span>
                    </div>

                    {/* Sport Title */}
                    <h3 className="text-base sm:text-xl font-bold text-slate-900 group-hover:text-slate-950 transition-colors mb-1">
                      {sport}
                    </h3>

                    {/* Description */}
                    <p className="text-slate-500 text-xs sm:text-sm leading-relaxed mb-1 hidden sm:block">
                      {t("home.viewDraw")}
                    </p>
                  </div>

                  {/* Action Link */}
                  <div className={`mt-3 sm:mt-4 text-xs sm:text-sm inline-flex items-center gap-1 ${style.actionClass}`}>
                    <span>{t("home.viewDrawAction")}</span>
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
                  className="relative overflow-hidden bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 border border-slate-200/80 hover:border-emerald-300 p-5 group animate-scaleIn active:scale-[0.99] text-left"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-emerald-500 to-teal-400" />
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2 group-hover:text-ntu-green transition-colors">
                    {evt.name}
                  </h3>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {evt.sports.map((s) => {
                      const style = sportCardStyles[s] || defaultSportStyle;
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
                  <div className="text-emerald-600 font-medium text-xs sm:text-sm mt-3 group-hover:text-emerald-700 group-hover:translate-x-1 transition-all inline-flex items-center gap-1">
                    <span>{t("home.viewDetails")}</span> <span>→</span>
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
