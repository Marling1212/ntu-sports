import { DateTime } from "luxon";

export const SCHEDULE_INPUT_TIMEZONE_STORAGE_KEY = "ntu-sports-admin-schedule-input-tz";
export const DEFAULT_SCHEDULE_INPUT_TIMEZONE = "Asia/Taipei";

export const SCHEDULE_INPUT_TIMEZONE_OPTIONS: { value: string; labelZh: string; labelEn: string }[] = [
  { value: "Asia/Taipei", labelZh: "台北（台灣）", labelEn: "Taipei" },
  { value: "Asia/Tokyo", labelZh: "東京", labelEn: "Tokyo" },
  { value: "Asia/Seoul", labelZh: "首爾", labelEn: "Seoul" },
  { value: "Asia/Singapore", labelZh: "新加坡", labelEn: "Singapore" },
  { value: "UTC", labelZh: "UTC", labelEn: "UTC" },
  { value: "America/Los_Angeles", labelZh: "洛杉磯", labelEn: "Los Angeles" },
  { value: "America/New_York", labelZh: "紐約", labelEn: "New York" },
  { value: "Europe/London", labelZh: "倫敦", labelEn: "London" },
];

function validZone(timeZone: string): string {
  if (!timeZone) return DEFAULT_SCHEDULE_INPUT_TIMEZONE;
  const probe = DateTime.now().setZone(timeZone);
  return probe.isValid ? timeZone : DEFAULT_SCHEDULE_INPUT_TIMEZONE;
}

/**
 * Interpret `datetime-local` value (no offset) as wall clock in `timeZone`, return UTC ISO for DB.
 */
export function datetimeLocalValueToUtcIso(datetimeLocal: string, timeZone: string): string | null {
  if (!datetimeLocal || !datetimeLocal.trim()) return null;
  const zone = validZone(timeZone);
  const dt = DateTime.fromISO(datetimeLocal, { zone });
  if (!dt.isValid) return null;
  return dt.toUTC().toISO({ suppressMilliseconds: true });
}

/**
 * Show a stored UTC instant in the datetime-local input for the chosen zone.
 */
export function utcIsoToDatetimeLocalValue(iso: string | null | undefined, timeZone: string): string {
  if (!iso) return "";
  const zone = validZone(timeZone);
  const dt = DateTime.fromISO(iso, { setZone: true });
  if (!dt.isValid) return "";
  return dt.setZone(zone).toFormat("yyyy-MM-dd'T'HH:mm");
}

/**
 * When the admin changes the input timezone, keep the same instant but re-express numbers in the new zone.
 */
export function rehomeDatetimeLocalValue(
  datetimeLocal: string,
  fromZone: string,
  toZone: string
): string {
  if (!datetimeLocal.trim()) return "";
  const utc = datetimeLocalValueToUtcIso(datetimeLocal, fromZone);
  if (!utc) return "";
  return utcIsoToDatetimeLocalValue(utc, toZone);
}

export function readStoredScheduleInputTimezone(): string {
  if (typeof window === "undefined") return DEFAULT_SCHEDULE_INPUT_TIMEZONE;
  try {
    const s = window.localStorage.getItem(SCHEDULE_INPUT_TIMEZONE_STORAGE_KEY);
    if (s && SCHEDULE_INPUT_TIMEZONE_OPTIONS.some((o) => o.value === s)) return s;
  } catch {
    /* ignore */
  }
  return DEFAULT_SCHEDULE_INPUT_TIMEZONE;
}

export function writeStoredScheduleInputTimezone(timeZone: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SCHEDULE_INPUT_TIMEZONE_STORAGE_KEY, validZone(timeZone));
  } catch {
    /* ignore */
  }
}

/**
 * Parse free-form schedule strings from CSV/Excel as wall time in `zone`, return UTC ISO.
 */
/**
 * First CSV column for schedule import: strict `YYYY-MM-DD` → that calendar day at 00:00 in `zone`;
 * otherwise delegate to {@link parseLooseDateTimeToUtcIso}.
 */
export function parseCsvScheduleFirstColumnToUtcIso(value: string, timeZone: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^week/i.test(trimmed)) return null;
  const z = validZone(timeZone);
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const dt = DateTime.fromISO(`${trimmed}T00:00:00`, { zone: z });
    if (!dt.isValid) return null;
    return dt.toUTC().toISO({ suppressMilliseconds: true });
  }
  return parseLooseDateTimeToUtcIso(trimmed, z);
}

