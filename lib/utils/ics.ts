import { DateTime } from "luxon";

const TAIPEI = "Asia/Taipei";

function padWallTime(t: string): string {
  const raw = String(t).trim();
  return raw.length === 5 ? `${raw}:00` : raw;
}

/**
 * Build an ISO instant for ICS from DB slot wall fields (slot_date + time in Taipei).
 */
export function slotWallToTaipeiIso(slotDate: string, time: string): string {
  return `${slotDate}T${padWallTime(time)}+08:00`;
}

/** Length of the slot window in whole minutes (Taipei wall). Handles end after midnight. */
export function slotWallDurationMinutes(
  slotDate: string,
  startTime: string,
  endTime: string,
): number | null {
  let start = DateTime.fromISO(`${slotDate}T${padWallTime(startTime)}`, { zone: TAIPEI });
  let end = DateTime.fromISO(`${slotDate}T${padWallTime(endTime)}`, { zone: TAIPEI });
  if (!start.isValid || !end.isValid) return null;
  if (end <= start) end = end.plus({ days: 1 });
  const mins = end.diff(start, "minutes").minutes;
  if (!Number.isFinite(mins) || mins <= 0) return null;
  return Math.round(mins);
}

/**
 * ICS start/end aligned with the match detail UI: start uses `matches.scheduled_time`
 * (what the shift API updates). When a slot window exists, end = start + that window's
 * duration so downloads track shifts even if `event_slots` wall times were not updated.
 */
export function calendarRangeFromMatchForICS(
  scheduledTime: string | null | undefined,
  slot: { slot_date?: string; start_time?: string; end_time?: string } | null | undefined,
): { startTime: string | null | undefined; endTime: string | null | undefined } {
  const slotDate = slot?.slot_date;
  const st = slot?.start_time;
  const et = slot?.end_time;
  const hasSlotRange = Boolean(slotDate && st && et);

  if (!scheduledTime?.trim()) {
    if (hasSlotRange) {
      return {
        startTime: slotWallToTaipeiIso(slotDate!, st!),
        endTime: slotWallToTaipeiIso(slotDate!, et!),
      };
    }
    return { startTime: scheduledTime, endTime: undefined };
  }

  if (hasSlotRange) {
    const mins = slotWallDurationMinutes(slotDate!, st!, et!);
    if (mins != null) {
      const start = DateTime.fromISO(scheduledTime, { setZone: true });
      if (start.isValid) {
        const endIso = start.plus({ minutes: mins }).toISO({ suppressMilliseconds: true });
        return { startTime: scheduledTime, endTime: endIso ?? undefined };
      }
    }
  }

  return { startTime: scheduledTime, endTime: undefined };
}

/**
 * Format ICS local datetime in Asia/Taipei.
 * - Explicit `Z`/`±offset` inputs are treated as real instants and converted to Taipei wall time.
 * - Naive strings are parsed by Date as local/UTC per platform; callers should prefer canonical ISO.
 */
function formatICSTimeTaipei(iso: string | null | undefined): string | null {
  if (!iso || typeof iso !== "string" || !iso.trim()) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const s = new Intl.DateTimeFormat("en-CA", {
      timeZone: TAIPEI,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);
    const get = (type: string) => s.find((p) => p.type === type)?.value ?? "0";
    const y = parseInt(get("year"), 10);
    const m = parseInt(get("month"), 10);
    const day = parseInt(get("day"), 10);
    const h = parseInt(get("hour"), 10);
    const min = parseInt(get("minute"), 10);
    const Y = String(y);
    const M = String(m).padStart(2, "0");
    const D = String(day).padStart(2, "0");
    const H = String(h).padStart(2, "0");
    const Min = String(min).padStart(2, "0");
    return `${Y}${M}${D}T${H}${Min}00`;
  } catch {
    return null;
  }
}

function escapeICS(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export interface ICSMatchOptions {
  title: string;
  description?: string;
  location?: string;
  startTime: string | null | undefined;
  endTime?: string | null;
  url?: string;
}

/** Default match duration (minutes) when endTime is not provided. */
const DEFAULT_MATCH_DURATION_MINUTES = 90;

export function generateMatchICS(options: ICSMatchOptions): string {
  const { title, description, location, startTime, endTime, url } = options;
  const dtStart = formatICSTimeTaipei(startTime);
  let dtEnd: string | null;
  if (endTime != null && endTime !== "") {
    dtEnd = formatICSTimeTaipei(endTime);
  } else if (startTime) {
    try {
      const d = new Date(startTime);
      if (!Number.isNaN(d.getTime())) {
        const endDate = new Date(d.getTime() + DEFAULT_MATCH_DURATION_MINUTES * 60 * 1000);
        dtEnd = formatICSTimeTaipei(endDate.toISOString());
      } else {
        dtEnd = dtStart;
      }
    } catch {
      dtEnd = dtStart;
    }
  } else {
    dtEnd = dtStart;
  }
  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "") + "Z";

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NTU Sports//Match Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:match-${now}@ntu-sports`,
    `DTSTAMP:${now}`,
  ];
  if (dtStart) lines.push(`DTSTART;TZID=${TAIPEI}:${dtStart}`);
  if (dtEnd) lines.push(`DTEND;TZID=${TAIPEI}:${dtEnd}`);
  lines.push(`SUMMARY:${escapeICS(title)}`);
  if (description) lines.push(`DESCRIPTION:${escapeICS(description)}`);
  if (location) lines.push(`LOCATION:${escapeICS(location)}`);
  if (url) lines.push(`URL:${url}`);
  lines.push("END:VEVENT", "END:VCALENDAR");

  return lines.join("\r\n");
}

/**
 * Trigger download of .ics file.
 */
export function downloadICS(content: string, filename: string = "match.ics"): void {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
