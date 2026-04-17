import { cookies } from "next/headers";
import { translations, type Locale } from "./translations";

const COOKIE_NAME = "locale";

/** Get current locale from cookie (for server components). Default zh. */
export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;
  if (value === "en" || value === "zh") return value;
  return "zh";
}

/** Get t(key) for server components. Use with await getLocale(). */
export function getT(locale: Locale) {
  return function t(key: string, params?: Record<string, string | number>): string {
    const keys = key.split(".");
    let value: unknown = translations[locale];
    for (const k of keys) {
      value = (value as Record<string, unknown>)?.[k];
      if (value === undefined) {
        value = translations.zh as Record<string, unknown>;
        for (const k2 of keys) {
          value = (value as Record<string, unknown>)?.[k2];
        }
        break;
      }
    }
    let result = typeof value === "string" ? value : key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        result = result.replace(new RegExp(`{${k}}`, "g"), String(v));
      });
    }
    return result;
  };
}

export { COOKIE_NAME };
