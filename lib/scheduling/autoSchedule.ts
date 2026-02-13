/**
 * Auto-schedule algorithm: assign matches to event_slots
 * respecting slot capacity (場地數), blackouts, and no double-booking.
 */

export interface SlotForSchedule {
  id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  capacity?: number | null;
}

export interface MatchForSchedule {
  id: string;
  player1_id?: string | null;
  player2_id?: string | null;
  round: number;
  match_number: number;
}

export interface BlackoutTemplate {
  player_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

/** Get weekday 0-6 from YYYY-MM-DD */
function getWeekday(slotDate: string): number {
  const d = new Date(slotDate + "T12:00:00");
  return d.getDay(); // 0=Sun, 6=Sat
}

/** Calendar days from date A to B (B - A). */
function daysBetween(dateA: string, dateB: string): number {
  const t1 = new Date(dateA + "T12:00:00").getTime();
  const t2 = new Date(dateB + "T12:00:00").getTime();
  return Math.round((t2 - t1) / (24 * 60 * 60 * 1000));
}

/** Time in HH:MM or HH:MM:SS to minutes since midnight */
function timeToMinutes(t: string): number {
  const [h, m, s] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0) + ((s ?? 0) / 60);
}

/** Check if [s1,e1] overlaps [s2,e2] (in minutes) */
function timeOverlap(
  s1: number,
  e1: number,
  s2: number,
  e2: number
): boolean {
  return s1 < e2 && s2 < e1;
}

/** Build set of player_ids that are blacked out for this slot (from templates). */
export function blackoutForSlot(
  slot: { slot_date: string; start_time: string; end_time: string },
  templates: BlackoutTemplate[]
): Set<string> {
  const weekday = getWeekday(slot.slot_date);
  const slotStart = timeToMinutes(slot.start_time);
  const slotEnd = timeToMinutes(slot.end_time);
  const set = new Set<string>();
  for (const t of templates) {
    if (t.day_of_week !== weekday) continue;
    const tStart = timeToMinutes(t.start_time);
    const tEnd = timeToMinutes(t.end_time);
    if (timeOverlap(slotStart, slotEnd, tStart, tEnd)) set.add(t.player_id);
  }
  return set;
}

/** scheduled_time ISO string for slot (date + start_time), with +08:00 so DB stores correctly and list shows correct local time */
export function slotToScheduledTime(slot: { slot_date: string; start_time: string }): string {
  const start = slot.start_time.slice(0, 8); // HH:MM:SS
  const base = `${slot.slot_date}T${start}`;
  return base.includes("+") || base.endsWith("Z") ? base : `${base}+08:00`;
}

export interface Assignment {
  matchId: string;
  slotId: string;
  scheduledTime: string;
}

/**
 * Assign matches to slots. Respects:
 * - slot capacity (each slot gets at most capacity matches)
 * - team_blackout_templates (no match in a slot if either player is blacked out)
 * - no double-booking (each player at most one match per slot)
 * - minSlotsBetweenSameTeam: at least N *time blocks* of rest (same team not in two consecutive 時間段);
 *   one time block = same (date, start_time); works the same for 1 or many venues (default 1).
 * - minDaysBetweenSameTeam: at least N full calendar days of rest (same team not on consecutive days when N>=1) (default 1)
 * Uses existing slot_id on matches as current assignment; pass clearExisting=true to ignore.
 */
