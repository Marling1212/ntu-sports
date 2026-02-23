const TAIPEI = "Asia/Taipei";

/**
 * Format scheduled_time for display.
 * - Stored with +08:00 or Z: parse and show in Asia/Taipei.
 * - Stored without timezone: assume Asia/Taipei local (e.g. "2025-01-15T12:00:00" = noon Taiwan), append +08:00 before parsing to avoid +8 hrs bug.
 */
export function formatScheduledTimeAsStored(iso: string | null | undefined): string {
  if (!iso || typeof iso !== "string" || !iso.trim()) return "—";
  const hasTz = iso.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(iso);
  const toParse = hasTz ? iso : iso.replace(/\.\d{3}$/, "") + "+08:00";
  const d = new Date(toParse);
  if (Number.isNaN(d.getTime())) return "—";
  const isUtc = iso.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(iso);
  const utcHour = d.getUTCHours();
  // UTC 08:00–23:59: likely "naive local" stored as UTC (e.g. 12:30) → show as-is so 12:30 stays 12:30
  if (isUtc && utcHour >= 8 && utcHour <= 23) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    const h = String(d.getUTCHours()).padStart(2, "0");
    const min = String(d.getUTCMinutes()).padStart(2, "0");
    return `${y}/${m}/${day} ${h}:${min}`;
  }
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TAIPEI,
  }).format(d);
}
