"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import LanguageSwitcher from "./LanguageSwitcher";

interface TennisNavbarClientProps {
  eventName?: string;
  tournamentType?: string;
}

export default function TennisNavbarClient({ eventName, tournamentType }: TennisNavbarClientProps) {
  const pathname = usePathname();
  const { locale, t } = useI18n();

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
        {/* Mobile Layout: Stacked */}
        <div className="md:hidden py-3 space-y-3">
          {/* Breadcrumb - Smaller on mobile */}
          <div className="flex items-center gap-1.5 text-xs overflow-x-auto">
            <Link href="/" className="text-gray-500 hover:text-ntu-green transition-colors whitespace-nowrap">
              {t("home.title")}
            </Link>
            <span className="text-gray-400">/</span>
            <Link href={basePath} className="text-gray-700 hover:text-ntu-green transition-colors font-medium whitespace-nowrap">
              {sportIcon} {sportName}
            </Link>
            {eventName && (
              <>
                <span className="text-gray-400">/</span>
                <span className="text-ntu-green font-semibold truncate max-w-[120px]">{eventName}</span>
              </>
            )}
            <span className="ml-auto flex-shrink-0">
              <LanguageSwitcher />
            </span>
          </div>

          {/* Navigation Links - Full width buttons on mobile */}
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            <Link
              href={drawUrl}
              className={`px-3 py-3 rounded-lg text-sm font-medium transition-colors text-center min-h-[44px] flex items-center justify-center ${
                isActive(drawUrl)
                  ? "bg-ntu-green text-white"
                  : "text-gray-700 bg-gray-100 hover:bg-ntu-green hover:text-white"
              }`}
            >
              {tournamentType === "season_play" ? t("navigation.standings") : t("navigation.draw")}
            </Link>
            <Link
              href={scheduleUrl}
              className={`px-3 py-3 rounded-lg text-sm font-medium transition-colors text-center min-h-[44px] flex items-center justify-center ${
                isActive(scheduleUrl)
                  ? "bg-ntu-green text-white"
                  : "text-gray-700 bg-gray-100 hover:bg-ntu-green hover:text-white"
              }`}
            >
              {t("navigation.schedule")}
            </Link>
            <Link
              href={rulesUrl}
              className={`px-3 py-3 rounded-lg text-sm font-medium transition-colors text-center min-h-[44px] flex items-center justify-center ${
                isActive(rulesUrl)
                  ? "bg-ntu-green text-white"
                  : "text-gray-700 bg-gray-100 hover:bg-ntu-green hover:text-white"
              }`}
            >
              {t("navigation.rules")}
            </Link>
            <Link
              href={announcementsUrl}
              className={`px-3 py-3 rounded-lg text-sm font-medium transition-colors text-center min-h-[44px] flex items-center justify-center ${
                isActive(announcementsUrl)
                  ? "bg-ntu-green text-white"
                  : "text-gray-700 bg-gray-100 hover:bg-ntu-green hover:text-white"
              }`}
            >
              {t("navigation.announcements")}
            </Link>
          </div>

          {/* Back Button - Full width on mobile */}
          <Link 
            href={basePath} 
            className="text-sm text-gray-600 hover:text-ntu-green transition-colors flex items-center justify-center gap-1 py-2 min-h-[44px]"
          >
            <span>←</span>
            <span>{t("navigation.backToSport").replace("{sport}", sportName)}</span>
          </Link>
        </div>

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
              {tournamentType === "season_play" ? t("navigation.standings") : t("navigation.draw")}
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

