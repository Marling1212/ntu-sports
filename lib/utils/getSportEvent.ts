import { createClient } from "@/lib/supabase/server";

export async function getSportEvent(sport: string) {
  const supabase = await createClient();
  
  // Get the event for this sport (case-insensitive)
  // Database stores sport names in lowercase, so normalize the input
  const sportLower = sport.toLowerCase();
  
  // Query for lowercase version (as stored in DB)
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("sport", sportLower)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return event;
}

export async function getSportPlayers(eventId: string) {
  const supabase = await createClient();
  
  const { data: players } = await supabase
    .from("players")
    .select("*")
    .eq("event_id", eventId)
    .order("seed", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  return players || [];
}

export async function getSportMatches(eventId: string) {
  const supabase = await createClient();
  
  const { data: matches } = await supabase
    .from("matches")
    .select(`
      *,
      player1:players!matches_player1_id_fkey(id, name, seed, department),
      player2:players!matches_player2_id_fkey(id, name, seed, department),
      winner:players!matches_winner_id_fkey(id, name, seed, department),
      slot:event_slots(
        id, 
        code, 
        court_id, 
        event_courts(name)
      )
    `)
    .eq("event_id", eventId)
    .order("scheduled_time", { ascending: true, nullsFirst: false }) // Scheduled matches first, sorted by time
    .order("round", { ascending: true })
    .order("match_number", { ascending: true });

  return matches || [];
}

export async function getSportAnnouncements(eventId: string) {
  const supabase = await createClient();
  
  const { data: announcements } = await supabase
    .from("announcements")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  return announcements || [];
}

