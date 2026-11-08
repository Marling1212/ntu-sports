"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import FeedbackButton from "@/components/FeedbackButton";

export default function Footer() {
  const { t, locale } = useI18n();
  // Static year to avoid hydration mismatch
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-white/90 border-t border-slate-200/60 transition-colors">
      {/* Pinned 2px top gradient accent line echoing the header */}
      <div className="h-[2px] w-full bg-gradient-to-r from-blue-600/40 via-teal-400/40 to-emerald-500/40" />

      <div className="max-w-6xl mx-auto px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10">
          {/* Column 1: Brand & About */}
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 text-lg font-bold hover:opacity-90 transition-opacity"
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
            <p className="text-sm text-slate-500 leading-relaxed max-w-sm mt-3">
              {t("footer.aboutText")}
            </p>
          </div>

          {/* Column 2: Quick Links & Sports */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              {t("footer.quickLinks")}
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-slate-600 hover:text-blue-600 transition-colors">
                  {t("nav.home")}
                </Link>
              </li>
              <li>
                <Link href="/soccer" className="text-slate-600 hover:text-blue-600 transition-colors">
                  {locale === "zh" ? "足球 ⚽" : "Soccer ⚽"}
                </Link>
              </li>
              <li>
                <Link href="/tennis" className="text-slate-600 hover:text-blue-600 transition-colors">
                  {locale === "zh" ? "網球 🎾" : "Tennis 🎾"}
                </Link>
              </li>
              <li>
                <Link href="/admin" className="text-slate-600 hover:text-blue-600 transition-colors">
                  {t("nav.admin") || (locale === "zh" ? "後台管理" : "Admin")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Platform Features & Feedback */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              {t("footer.features")}
            </h3>
            <div className="flex flex-wrap mb-3">
              <span className="inline-block bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-md font-medium mr-1.5 mb-1.5">
                {t("footer.feature1")}
              </span>
              <span className="inline-block bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-md font-medium mr-1.5 mb-1.5">
                {t("footer.feature2")}
              </span>
              <span className="inline-block bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-md font-medium mr-1.5 mb-1.5">
                {t("footer.feature3")}
              </span>
              <span className="inline-block bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-md font-medium mr-1.5 mb-1.5">
                {t("footer.feature4")}
              </span>
            </div>
            <div className="mt-4">
              <FeedbackButton className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-all">
                <span>💬</span>
                <span>{t("footer.feedback")}</span>
              </FeedbackButton>
            </div>
          </div>
        </div>

        {/* Bottom Sub-bar */}
        <div className="mt-10 pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-400 gap-2">
          <p>
            © {currentYear} {locale === "zh" ? "NTU Sports (臺大體育賽事平台). All rights reserved." : t("footer.copyright")}
          </p>
          <p>{t("footer.madeWith")}</p>
        </div>
      </div>
    </footer>
  );
}
