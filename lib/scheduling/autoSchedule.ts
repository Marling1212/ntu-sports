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
function blackoutForSlot(
  slot: SlotForSchedule,
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

/** scheduled_time ISO string for slot (date + start_time, no TZ assumed) */
function slotToScheduledTime(slot: SlotForSchedule): string {
  const start = slot.start_time.slice(0, 8); // HH:MM:SS
  return `${slot.slot_date}T${start}`;
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
 * Uses existing slot_id on matches as current assignment; pass clearExisting=true to ignore.
 */
export function runAutoSchedule(
  slots: SlotForSchedule[],
  matches: MatchForSchedule[],
  blackoutTemplates: BlackoutTemplate[],
  options: { clearExisting?: boolean } = {}
): { assignments: Assignment[]; unassigned: MatchForSchedule[] } {
  const { clearExisting = false } = options;

  // Sort slots by date then time
  const sortedSlots = [...slots].sort((a, b) => {
    if (a.slot_date !== b.slot_date)
      return a.slot_date.localeCompare(b.slot_date);
    return a.start_time.localeCompare(b.start_time);
  });

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
  // Pre-fill from existing match assignments (if not clearExisting)
  if (!clearExisting) {
    for (const m of matches) {
      const sid = (m as any).slot_id;
      if (!sid || !slotUsage.has(sid)) continue;
      const p1 = m.player1_id;
      const p2 = m.player2_id;
      const u = slotUsage.get(sid)!;
      u.count += 1;
      if (p1) u.playerIds.add(p1);
      if (p2) u.playerIds.add(p2);
    }
  }

  const assignments: Assignment[] = [];
  const unassigned: MatchForSchedule[] = [];

  for (const match of toAssign) {
    const p1 = match.player1_id ?? "";
    const p2 = match.player2_id ?? "";
    let placed = false;
    for (const slot of sortedSlots) {
      const cap = slot.capacity ?? 1;
      const u = slotUsage.get(slot.id)!;
      if (u.count >= cap) continue;
      const blackout = blackoutForSlot(slot, blackoutTemplates);
      if (blackout.has(p1) || blackout.has(p2)) continue;
      if (u.playerIds.has(p1) || u.playerIds.has(p2)) continue;
      u.count += 1;
      u.playerIds.add(p1);
      u.playerIds.add(p2);
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