export function parseLooseDateTimeToUtcIso(raw: string, zone: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "TBD") return null;
  const dateStr = trimmed.replace(/下午/g, "PM").replace(/上午/g, "AM");
  const z = validZone(zone);

  const fmts = [
    "yyyy/M/d HH:mm:ss",
    "yyyy/M/d H:mm:ss",
    "yyyy/M/d HH:mm",
    "yyyy/M/d H:mm",
    "yyyy/M/d hh:mm:ss a",
    "yyyy/M/d h:mm:ss a",
    "yyyy/M/d hh:mm a",
    "yyyy/M/d h:mm a",
    "yyyy-MM-dd HH:mm:ss",
    "yyyy-MM-dd H:mm:ss",
    "yyyy-MM-dd HH:mm",
    "yyyy-MM-dd H:mm",
  ];
  for (const f of fmts) {
    const dt = DateTime.fromFormat(dateStr, f, { zone: z });
    if (dt.isValid) return dt.toUTC().toISO({ suppressMilliseconds: true });
  }

  let dt = DateTime.fromISO(dateStr, { zone: z });
  if (dt.isValid) return dt.toUTC().toISO({ suppressMilliseconds: true });

  const matchDate = dateStr.match(
    /(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(AM|PM)?\s*(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/
  );
  if (matchDate) {
    const year = parseInt(matchDate[1], 10);
    const month = parseInt(matchDate[2], 10);
    const day = parseInt(matchDate[3], 10);
    let hour = parseInt(matchDate[5], 10);
    const minute = parseInt(matchDate[6], 10);
    const second = parseInt(matchDate[7] || "0", 10);
    const ampm = matchDate[4];
    if (ampm === "PM" && hour < 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;
    const wall = DateTime.fromObject({ year, month, day, hour, minute, second }, { zone: z });
    if (wall.isValid) return wall.toUTC().toISO({ suppressMilliseconds: true });
  }

  const fallback = Date.parse(dateStr);
  if (!Number.isNaN(fallback)) {
    return DateTime.fromMillis(fallback).toUTC().toISO({ suppressMilliseconds: true });
  }
  return null;
}

/** JS weekday: 0=Sun … 6=Sat (same as SchedulingManager `parseWeekdayValue`). */
function daysFromMondayJs(jsWeekday: number): number {
  return jsWeekday === 0 ? 6 : jsWeekday - 1;
}

/** Luxon weekday 1=Mon … 7=Sun → JS 0=Sun … 6=Sat */
function luxonWeekdayToJs(w: number): number {
  return w === 7 ? 0 : w;
}

function parseHmsParts(hms: string): { h: number; m: number; s: number } {
  const [hRaw, mRaw, sRaw = "0"] = hms.split(":");
  return { h: Number(hRaw), m: Number(mRaw), s: Number(sRaw) };
}

export type WeeklySlotTemplateConvertResult =
  | { ok: true; day_of_week: number; start_time: string; end_time: string }
  | { ok: false; reason: string };

/**
 * Weekly slot template CSV: `weekday` + `start_time`/`end_time` are wall times in `sourceZone`.
 * Converts to Asia/Taipei wall clock + weekday for DB (matches event_slots / auto-schedule).
 * Anchor: 2025-06-09 (Monday) reference week to stabilize DST.
 */
export function convertWeeklySlotTemplateTimesToTaipei(
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  sourceZone: string,
): WeeklySlotTemplateConvertResult {
  const z = validZone(sourceZone);
  if (z === DEFAULT_SCHEDULE_INPUT_TIMEZONE) {
    return { ok: true, day_of_week: dayOfWeek, start_time: startTime, end_time: endTime };
  }

  const anchorMonday = DateTime.fromObject(
    { year: 2025, month: 6, day: 9, hour: 0, minute: 0, second: 0 },
    { zone: z },
  );
  const wallDay = anchorMonday.plus({ days: daysFromMondayJs(dayOfWeek) });
  const sp = parseHmsParts(startTime);
  const ep = parseHmsParts(endTime);
  const startInst = wallDay.set({ hour: sp.h, minute: sp.m, second: sp.s });
  const endInst = wallDay.set({ hour: ep.h, minute: ep.m, second: ep.s });

  if (!startInst.isValid || !endInst.isValid) {
    return { ok: false, reason: "時間無法解析" };
  }

  const startT = startInst.setZone(DEFAULT_SCHEDULE_INPUT_TIMEZONE);
  const endT = endInst.setZone(DEFAULT_SCHEDULE_INPUT_TIMEZONE);

  if (endT <= startT) {
    return {
      ok: false,
      reason: "轉成台灣時間後結束時間需晚於開始時間（跨日或時段過短時請改用手動新增）",
    };
  }

  return {
    ok: true,
    day_of_week: luxonWeekdayToJs(startT.weekday),
    start_time: startT.toFormat("HH:mm:ss"),
    end_time: endT.toFormat("HH:mm:ss"),
  };
}
