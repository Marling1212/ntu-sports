const TAIPEI = "Asia/Taipei";

/**
 * Format time for ICS so the event shows at the same wall-clock time as the site display (no +8 hr).
 * Uses TZID=Asia/Taipei and Taipei local time, consistent with formatScheduledTimeAsStored.
 */
function formatICSTimeTaipei(iso: string | null | undefined): string | null {
  if (!iso || typeof iso !== "string" || !iso.trim()) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const isUtc = iso.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(iso);
    const utcHour = d.getUTCHours();
    let y: number, m: number, day: number, h: number, min: number;
    if (isUtc && utcHour >= 8 && utcHour <= 23) {
      y = d.getUTCFullYear();
      m = d.getUTCMonth() + 1;
      day = d.getUTCDate();
      h = d.getUTCHours();
      min = d.getUTCMinutes();
    } else {
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
      y = parseInt(get("year"), 10);
      m = parseInt(get("month"), 10);
      day = parseInt(get("day"), 10);
      h = parseInt(get("hour"), 10);
      min = parseInt(get("minute"), 10);
    }
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
