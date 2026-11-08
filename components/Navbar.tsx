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
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Left: Brand Anchor */}
        <Link
          href="/"
          className="flex items-center gap-2 text-lg sm:text-xl font-bold text-ntu-green dark:text-emerald-400 hover:opacity-90 transition-opacity"
        >
          <span className="text-xl sm:text-2xl leading-none">🏆</span>
          <span className="tracking-tight">NTU Sports</span>
        </Link>

        {/* Right: Utility Group */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Quick Sport Links: visible on sm: and up */}
          <nav className="hidden sm:flex items-center gap-1 sm:gap-2" aria-label="Quick sports">
            <Link
              href="/soccer"
              className={`px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                isSoccerActive
                  ? "text-ntu-green dark:text-emerald-400 font-semibold bg-ntu-green/10 dark:bg-emerald-500/10"
                  : "text-slate-600 dark:text-slate-300 hover:text-ntu-green dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {soccerLabel}
            </Link>
            <Link
              href="/tennis"
              className={`px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                isTennisActive
                  ? "text-ntu-green dark:text-emerald-400 font-semibold bg-ntu-green/10 dark:bg-emerald-500/10"
                  : "text-slate-600 dark:text-slate-300 hover:text-ntu-green dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800"
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
            className="inline-flex items-center justify-center px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg border border-ntu-green/30 text-ntu-green hover:bg-ntu-green hover:text-white dark:border-emerald-500/30 dark:text-emerald-400 dark:hover:bg-emerald-600 dark:hover:text-white transition-all duration-200 shadow-sm"
          >
            {adminLabel}
          </Link>
        </div>
      </div>
    </header>
  );
}
