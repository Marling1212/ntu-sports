"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import { useEventNav } from "@/lib/context/EventNavContext";
import LanguageSwitcher from "./LanguageSwitcher";

interface TennisNavbarClientProps {
  eventName?: string;
  tournamentType?: string;
}

export default function TennisNavbarClient({ eventName, tournamentType }: TennisNavbarClientProps) {
  const pathname = usePathname();
  const { locale, t } = useI18n();
  const { regularSeasonComplete, tournamentType: contextTournamentType } = useEventNav();
  const effectiveTournamentType = contextTournamentType ?? tournamentType;
  const drawLabel =
    effectiveTournamentType === "season_play"
      ? regularSeasonComplete
        ? t("navigation.playoffs")
        : t("navigation.standings")
      : t("navigation.draw");

  // Derive current sport from the URL: /sports/[sport]/...
  const segments = pathname.split("/").filter(Boolean);
  const sport = segments[1] || "tennis";
  const sportName = sport.charAt(0).toUpperCase() + sport.slice(1);
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
  const sportIcon = sportIcons[sport.toLowerCase()] || "🏆";
  const basePath = `/sports/${sport}`;

  // Check if we're on an event-specific page (e.g., /sports/tennis/events/[eventId]/draw)
  // If segments are: ["sports", "tennis", "events", "eventId", "draw"]
  const eventIdIndex = segments.indexOf("events");
  const eventId = eventIdIndex !== -1 && segments[eventIdIndex + 1] ? segments[eventIdIndex + 1] : null;
  
  // Build URLs - use event-specific paths if eventId exists, otherwise use old structure
  const drawUrl = eventId ? `${basePath}/events/${eventId}/draw` : `${basePath}/draw`;
  const scheduleUrl = eventId ? `${basePath}/events/${eventId}/schedule` : `${basePath}/schedule`;
  const rulesUrl = eventId ? `${basePath}/events/${eventId}/rules` : `${basePath}/rules`;
  const announcementsUrl = eventId ? `${basePath}/events/${eventId}/announcements` : `${basePath}/announcements`;

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        {/* Mobile Layout: Compact top + Bottom nav */}
        <div className="md:hidden py-3">
          {/* Breadcrumb + Language + Back - compact top bar */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs overflow-x-auto min-w-0">
              <Link href="/" className="text-gray-500 hover:text-ntu-green transition-colors whitespace-nowrap shrink-0">
                {t("home.title")}
              </Link>
              <span className="text-gray-400 shrink-0">/</span>
              <Link href={basePath} className="text-gray-700 hover:text-ntu-green transition-colors font-medium whitespace-nowrap shrink-0">
                {sportIcon} {sportName}
              </Link>
              {eventName && (
                <>
                  <span className="text-gray-400 shrink-0">/</span>
                  <span className="text-ntu-green font-semibold truncate">{eventName}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={basePath}
                className="text-xs text-gray-600 hover:text-ntu-green transition-colors whitespace-nowrap"
              >
                ← {t("navigation.backToSport").replace("{sport}", sportName)}
              </Link>
              <LanguageSwitcher />
            </div>
          </div>
        </div>

        {/* Mobile Bottom Nav - only on event pages (eventId) where layout has pb-20 */}
        {eventId && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-pb">
          <div className="grid grid-cols-4 gap-px bg-gray-200">
            <Link
              href={drawUrl}
              className={`py-3 px-2 flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors bg-white min-h-[56px] text-center ${
                isActive(drawUrl) ? "text-ntu-green bg-ntu-green/5" : "text-gray-600"
              }`}
            >
              <span className="text-lg">📊</span>
              <span className="text-center">{drawLabel}</span>
            </Link>
            <Link
              href={scheduleUrl}
              className={`py-3 px-2 flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors bg-white min-h-[56px] text-center ${
                isActive(scheduleUrl) ? "text-ntu-green bg-ntu-green/5" : "text-gray-600"
              }`}
            >
              <span className="text-lg">🏀</span>
              <span className="text-center">{t("navigation.schedule")}</span>
            </Link>
            <Link
              href={rulesUrl}
              className={`py-3 px-2 flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors bg-white min-h-[56px] text-center ${
                isActive(rulesUrl) ? "text-ntu-green bg-ntu-green/5" : "text-gray-600"
              }`}
            >
              <span className="text-lg">📋</span>
              <span className="text-center">{t("navigation.rules")}</span>
            </Link>
            <Link
              href={announcementsUrl}
              className={`py-3 px-2 flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors bg-white min-h-[56px] text-center ${
                isActive(announcementsUrl) ? "text-ntu-green bg-ntu-green/5" : "text-gray-600"
              }`}
            >
              <span className="text-lg">📢</span>
              <span className="text-center">{t("navigation.announcements")}</span>
            </Link>
          </div>
        </div>
        )}

        {/* Desktop Layout: Horizontal */}
        <div className="hidden md:flex items-center justify-between h-16">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-sm">
            <Link href="/" className="text-gray-500 hover:text-ntu-green transition-colors">
              {t("home.title")}
            </Link>
            <span className="text-gray-400">/</span>
            <Link href={basePath} className="text-gray-700 hover:text-ntu-green transition-colors font-medium">
              {sportIcon} {sportName}
            </Link>
            {eventName && (
              <>
                <span className="text-gray-400">/</span>
                <span className="text-ntu-green font-semibold">{eventName}</span>
              </>
            )}
          </div>

          {/* Navigation Links */}
          <div className="flex gap-1">
            <Link
              href={drawUrl}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] flex items-center ${
                isActive(drawUrl)
                  ? "bg-ntu-green text-white"
                  : "text-gray-700 hover:bg-ntu-green hover:text-white"
              }`}
            >
              {drawLabel}
            </Link>
            <Link
              href={scheduleUrl}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] flex items-center ${
                isActive(scheduleUrl)
                  ? "bg-ntu-green text-white"
                  : "text-gray-700 hover:bg-ntu-green hover:text-white"
              }`}
            >
              {t("navigation.schedule")}
            </Link>
            <Link
              href={rulesUrl}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] flex items-center ${
                isActive(rulesUrl)
                  ? "bg-ntu-green text-white"
                  : "text-gray-700 hover:bg-ntu-green hover:text-white"
              }`}
            >
              {t("navigation.rules")}
            </Link>
            <Link
              href={announcementsUrl}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] flex items-center ${
                isActive(announcementsUrl)
                  ? "bg-ntu-green text-white"
                  : "text-gray-700 hover:bg-ntu-green hover:text-white"
              }`}
            >
              {t("navigation.announcements")}
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link 
              href={basePath} 
              className="text-sm text-gray-600 hover:text-ntu-green transition-colors flex items-center gap-1 min-h-[44px]"
            >
              <span>←</span>
              <span>{t("navigation.backToSport").replace("{sport}", sportName)}</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

