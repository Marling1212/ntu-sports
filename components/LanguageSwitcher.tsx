"use client";

import { useI18n } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/translations";

const LOCALE_LABELS: Record<Locale, string> = { zh: "中文", en: "EN" };

export default function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
      {(["zh", "en"] as const).map((loc) => (
        <button
          key={loc}
          type="button"
          onClick={() => setLocale(loc)}
          className={`rounded-md px-2 py-1 text-sm font-medium transition-colors ${
            locale === loc
              ? "bg-ntu-green text-white"
              : "text-gray-600 hover:bg-gray-200"
          }`}
          aria-label={LOCALE_LABELS[loc]}
        >
          {LOCALE_LABELS[loc]}
        </button>
      ))}
    </div>
  );
}
