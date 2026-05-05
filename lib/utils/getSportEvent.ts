import { createClient } from "@/lib/supabase/server";
import type { EventDivision } from "@/types/database";

/** Event IDs that have this sport (via event.sport or event_divisions). */
export async function getEventIdsForSport(sport: string): Promise<string[]> {
  const supabase = await createClient();
  const sportLower = sport.toLowerCase();
  const { data: byPrimary } = await supabase
    .from("events")
    .select("id")
    .eq("sport", sportLower)
    .eq("is_visible", true);
  const { data: byDivision } = await supabase
    .from("event_divisions")
    .select("event_id")
    .eq("sport", sportLower);
  const ids = new Set<string>();
  byPrimary?.forEach((r) => ids.add(r.id));
  byDivision?.forEach((r) => ids.add(r.event_id));
  if (ids.size === 0) return [];
  const { data: visible } = await supabase
    .from("events")
    .select("id")
    .in("id", Array.from(ids))
    .eq("is_visible", true);
  return (visible ?? []).map((r) => r.id);
}

/** Latest visible event that has this sport (primary or via a division). */
export async function getSportEvent(sport: string) {
  const supabase = await createClient();
  const sportLower = sport.toLowerCase();
  const eventIds = await getEventIdsForSport(sportLower);
  if (eventIds.length === 0) return null;
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .in("id", eventIds)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return event ?? null;
}

/** Divisions for an event (sports within the event). Sorted by display_order. */
export async function getEventDivisions(eventId: string): Promise<EventDivision[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("event_divisions")
    .select("*")
    .eq("event_id", eventId)
    .order("display_order", { ascending: true })
    .order("sport", { ascending: true });
  return data ?? [];
}

/** Load event by id; ensure it is valid for this sport (event.sport or any division). Returns event or null. */
export async function getEventByIdAndSport(eventId: string, sport: string) {
  const supabase = await createClient();
  const sportLower = sport.toLowerCase();
  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .eq("is_visible", true)
    .maybeSingle();
  if (error || !event) return null;
  if (event.sport === sportLower) return event;
  const { data: divs } = await supabase
    .from("event_divisions")
    .select("id")
    .eq("event_id", eventId)
    .eq("sport", sportLower);
  if (divs && divs.length > 0) return event;
  return null;
}

/** Same as getEventByIdAndSport but ignores is_visible. Use only for organizer preview. */
export async function getEventByIdAndSportForPreview(eventId: string, sport: string) {
  const supabase = await createClient();
  const sportLower = sport.toLowerCase();
  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();
  if (error || !event) return null;
  if (event.sport === sportLower) return event;
  const { data: divs } = await supabase
    .from("event_divisions")
    .select("id")
    .eq("event_id", eventId)
    .eq("sport", sportLower);
  if (divs && divs.length > 0) return event;
  return null;
}

/** Get event for public pages; when preview=1 and user is organizer, allows hidden events. */
export async function getEventForPublicPage(
  eventId: string,
  sport: string,
  options: { preview?: string }
): Promise<Awaited<ReturnType<typeof getEventByIdAndSport>> | null> {
  let event = await getEventByIdAndSport(eventId, sport);
  if (!event && options.preview === "1") {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: organizer } = await supabase
        .from("organizers")
        .select("id")
        .eq("event_id", eventId)
        .eq("user_id", user.id)
        .single();
      if (organizer) event = await getEventByIdAndSportForPreview(eventId, sport);
    }
  }
  return event;
}

/** Division IDs for this event that match the sport (for filtering matches/players on event page). */
export async function getDivisionIdsForEventAndSport(
  eventId: string,
  sport: string
): Promise<string[]> {
  const supabase = await createClient();
  const sportLower = sport.toLowerCase();
  const { data } = await supabase
    .from("event_divisions")
    .select("id")
    .eq("event_id", eventId)
    .eq("sport", sportLower);
  return (data ?? []).map((r) => r.id);
}

/** First division for this event + sport (for tournament_type / registration_type when viewing that sport). */
export async function getFirstDivisionForEventAndSport(
  eventId: string,
  sport: string
): Promise<EventDivision | null> {
  const supabase = await createClient();
  const sportLower = sport.toLowerCase();
  const { data } = await supabase
    .from("event_divisions")
    .select("*")
    .eq("event_id", eventId)
    .eq("sport", sportLower)
    .order("display_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

export async function getSportPlayers(
  eventId: string,
  divisionIds?: string[] | null
) {
  const supabase = await createClient();
  if (!divisionIds?.length) {
    const { data: players } = await supabase
      .from("players")
      .select("*")
      .eq("event_id", eventId)
      .order("seed", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true });
    return players || [];
  }

  // Backward-compatible: include both division-bound rows and legacy null-division rows.
  const [{ data: inDivision }, { data: nullDivision }] = await Promise.all([
    supabase
      .from("players")
      .select("*")
      .eq("event_id", eventId)
      .in("division_id", divisionIds)
      .order("seed", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true }),
    supabase
      .from("players")
      .select("*")
      .eq("event_id", eventId)
      .is("division_id", null)
      .order("seed", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true }),
  ]);

  const map = new Map<string, any>();
  [...(inDivision || []), ...(nullDivision || [])].forEach((p) => map.set(p.id, p));
  return Array.from(map.values());
}

export async function getSportMatches(
  eventId: string,
  divisionIds?: string[] | null
) {
  const supabase = await createClient();
  const selectClause = `
      *,
      player1:players!matches_player1_id_fkey(id, name, seed, department),
      player2:players!matches_player2_id_fkey(id, name, seed, department),
      winner:players!matches_winner_id_fkey(id, name, seed, department),
      slot:event_slots(
        id, 
        code, 
        slot_date,
        start_time,
        end_time,
        court_id,
        event_courts!event_slots_court_id_fkey(name)
      )
    `;

  if (!divisionIds?.length) {
    const { data: matches } = await supabase
      .from("matches")
      .select(selectClause)
      .eq("event_id", eventId)
      .order("scheduled_time", { ascending: true, nullsFirst: false })
      .order("round", { ascending: true })
      .order("match_number", { ascending: true });
    return matches || [];
  }

  // Backward-compatible: include division-bound rows + legacy null-division rows.
  const [{ data: inDivision }, { data: nullDivision }] = await Promise.all([
    supabase
      .from("matches")
      .select(selectClause)
      .eq("event_id", eventId)
      .in("division_id", divisionIds)
      .order("scheduled_time", { ascending: true, nullsFirst: false })
      .order("round", { ascending: true })
      .order("match_number", { ascending: true }),
    supabase
      .from("matches")
      .select(selectClause)
      .eq("event_id", eventId)
      .is("division_id", null)
      .order("scheduled_time", { ascending: true, nullsFirst: false })
      .order("round", { ascending: true })
      .order("match_number", { ascending: true }),
  ]);

  const map = new Map<string, any>();
  [...(inDivision || []), ...(nullDivision || [])].forEach((m) => map.set(m.id, m));
  return Array.from(map.values());
}

/** For overview "latest" only: most recent by created_at. Pinned does not affect this. */
export async function getSportAnnouncements(eventId: string) {
  const supabase = await createClient();
  const { data: announcements } = await supabase
    .from("announcements")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  return announcements || [];
}

/** For announcements list page: pinned first (by pinned_order), then by created_at. */
export async function getSportAnnouncementsForList(eventId: string) {
  const supabase = await createClient();
  const { data: announcements } = await supabase
    .from("announcements")
    .select("*")
    .eq("event_id", eventId)
    .order("is_pinned", { ascending: false })
    .order("pinned_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  return announcements || [];
}

