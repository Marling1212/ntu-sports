import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminNavbar from "@/components/admin/Navbar";
import MatchesTable from "@/components/admin/MatchesTable";

export default async function MatchesPage({ params }: { params: Promise<{ eventId: string }> }) {
  const supabase = await createClient();
  const { eventId } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  // Check if user is an organizer for this event
  const { data: organizer } = await supabase
    .from("organizers")
    .select("*")
    .eq("user_id", user.id)
    .eq("event_id", eventId)
    .single();

  if (!organizer) {
    return (
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-red-600 mb-4">Access Denied</h1>
        <p>You are not an authorized organizer for this event.</p>
      </div>
    );
  }

  // Get event details
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  // Get matches with player information
  // Filter out BYE matches (status='bye') for management view
  const { data: matches } = await supabase
    .from("matches")
    .select(`
      *,
      player1:players!matches_player1_id_fkey(id, name, seed),
      player2:players!matches_player2_id_fkey(id, name, seed),
      winner:players!matches_winner_id_fkey(id, name, seed)
    `)
    .eq("event_id", eventId)
    .neq("status", "bye") // Don't show BYE matches in management view
    .order("scheduled_time", { ascending: true, nullsFirst: false }) // Scheduled matches first, sorted by time
    .order("round", { ascending: true })
    .order("match_number", { ascending: true });

  // Get all players for dropdown
  const { data: players } = await supabase
    .from("players")
    .select("*")
    .eq("event_id", eventId)
    .order("name", { ascending: true });

  const { data: slots } = await supabase
    .from("event_slots")
    .select("id, slot_date, start_time, end_time, code, court_id")
    .eq("event_id", eventId)
    .order("slot_date", { ascending: true })
    .order("start_time", { ascending: true });

  // Get courts for Court select
  const { data: courts } = await supabase
    .from("event_courts")
    .select("id, name")
    .eq("event_id", eventId)
    .order("name", { ascending: true });

  return (
    <>
      <AdminNavbar eventId={eventId} eventName={event?.name} />
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-ntu-green mb-2">Manage Matches</h1>
          <p className="text-lg text-gray-600">{event?.name}</p>
        </div>

        <MatchesTable 
          eventId={eventId} 
          initialMatches={matches || []} 
          players={players || []}
          slots={slots || []}
          courts={courts || []}
          tournamentType={event?.tournament_type as "single_elimination" | "season_play" | undefined}
        />
      </div>
    </>
  );
}

