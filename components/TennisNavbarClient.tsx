"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface TennisNavbarClientProps {
  eventName?: string;
  tournamentType?: string;
}

export default function TennisNavbarClient({ eventName, tournamentType }: TennisNavbarClientProps) {
  const pathname = usePathname();

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

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        {/* Mobile Layout: Stacked */}
        <div className="md:hidden py-3 space-y-3">
          {/* Breadcrumb - Smaller on mobile */}
          <div className="flex items-center gap-1.5 text-xs overflow-x-auto">
            <Link href="/" className="text-gray-500 hover:text-ntu-green transition-colors whitespace-nowrap">
              NTU Sports
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
          </div>

          {/* Navigation Links - Full width buttons on mobile */}
          <div className="grid grid-cols-3 gap-2">
            <Link
              href={`${basePath}/draw`}
              className={`px-3 py-3 rounded-lg text-sm font-medium transition-colors text-center min-h-[44px] flex items-center justify-center ${
                isActive(`${basePath}/draw`)
                  ? "bg-ntu-green text-white"
                  : "text-gray-700 bg-gray-100 hover:bg-ntu-green hover:text-white"
              }`}
            >
              {tournamentType === 'season_play' ? '戰績' : '籤表'}
            </Link>
            <Link
              href={`${basePath}/schedule`}
              className={`px-3 py-3 rounded-lg text-sm font-medium transition-colors text-center min-h-[44px] flex items-center justify-center ${
                isActive(`${basePath}/schedule`)
                  ? "bg-ntu-green text-white"
                  : "text-gray-700 bg-gray-100 hover:bg-ntu-green hover:text-white"
              }`}
            >
              賽程
            </Link>
            <Link
              href={`${basePath}/announcements`}
              className={`px-3 py-3 rounded-lg text-sm font-medium transition-colors text-center min-h-[44px] flex items-center justify-center ${
                isActive(`${basePath}/announcements`)
                  ? "bg-ntu-green text-white"
                  : "text-gray-700 bg-gray-100 hover:bg-ntu-green hover:text-white"
              }`}
            >
              公告
            </Link>
          </div>

          {/* Back Button - Full width on mobile */}
          <Link 
            href={basePath} 
            className="text-sm text-gray-600 hover:text-ntu-green transition-colors flex items-center justify-center gap-1 py-2 min-h-[44px]"
          >
            <span>←</span>
            <span>返回 {sportName} 首頁</span>
          </Link>
        </div>

        {/* Desktop Layout: Horizontal */}
        <div className="hidden md:flex items-center justify-between h-16">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-sm">
            <Link href="/" className="text-gray-500 hover:text-ntu-green transition-colors">
              NTU Sports
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
              href={`${basePath}/draw`}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] flex items-center ${
                isActive(`${basePath}/draw`)
                  ? "bg-ntu-green text-white"
                  : "text-gray-700 hover:bg-ntu-green hover:text-white"
              }`}
            >
              {tournamentType === 'season_play' ? '戰績' : '籤表'}
            </Link>
            <Link
              href={`${basePath}/schedule`}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] flex items-center ${
                isActive(`${basePath}/schedule`)
                  ? "bg-ntu-green text-white"
                  : "text-gray-700 hover:bg-ntu-green hover:text-white"
              }`}
            >
              賽程
            </Link>
            <Link
              href={`${basePath}/announcements`}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] flex items-center ${
                isActive(`${basePath}/announcements`)
                  ? "bg-ntu-green text-white"
                  : "text-gray-700 hover:bg-ntu-green hover:text-white"
              }`}
            >
              公告
            </Link>
          </div>

          {/* Back to Tennis Home */}
          <Link 
            href={basePath} 
            className="text-sm text-gray-600 hover:text-ntu-green transition-colors flex items-center gap-1 min-h-[44px]"
          >
            <span>←</span>
            <span>{sportName} 首頁</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}

