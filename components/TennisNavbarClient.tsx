"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface TennisNavbarClientProps {
  eventName?: string;
}

export default function TennisNavbarClient({ eventName }: TennisNavbarClientProps) {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-sm">
            <Link href="/" className="text-gray-500 hover:text-ntu-green transition-colors">
              NTU Sports
            </Link>
            <span className="text-gray-400">/</span>
            <Link href="/sports/tennis" className="text-gray-700 hover:text-ntu-green transition-colors font-medium">
              🎾 Tennis
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
              href="/sports/tennis/draw"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive("/sports/tennis/draw")
                  ? "bg-ntu-green text-white"
                  : "text-gray-700 hover:bg-ntu-green hover:text-white"
              }`}
            >
              籤表
            </Link>
            <Link
              href="/sports/tennis/schedule"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive("/sports/tennis/schedule")
                  ? "bg-ntu-green text-white"
                  : "text-gray-700 hover:bg-ntu-green hover:text-white"
              }`}
            >
              賽程
            </Link>
            <Link
              href="/sports/tennis/announcements"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive("/sports/tennis/announcements")
                  ? "bg-ntu-green text-white"
                  : "text-gray-700 hover:bg-ntu-green hover:text-white"
              }`}
            >
              公告
            </Link>
          </div>

          {/* Back to Tennis Home */}
          <Link 
            href="/sports/tennis" 
            className="text-sm text-gray-600 hover:text-ntu-green transition-colors flex items-center gap-1"
          >
            <span>←</span>
            <span className="hidden sm:inline">Tennis 首頁</span>
            <span className="sm:hidden">返回</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}

