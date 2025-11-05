import { createClient } from "@/lib/supabase/server";

export async function getTennisEvent() {
  const supabase = await createClient();
  
  // Get the tennis event (assuming there's one main tennis event)
  // You can filter by sport='tennis' and name or other criteria
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("sport", "tennis")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return event;
}

export async function getTennisPlayers(eventId: string) {
  const supabase = await createClient();
  
  const { data: players } = await supabase
    .from("players")
    .select("*")
    .eq("event_id", eventId)
    .order("seed", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  return players || [];
}

export async function getTennisMatches(eventId: string) {
  const supabase = await createClient();
  
  const { data: matches } = await supabase
    .from("matches")
    .select(`
      *,
      player1:players!matches_player1_id_fkey(id, name, seed, department),
      player2:players!matches_player2_id_fkey(id, name, seed, department),
      winner:players!matches_winner_id_fkey(id, name, seed, department)
    `)
    .eq("event_id", eventId)
    .order("round", { ascending: true })
    .order("match_number", { ascending: true });

  return matches || [];
}

export async function getTennisAnnouncements(eventId: string) {
  const supabase = await createClient();
  
  const { data: announcements } = await supabase
    .from("announcements")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  return announcements || [];
}

