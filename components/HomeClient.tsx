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
  statusBadgeClass: string;
  statusDotClass: string;
  statusKey: string;
  descKey: string;
  actionKey: string;
  subtitleKey: string;
}

const sportCardStyles: Record<string, SportCardStyle> = {
  Soccer: {
    icon: "⚽",
    topBorder: "bg-gradient-to-r from-emerald-500 to-teal-400",
    iconBg: "bg-emerald-50 ring-1 ring-emerald-200/60 text-2xl",
    actionClass: "text-emerald-600 font-semibold group-hover:text-emerald-700 group-hover:translate-x-1 transition-all",
    hoverBorder: "hover:border-emerald-300",
    hoverShadow: "hover:shadow-lg hover:shadow-emerald-500/5",
    statusBadgeClass: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    statusDotClass: "bg-emerald-500 animate-pulse",
    statusKey: "home.soccerStatus",
    descKey: "home.soccerDesc",
    actionKey: "home.soccerAction",
    subtitleKey: "home.soccerSubtitle",
  },
  Tennis: {
    icon: "🎾",
    topBorder: "bg-gradient-to-r from-amber-500 to-orange-400",
    iconBg: "bg-amber-50 ring-1 ring-amber-200/60 text-2xl",
    actionClass: "text-amber-600 font-semibold group-hover:text-amber-700 group-hover:translate-x-1 transition-all",
    hoverBorder: "hover:border-amber-300",
    hoverShadow: "hover:shadow-lg hover:shadow-amber-500/5",
    statusBadgeClass: "bg-slate-100 text-slate-600 border-slate-200",
    statusDotClass: "bg-slate-400",
    statusKey: "home.tennisStatus",
    descKey: "home.tennisDesc",
    actionKey: "home.tennisAction",
    subtitleKey: "home.tennisSubtitle",
  },
  Basketball: {
    icon: "🏀",
    topBorder: "bg-gradient-to-r from-orange-500 to-amber-400",
    iconBg: "bg-orange-50 ring-1 ring-orange-200/60 text-2xl",
    actionClass: "text-orange-600 font-semibold group-hover:text-orange-700 group-hover:translate-x-1 transition-all",
    hoverBorder: "hover:border-orange-300",
    hoverShadow: "hover:shadow-lg hover:shadow-orange-500/5",
    statusBadgeClass: "bg-orange-50 text-orange-700 border border-orange-200",
    statusDotClass: "bg-orange-500 animate-pulse",
    statusKey: "home.statusLive",
    descKey: "home.viewDraw",
    actionKey: "home.viewDrawAction",
    subtitleKey: "home.defaultSportSubtitle",
  },
  Volleyball: {
    icon: "🏐",
    topBorder: "bg-gradient-to-r from-blue-500 to-cyan-400",
    iconBg: "bg-blue-50 ring-1 ring-blue-200/60 text-2xl",
    actionClass: "text-blue-600 font-semibold group-hover:text-blue-700 group-hover:translate-x-1 transition-all",
    hoverBorder: "hover:border-blue-300",
    hoverShadow: "hover:shadow-lg hover:shadow-blue-500/5",
    statusBadgeClass: "bg-blue-50 text-blue-700 border border-blue-200",
    statusDotClass: "bg-blue-500 animate-pulse",
    statusKey: "home.statusLive",
    descKey: "home.viewDraw",
    actionKey: "home.viewDrawAction",
    subtitleKey: "home.defaultSportSubtitle",
  },
  Badminton: {
    icon: "🏸",
    topBorder: "bg-gradient-to-r from-yellow-500 to-amber-400",
    iconBg: "bg-amber-50 ring-1 ring-amber-200/60 text-2xl",
    actionClass: "text-amber-600 font-semibold group-hover:text-amber-700 group-hover:translate-x-1 transition-all",
    hoverBorder: "hover:border-amber-300",
    hoverShadow: "hover:shadow-lg hover:shadow-amber-500/5",
    statusBadgeClass: "bg-amber-50 text-amber-700 border border-amber-200",
    statusDotClass: "bg-amber-500 animate-pulse",
    statusKey: "home.statusLive",
    descKey: "home.viewDraw",
    actionKey: "home.viewDrawAction",
    subtitleKey: "home.defaultSportSubtitle",
  },
  TableTennis: {
    icon: "🏓",
    topBorder: "bg-gradient-to-r from-rose-500 to-red-400",
    iconBg: "bg-rose-50 ring-1 ring-rose-200/60 text-2xl",
    actionClass: "text-rose-600 font-semibold group-hover:text-rose-700 group-hover:translate-x-1 transition-all",
    hoverBorder: "hover:border-rose-300",
    hoverShadow: "hover:shadow-lg hover:shadow-rose-500/5",
    statusBadgeClass: "bg-rose-50 text-rose-700 border border-rose-200",
    statusDotClass: "bg-rose-500 animate-pulse",
    statusKey: "home.statusLive",
    descKey: "home.viewDraw",
    actionKey: "home.viewDrawAction",
    subtitleKey: "home.defaultSportSubtitle",
  },
  Baseball: {
    icon: "⚾",
    topBorder: "bg-gradient-to-r from-indigo-500 to-blue-400",
    iconBg: "bg-indigo-50 ring-1 ring-indigo-200/60 text-2xl",
    actionClass: "text-indigo-600 font-semibold group-hover:text-indigo-700 group-hover:translate-x-1 transition-all",
    hoverBorder: "hover:border-indigo-300",
    hoverShadow: "hover:shadow-lg hover:shadow-indigo-500/5",
    statusBadgeClass: "bg-indigo-50 text-indigo-700 border border-indigo-200",
    statusDotClass: "bg-indigo-500 animate-pulse",
    statusKey: "home.statusLive",
    descKey: "home.viewDraw",
    actionKey: "home.viewDrawAction",
    subtitleKey: "home.defaultSportSubtitle",
  },
  Softball: {
    icon: "🥎",
    topBorder: "bg-gradient-to-r from-pink-500 to-rose-400",
    iconBg: "bg-pink-50 ring-1 ring-pink-200/60 text-2xl",
    actionClass: "text-pink-600 font-semibold group-hover:text-pink-700 group-hover:translate-x-1 transition-all",
    hoverBorder: "hover:border-pink-300",
    hoverShadow: "hover:shadow-lg hover:shadow-pink-500/5",
    statusBadgeClass: "bg-pink-50 text-pink-700 border border-pink-200",
    statusDotClass: "bg-pink-500 animate-pulse",
    statusKey: "home.statusLive",
    descKey: "home.viewDraw",
    actionKey: "home.viewDrawAction",
    subtitleKey: "home.defaultSportSubtitle",
  },
};

