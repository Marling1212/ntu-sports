"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/translations";

const LOCALE_LABELS: Record<Locale, string> = { zh: "中文", en: "EN" };

export default function LanguageSwitcher({ className = "" }: { className?: string }) {
  const router = useRouter();
  const { locale, setLocale } = useI18n();

  const handleSetLocale = (loc: Locale) => {
    if (locale === loc) return;
    setLocale(loc);
    router.refresh();
  };

  return (
    <div
      className={`inline-flex items-center p-0.5 rounded-full bg-gray-100 border border-gray-300 text-xs font-medium ${className}`}
      role="group"
      aria-label="Language selector"
    >
      {(["zh", "en"] as const).map((loc) => {
        const isActive = locale === loc;
        return (
          <button
            key={loc}
            type="button"
            onClick={() => handleSetLocale(loc)}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-200 ${
              isActive
                ? "bg-white text-ntu-green shadow-sm"
                : "text-gray-700 hover:text-gray-900"
            }`}
            aria-pressed={isActive}
            aria-label={LOCALE_LABELS[loc]}
          >
            {LOCALE_LABELS[loc]}
          </button>
        );
      })}
    </div>
  );
}
