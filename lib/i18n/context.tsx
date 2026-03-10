"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Locale, translations, defaultLocale } from "./translations";

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children, initialLocale = defaultLocale }: { children: ReactNode; initialLocale?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    // Load saved locale from localStorage
    const saved = localStorage.getItem('locale') as Locale | null;
    if (saved && (saved === 'zh' || saved === 'en')) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('locale', newLocale);
    document.cookie = `locale=${newLocale};path=/;max-age=31536000`;
    if (typeof document !== 'undefined') {
      document.documentElement.lang = newLocale === 'zh' ? 'zh-TW' : 'en';
    }
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: any = translations[locale];
    
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) {
        // Fallback to default locale if key not found
        value = translations[defaultLocale];
        for (const k2 of keys) {
          value = value?.[k2];
        }
        break;
      }
    }
    
    let result = typeof value === 'string' ? value : key;
    
    // Replace parameters if provided
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        result = result.replace(new RegExp(`{${k}}`, 'g'), String(v));
      });
    }
    
    return result;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

