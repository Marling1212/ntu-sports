const TAIPEI = "Asia/Taipei";

/**
 * Format scheduled_time for display in Asia/Taipei.
 * - Explicit `Z` or `±offset`: parse as a real instant, then format in Taipei.
 * - No timezone suffix: treat as Taipei wall clock (append +08:00 before parse), same as legacy imports.
 *
 * (Removed: printing UTC hour/minute literally for 08:00–23:59 UTC — that broke display once
 * `scheduled_time` was stored as correct UTC instants aligned with slots.)
 */
export function formatScheduledTimeAsStored(iso: string | null | undefined): string {
  if (!iso || typeof iso !== "string" || !iso.trim()) return "—";
  const hasTz = iso.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(iso);
  const toParse = hasTz ? iso : iso.replace(/\.\d{3}$/, "") + "+08:00";
  const d = new Date(toParse);
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

/**
 * Get match time for display. Prefer slot time range (e.g. "10:00-12:00") when available
 * to avoid timezone issues; otherwise use formatted scheduled_time.
 */
export function getMatchTimeDisplay(match: { scheduled_time?: string | null; slot?: { start_time?: string; end_time?: string } | null }): string {
  const slot = match.slot;
  if (slot?.start_time && slot?.end_time) {
    const start = slot.start_time.slice(0, 5);
    const end = slot.end_time.slice(0, 5);
    return `${start}-${end}`;
  }
  const full = formatScheduledTimeAsStored(match.scheduled_time ?? null);
  return full.split(" ")[1] ?? "—";
}
