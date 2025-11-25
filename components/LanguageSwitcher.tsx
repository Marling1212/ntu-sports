"use client";

import { useI18n } from "@/lib/i18n/context";
import { Locale } from "@/lib/i18n/translations";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  const toggleLanguage = () => {
    const newLocale: Locale = locale === 'zh' ? 'en' : 'zh';
    setLocale(newLocale);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-300 font-medium text-sm sm:text-base flex items-center gap-2"
      aria-label="切換語言 / Switch Language"
    >
      <span>{locale === 'zh' ? '🇹🇼' : '🇺🇸'}</span>
      <span className="hidden sm:inline">{locale === 'zh' ? '中文' : 'English'}</span>
      <span className="sm:hidden">{locale === 'zh' ? '中' : 'EN'}</span>
    </button>
  );
}