const defaultSportStyle: SportCardStyle = {
  icon: "🏆",
  topBorder: "bg-gradient-to-r from-emerald-600 to-teal-500",
  iconBg: "bg-slate-50 ring-1 ring-slate-200/60 text-2xl",
  actionClass: "text-emerald-600 font-semibold group-hover:text-emerald-700 group-hover:translate-x-1 transition-all",
  hoverBorder: "hover:border-emerald-300",
  hoverShadow: "hover:shadow-lg hover:shadow-emerald-500/5",
  statusBadgeClass: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  statusDotClass: "bg-emerald-500 animate-pulse",
  statusKey: "home.statusLive",
  descKey: "home.viewDraw",
  actionKey: "home.viewDrawAction",
  subtitleKey: "home.defaultSportSubtitle",
};

export type TournamentLifecycleStatus = 'in_progress' | 'upcoming' | 'off_season';

export interface SportCardItem {
  sport: string;
  status: TournamentLifecycleStatus;
  tournamentName?: string;
}

export const statusConfig: Record<
  TournamentLifecycleStatus,
  {
    badgeClass: string;
    dotClass: string;
    labelKey: string;
    subtextColor: string;
  }
> = {
  in_progress: {
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotClass: "bg-emerald-500 animate-pulse",
    labelKey: "home.statusInProgress",
    subtextColor: "text-emerald-700 font-medium",
  },
  upcoming: {
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    dotClass: "bg-amber-500",
    labelKey: "home.statusUpcoming",
    subtextColor: "text-amber-700 font-medium",
  },
  off_season: {
    badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
    dotClass: "bg-slate-400",
    labelKey: "home.statusOffSeason",
    subtextColor: "text-slate-400",
  },
};

export interface MultiSportEvent {
  id: string;
  name: string;
  linkSport: string;
  sports: string[];
  venue?: string;
}

interface HomeClientProps {
  sportsToShow?: string[];
  sportsData?: SportCardItem[];
  multiSportEvents: MultiSportEvent[];
  globalSponsors?: GlobalSponsorItem[];
}