export function runAutoSchedule(
  slots: SlotForSchedule[],
  matches: MatchForSchedule[],
  blackoutTemplates: BlackoutTemplate[],
  options: { clearExisting?: boolean; minSlotsBetweenSameTeam?: number; minDaysBetweenSameTeam?: number } = {}
): { assignments: Assignment[]; unassigned: MatchForSchedule[] } {
  const { clearExisting = false, minSlotsBetweenSameTeam = 1, minDaysBetweenSameTeam = 1 } = options;

  // Sort slots by date then time
  const sortedSlots = [...slots].sort((a, b) => {
    if (a.slot_date !== b.slot_date)
      return a.slot_date.localeCompare(b.slot_date);
    return a.start_time.localeCompare(b.start_time);
  });

  // Time block = unique (slot_date, start_time). Same 時間段 across venues share one block index.
  const timeBlockKeyToIndex = new Map<string, number>();
  for (const s of sortedSlots) {
    const key = `${s.slot_date}\t${s.start_time}`;
    if (!timeBlockKeyToIndex.has(key)) {
      timeBlockKeyToIndex.set(key, timeBlockKeyToIndex.size);
    }
  }
  const slotToTimeBlockIndex = new Map<string, number>();
  for (const s of sortedSlots) {
    const key = `${s.slot_date}\t${s.start_time}`;
    slotToTimeBlockIndex.set(s.id, timeBlockKeyToIndex.get(key) ?? -1);
  }

  // Matches to assign: exclude bye; if !clearExisting, exclude already scheduled
  const toAssign = matches.filter((m) => {
    if (!m.player1_id && !m.player2_id) return false; // bye
    if (!clearExisting && (m as any).slot_id) return false;
    return true;
  });
  // Sort by round, match_number for deterministic order
  toAssign.sort((a, b) =>
    a.round !== b.round ? a.round - b.round : a.match_number - b.match_number
  );

  // Current assignment: slot_id -> { count, playerIds }
  const slotUsage = new Map<
    string,
    { count: number; playerIds: Set<string> }
  >();
  for (const slot of sortedSlots) {
    slotUsage.set(slot.id, { count: 0, playerIds: new Set() });
  }
  /** Last time-block index (0-based) where this player was assigned; -1 = none. Same for 1 or many venues. */
  const lastTimeBlockIndexByPlayer = new Map<string, number>();
  /** Last slot_date (YYYY-MM-DD) where this player was assigned; for minDaysBetweenSameTeam */
  const lastSlotDateByPlayer = new Map<string, string>();

  // Pre-fill from existing match assignments (if not clearExisting)
  if (!clearExisting) {
    for (const m of matches) {
      const sid = (m as any).slot_id;
      if (!sid || !slotUsage.has(sid)) continue;
      const slot = sortedSlots.find((s) => s.id === sid);
      const slotDate = slot?.slot_date;
      const tbIdx = slotToTimeBlockIndex.get(sid) ?? -1;
      const p1 = m.player1_id;
      const p2 = m.player2_id;
      const u = slotUsage.get(sid)!;
      u.count += 1;
      if (p1) u.playerIds.add(p1);
      if (p2) u.playerIds.add(p2);
      if (p1 && tbIdx >= 0) {
        const last = lastTimeBlockIndexByPlayer.get(p1) ?? -1;
        if (tbIdx > last) lastTimeBlockIndexByPlayer.set(p1, tbIdx);
        if (slotDate) {
          const lastD = lastSlotDateByPlayer.get(p1);
          if (!lastD || slotDate > lastD) lastSlotDateByPlayer.set(p1, slotDate);
        }
      }
      if (p2 && tbIdx >= 0) {
        const last = lastTimeBlockIndexByPlayer.get(p2) ?? -1;
        if (tbIdx > last) lastTimeBlockIndexByPlayer.set(p2, tbIdx);
        if (slotDate) {
          const lastD = lastSlotDateByPlayer.get(p2);
          if (!lastD || slotDate > lastD) lastSlotDateByPlayer.set(p2, slotDate);
        }
      }
    }
  }

  const assignments: Assignment[] = [];
  const unassigned: MatchForSchedule[] = [];

  for (const match of toAssign) {
    const p1 = match.player1_id ?? "";
    const p2 = match.player2_id ?? "";
    let placed = false;
    for (let slotIdx = 0; slotIdx < sortedSlots.length; slotIdx++) {
      const slot = sortedSlots[slotIdx];
      const cap = slot.capacity ?? 1;
      const u = slotUsage.get(slot.id)!;
      if (u.count >= cap) continue;
      const blackout = blackoutForSlot(slot, blackoutTemplates);
      if (blackout.has(p1) || blackout.has(p2)) continue;
      if (u.playerIds.has(p1) || u.playerIds.has(p2)) continue;
      const timeBlockIdx = slotToTimeBlockIndex.get(slot.id) ?? -1;
      // Rest by time block: same team at least minSlotsBetweenSameTeam *time blocks* between (works for 1 or many venues)
      const lastTb1 = lastTimeBlockIndexByPlayer.get(p1) ?? -1;
      const lastTb2 = lastTimeBlockIndexByPlayer.get(p2) ?? -1;
      if (timeBlockIdx <= lastTb1 + minSlotsBetweenSameTeam || timeBlockIdx <= lastTb2 + minSlotsBetweenSameTeam) continue;
      // Calendar-day rest: same team not on consecutive days when minDaysBetweenSameTeam >= 1
      if (minDaysBetweenSameTeam > 0) {
        const lastDate1 = lastSlotDateByPlayer.get(p1);
        const lastDate2 = lastSlotDateByPlayer.get(p2);
        const needDays = minDaysBetweenSameTeam + 1; // e.g. 1 rest day => next game >= 2 days later
        if (lastDate1 && daysBetween(lastDate1, slot.slot_date) < needDays) continue;
        if (lastDate2 && daysBetween(lastDate2, slot.slot_date) < needDays) continue;
      }
      u.count += 1;
      u.playerIds.add(p1);
      u.playerIds.add(p2);
      if (timeBlockIdx >= 0) {
        lastTimeBlockIndexByPlayer.set(p1, timeBlockIdx);
        lastTimeBlockIndexByPlayer.set(p2, timeBlockIdx);
      }
      lastSlotDateByPlayer.set(p1, slot.slot_date);
      lastSlotDateByPlayer.set(p2, slot.slot_date);
      assignments.push({
        matchId: match.id,
        slotId: slot.id,
        scheduledTime: slotToScheduledTime(slot),
      });
      placed = true;
      break;
    }
    if (!placed) unassigned.push(match);
  }

  return { assignments, unassigned };
}
