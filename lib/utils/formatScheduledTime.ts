const TAIPEI = "Asia/Taipei";

/**
 * Format scheduled_time for display in Taiwan time.
 * All times are shown in Asia/Taipei so CSV-imported (+08:00) and grid-saved (we now use +08:00) both display correctly.
 */
export function formatScheduledTimeAsStored(iso: string | null | undefined): string {
  if (!iso || typeof iso !== "string" || !iso.trim()) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
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