export default function HomeClient({
  sportsToShow,
  sportsData,
  multiSportEvents,
  globalSponsors = [],
}: HomeClientProps) {
  const { t } = useI18n();

  // Normalize items to SportCardItem[]
  const items: SportCardItem[] =
    sportsData && sportsData.length > 0
      ? sportsData
      : (sportsToShow || ["Soccer", "Tennis"]).map((sport) => {
          if (sport.toLowerCase() === "soccer") {
            return { sport, status: "in_progress", tournamentName: "台大盃" };
          }
          if (sport.toLowerCase() === "tennis") {
            return { sport, status: "off_season" };
          }
          return { sport, status: "off_season" };
        });

  return (
    <div className="relative overflow-hidden pb-8 sm:pb-12">
      {/* Subtle ambient mesh gradient glow behind hero */}
      <div
        className="pointer-events-none -z-10 absolute top-0 inset-x-0 flex justify-center overflow-hidden"
        aria-hidden="true"
      >
        <div className="h-[280px] w-[580px] max-w-full -translate-y-12 bg-gradient-to-tr from-blue-400/20 via-teal-300/15 to-emerald-400/15 blur-3xl rounded-full" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
        {/* Compact SaaS Hero Section */}
        <div className="text-center pt-6 pb-4 sm:pt-10 sm:pb-6 animate-fadeIn">
          {/* Status Pill / Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold px-3 py-1 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
            <span>{t("home.statusBadge")}</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mt-3 sm:mt-4">
            {t("home.title")}
          </h1>

          {/* Subheadline */}
          <p className="text-sm sm:text-base text-slate-600 mt-2 sm:mt-3 max-w-xl mx-auto leading-relaxed">
            {t("home.subtitle")}
          </p>
        </div>

        {/* Sports cards grid */}
        <div className="mt-2 mb-10 sm:mb-12 animate-fadeIn max-w-4xl mx-auto" style={{ animationDelay: "0.15s" }}>
          <div
            className={`grid gap-3.5 sm:gap-6 ${
              items.length === 1
                ? "grid-cols-1 max-w-md mx-auto"
                : "grid-cols-1 sm:grid-cols-2"
            }`}
          >
            {items.map((item, index) => {
              const { sport, status, tournamentName } = item;
              const sportLower = sport.toLowerCase();
              const style = sportCardStyles[sport] || defaultSportStyle;
              const statusInfo = statusConfig[status] || statusConfig.off_season;

              // Subtitle text: if active or upcoming tournament name exists, show it; if off-season show clean muted fallback
              const subtitleContent = tournamentName
                ? tournamentName
                : status === "off_season"
                ? t("home.noActiveTournament")
                : undefined;

              return (
                <LoadingLink
                  key={sport}
                  href={`/sports/${sportLower.replace(/\s+/g, "")}`}
                  className={`relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 shadow-xs sm:shadow-sm ${style.hoverBorder} ${style.hoverShadow} transition-all duration-200 hover:-translate-y-0.5 group active:scale-[0.98] block p-4 sm:p-5`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  {/* Top border accent line */}
                  <div className={`absolute top-0 inset-x-0 h-[2.5px] sm:h-[3px] ${style.topBorder}`} />

                  {/* Mobile Layout: Balanced, tactile horizontal card */}
                  <div className="flex sm:hidden items-center justify-between w-full gap-3">
                    {/* Left section: Sport icon badge */}
                    <div
                      className={`inline-flex items-center justify-center w-11 h-11 rounded-xl ${style.iconBg} text-xl shadow-xs group-hover:scale-105 transition-transform duration-200 shrink-0`}
                    >
                      <span>{style.icon}</span>
                    </div>

                    {/* Middle section: Sport Title + Dynamic Subtitle Column */}
                    <div className="flex flex-col min-w-0 flex-1 text-left">
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-slate-950 transition-colors leading-snug">
                        {sport}
                      </h3>
                      {subtitleContent && (
                        <p className={`text-xs mt-0.5 truncate ${statusInfo.subtextColor}`}>
                          {subtitleContent}
                        </p>
                      )}
                    </div>

                    {/* Right section: Sport Status Badge + CTA Arrow */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusInfo.badgeClass}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`}
                          aria-hidden="true"
                        />
                        <span>{t(statusInfo.labelKey)}</span>
                      </span>
                      <span className="text-sm font-semibold text-slate-400 group-hover:text-slate-700 transition-transform group-hover:translate-x-0.5">
                        →
                      </span>
                    </div>
                  </div>

                  {/* Tablet/Desktop Layout: Structured vertical card */}
                  <div className="hidden sm:flex sm:flex-col sm:justify-between h-full">
                    <div>
                      {/* Top row: Icon badge + Status pill */}
                      <div className="flex items-start justify-between mb-4">
                        <div
                          className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${style.iconBg} shadow-sm group-hover:scale-105 transition-transform duration-200`}
                        >
                          <span>{style.icon}</span>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusInfo.badgeClass} shadow-xs`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`}
                            aria-hidden="true"
                          />
                          <span>{t(statusInfo.labelKey)}</span>
                        </span>
                      </div>

                      {/* Sport Title */}
                      <h3 className="text-xl sm:text-2xl font-bold text-slate-900 group-hover:text-slate-950 transition-colors mb-1">
                        {sport}
                      </h3>

                      {/* Dynamic Tournament Subtitle */}
                      {subtitleContent && (
                        <p className={`text-xs sm:text-sm mt-0.5 mb-3 truncate ${statusInfo.subtextColor}`}>
                          {subtitleContent}
                        </p>
                      )}
                    </div>

                    {/* Differentiated Action Button / Link */}
                    <div
                      className={`pt-3 border-t border-slate-100 text-xs sm:text-sm inline-flex items-center gap-1 ${style.actionClass}`}
                    >
                      <span>{t(style.actionKey)}</span>
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
