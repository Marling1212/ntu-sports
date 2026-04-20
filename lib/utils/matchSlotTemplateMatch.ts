import { DateTime } from "luxon";

/** NTU events use Taipei wall time for slot templates and scheduling. */
export const EVENT_SCHEDULING_TIMEZONE = "Asia/Taipei";

/**
 * Maps a match's `scheduled_time` (ISO instant from DB) to `event_slot_templates` rows.
 * Uses a fixed event timezone so dispatch works for organizers in any browser locale
 * (unlike `Date#getDay()` / `getHours()` in local time).
 */
export function getMatchingSlotTemplateIds(
  scheduledTimeIso: string | null | undefined,
  slotTemplates: Array<{ id: string; day_of_week: number; start_time: string; end_time: string }>,
  timeZone: string = EVENT_SCHEDULING_TIMEZONE
): string[] {
  if (!scheduledTimeIso) return [];

  const wall = DateTime.fromISO(String(scheduledTimeIso), { setZone: true }).setZone(timeZone);
  if (!wall.isValid) return [];

  // Align with JS getDay() / DB templates: 0 = Sunday … 6 = Saturday
  const weekday = wall.weekday % 7;
  const hh = wall.hour.toString().padStart(2, "0");
  const mm = wall.minute.toString().padStart(2, "0");
  const current = `${hh}:${mm}`;

  return slotTemplates
    .filter((slot) => {
      const start = slot.start_time.slice(0, 5);
      const end = slot.end_time.slice(0, 5);
      return slot.day_of_week === weekday && start <= current && current < end;
    })
    .map((slot) => slot.id);
}
