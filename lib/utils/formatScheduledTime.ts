/**
 * Format scheduled_time for display. DB often returns UTC (with Z); we show the
 * stored hour/minute as-is so "12:30" doesn't become "20:30" in Asia/Taipei.
 */
export function formatScheduledTimeAsStored(iso: string | null | undefined): string {
  if (!iso || typeof iso !== "string" || !iso.trim()) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  // When value is UTC (ends with Z), use UTC components so displayed time = stored time
  if (iso.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(iso)) {
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
  }).format(d);
}
