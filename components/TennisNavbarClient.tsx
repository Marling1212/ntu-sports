"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TennisNavbarClient() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Brand */}
          <Link href="/sports/tennis" className="text-xl font-bold text-ntu-green hover:opacity-80 transition-opacity">
            🎾 Tennis
          </Link>

          {/* Navigation Links */}
          <div className="flex gap-1">
            <Link
              href="/sports/tennis/draw"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive("/sports/tennis/draw")
                  ? "bg-ntu-green text-white"
                  : "text-gray-700 hover:bg-ntu-green hover:text-white"
              }`}
            >
              籤表 Draw
            </Link>
            <Link
              href="/sports/tennis/schedule"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive("/sports/tennis/schedule")
                  ? "bg-ntu-green text-white"
                  : "text-gray-700 hover:bg-ntu-green hover:text-white"
              }`}
            >
              賽程 Schedule
            </Link>
            <Link
              href="/sports/tennis/announcements"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive("/sports/tennis/announcements")
                  ? "bg-ntu-green text-white"
                  : "text-gray-700 hover:bg-ntu-green hover:text-white"
              }`}
            >
              公告 Announcements
            </Link>
          </div>

          {/* Back to Home */}
          <Link 
            href="/" 
            className="text-sm text-gray-600 hover:text-ntu-green transition-colors"
          >
            ← Home
          </Link>
        </div>
      </div>
    </nav>
  );
}

