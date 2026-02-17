/**
 * Generate an .ics file content for a single match (RFC 5545).
 * Used for "Add to calendar" on match detail pages.
 */
function formatICSTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
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

export function generateMatchICS(options: ICSMatchOptions): string {
  const { title, description, location, startTime, endTime, url } = options;
  const dtStart = formatICSTime(startTime);
  const dtEnd = formatICSTime(endTime ?? startTime);
  const now = formatICSTime(new Date().toISOString());

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
  if (dtStart) lines.push(`DTSTART:${dtStart}`);
  if (dtEnd) lines.push(`DTEND:${dtEnd}`);
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
