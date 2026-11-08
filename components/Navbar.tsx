"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Navbar() {
  const pathname = usePathname();
  const { t, locale } = useI18n();

  const isSoccerActive = pathname.startsWith("/sports/soccer") || pathname === "/soccer";
  const isTennisActive = pathname.startsWith("/sports/tennis") || pathname === "/tennis";

  const soccerLabel = locale === "zh" ? "⚽ 足球" : "⚽ Soccer";
  const tennisLabel = locale === "zh" ? "🎾 網球" : "🎾 Tennis";
  const adminLabel = t("nav.admin") || (locale === "zh" ? "後台管理" : "Admin");

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200/80 shadow-sm transition-colors">
      {/* Top Accent Gradient Line */}
      <div className="h-[2.5px] w-full bg-gradient-to-r from-blue-600 via-teal-400 to-emerald-500" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Left: Brand Anchor */}
        <Link
          href="/"
          className="flex items-center gap-2.5 text-lg sm:text-xl font-bold hover:opacity-90 transition-opacity"
        >
          <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-base ring-1 ring-blue-200/50">
            <span className="leading-none">🏆</span>
          </div>
          <span className="tracking-tight font-extrabold text-slate-900">
            NTU{" "}
            <span className="bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
              Sports
            </span>
          </span>
        </Link>

        {/* Right: Utility Group */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Quick Sport Links: visible on sm: and up */}
          <nav className="hidden sm:flex items-center gap-1 sm:gap-2" aria-label="Quick sports">
            <Link
              href="/soccer"
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                isSoccerActive
                  ? "text-emerald-800 bg-emerald-50 border border-emerald-200/80"
                  : "text-slate-600 hover:text-emerald-700 hover:bg-emerald-50"
              }`}
            >
              {soccerLabel}
            </Link>
            <Link
              href="/tennis"
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                isTennisActive
                  ? "text-amber-800 bg-amber-50 border border-amber-200/80"
                  : "text-slate-600 hover:text-amber-700 hover:bg-amber-50"
              }`}
            >
              {tennisLabel}
            </Link>
          </nav>

          {/* Subtle vertical divider */}
          <div className="hidden sm:block h-4 w-px bg-slate-200" aria-hidden="true" />

          {/* Language Selector */}
          <LanguageSwitcher />

          {/* Admin CTA */}
          <Link
            href="/admin"
            className="inline-flex items-center justify-center bg-blue-50/70 hover:bg-blue-100/90 text-blue-700 border border-blue-200/70 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            {adminLabel}
          </Link>
        </div>
      </div>
    </header>
  );
}
