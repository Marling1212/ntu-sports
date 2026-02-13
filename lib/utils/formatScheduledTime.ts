const TAIPEI = "Asia/Taipei";

/**
 * Format scheduled_time for display.
 * - Stored with +08:00 (e.g. 04:30 UTC = 12:30 Taiwan): show in Asia/Taipei → 12:30.
 * - Stored without timezone (e.g. 12:30 UTC = naive local): show UTC time as-is → 12:30 (so "today's" don't become 20:30).
 */
export function formatScheduledTimeAsStored(iso: string | null | undefined): string {
  if (!iso || typeof iso !== "string" || !iso.trim()) return "—";
  const d = new Date(iso);
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
