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
    <header className="sticky top-0 z-50 w-full bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Left: Brand Anchor */}
        <Link
          href="/"
          className="flex items-center gap-2 text-lg sm:text-xl font-bold text-ntu-green dark:text-emerald-400 hover:opacity-90 transition-opacity"
        >
          <span className="text-xl sm:text-2xl leading-none">🏆</span>
          <span className="tracking-tight font-extrabold">NTU Sports</span>
        </Link>

        {/* Right: Utility Group */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Quick Sport Links: visible on sm: and up */}
          <nav className="hidden sm:flex items-center gap-1 sm:gap-2" aria-label="Quick sports">
            <Link
              href="/soccer"
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                isSoccerActive
                  ? "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80"
                  : "text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {soccerLabel}
            </Link>
            <Link
              href="/tennis"
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                isTennisActive
                  ? "text-lime-800 dark:text-lime-300 bg-lime-50 dark:bg-lime-950/50 border border-lime-200 dark:border-lime-800/80"
                  : "text-slate-600 dark:text-slate-300 hover:text-lime-800 dark:hover:text-lime-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {tennisLabel}
            </Link>
          </nav>

          {/* Subtle vertical divider */}
          <div className="hidden sm:block h-4 w-px bg-slate-200 dark:bg-slate-700" aria-hidden="true" />

          {/* Language Selector */}
          <LanguageSwitcher />

          {/* Admin CTA */}
          <Link
            href="/admin"
            className="inline-flex items-center justify-center px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg border border-emerald-600/30 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-700 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white transition-all duration-200 shadow-sm"
          >
            {adminLabel}
          </Link>
        </div>
      </div>
    </header>
  );
}
