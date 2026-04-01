import { DateTime } from "luxon";

const TAIPEI = "Asia/Taipei";

function daysFromMondayJs(jsWeekday: number): number {
  return jsWeekday === 0 ? 6 : jsWeekday - 1;
}

function luxonWeekdayToJs(w: number): number {
  return w === 7 ? 0 : w;
}

function parseHms(t: string): { h: number; m: number; s: number } {
  const pad = (x: string) => (x.length === 5 ? `${x}:00` : x);
  const p = pad(t.trim());
  const [h, m, s = "0"] = p.split(":");
  return { h: Number(h), m: Number(m), s: Number(s) };
}

/** Shift a UTC ISO instant by offset hours. */
export function shiftMatchScheduledTimeIso(iso: string, offsetHours: number): string | null {
  const dt = DateTime.fromISO(iso, { setZone: true });
  if (!dt.isValid) return null;
  return dt.plus({ hours: offsetHours }).toUTC().toISO({ suppressMilliseconds: true });
}

/**
 * Shift concrete calendar slot (Taipei wall). Returns null if result cannot be stored
 * (DB requires same slot_date and end_time > start_time as times on that day).
 */
export function shiftEventSlotRow(
  slotDate: string,
  startTime: string,
  endTime: string,
  offsetHours: number,
): { slot_date: string; start_time: string; end_time: string } | null {
  const sp = parseHms(startTime);
  const ep = parseHms(endTime);
  let startDt = DateTime.fromObject(
    {
      year: Number(slotDate.slice(0, 4)),
      month: Number(slotDate.slice(5, 7)),
      day: Number(slotDate.slice(8, 10)),
      hour: sp.h,
      minute: sp.m,
      second: sp.s,
    },
    { zone: TAIPEI },
  );
  let endDt = DateTime.fromObject(
    {
      year: Number(slotDate.slice(0, 4)),
      month: Number(slotDate.slice(5, 7)),
      day: Number(slotDate.slice(8, 10)),
      hour: ep.h,
      minute: ep.m,
      second: ep.s,
    },
    { zone: TAIPEI },
  );
  if (!startDt.isValid || !endDt.isValid) return null;
  if (endDt <= startDt) endDt = endDt.plus({ days: 1 });

  startDt = startDt.plus({ hours: offsetHours });
  endDt = endDt.plus({ hours: offsetHours });
  if (endDt <= startDt) endDt = endDt.plus({ days: 1 });

  if (startDt.toFormat("yyyy-MM-dd") !== endDt.toFormat("yyyy-MM-dd")) return null;
  if (endDt <= startDt) return null;

  return {
    slot_date: startDt.toFormat("yyyy-MM-dd"),
    start_time: startDt.toFormat("HH:mm:ss"),
    end_time: endDt.toFormat("HH:mm:ss"),
  };
}

/**
 * Shift weekly template row (anchor week in Taipei). Null if DB constraint would break.
 */
export function shiftWeeklyTemplateRow(
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  offsetHours: number,
): { day_of_week: number; start_time: string; end_time: string } | null {
  const anchorMonday = DateTime.fromObject(
    { year: 2025, month: 6, day: 9, hour: 0, minute: 0, second: 0 },
    { zone: TAIPEI },
  );
  const wallDay = anchorMonday.plus({ days: daysFromMondayJs(dayOfWeek) });
  const sp = parseHms(startTime);
  const ep = parseHms(endTime);
  let startDt = wallDay.set({ hour: sp.h, minute: sp.m, second: sp.s });
  let endDt = wallDay.set({ hour: ep.h, minute: ep.m, second: ep.s });
  if (endDt <= startDt) endDt = endDt.plus({ days: 1 });

  startDt = startDt.plus({ hours: offsetHours });
  endDt = endDt.plus({ hours: offsetHours });
  if (endDt <= startDt) endDt = endDt.plus({ days: 1 });

  if (startDt.toFormat("yyyy-MM-dd") !== endDt.toFormat("yyyy-MM-dd")) return null;
  if (endDt <= startDt) return null;

  return {
    day_of_week: luxonWeekdayToJs(startDt.weekday),
    start_time: startDt.toFormat("HH:mm:ss"),
    end_time: endDt.toFormat("HH:mm:ss"),
  };
}
