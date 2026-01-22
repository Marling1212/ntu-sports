import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminNavbar from "@/components/admin/Navbar";
import MatchesTable from "@/components/admin/MatchesTable";
import PlayerStats from "@/components/admin/PlayerStats";
import MatchHistory from "@/components/admin/MatchHistory";
import BracketSeedingManagerWrapper from "@/components/admin/BracketSeedingManagerWrapper";

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
      winner:players!matches_winner_id_fkey(id, name, seed),
      slot:event_slots(
        id, 
        code, 
        court_id,
        event_courts!event_slots_court_id_fkey(name)
      )
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

  // Get match player stats for individual player goals
  const { data: matchPlayerStats } = await supabase
    .from("match_player_stats")
    .select("*")
    .in("match_id", (matches || []).map(m => m.id));

  // Get team members if team event
  let teamMembers: any[] = [];
  if (event?.registration_type === 'team') {
    const { data: members } = await supabase
      .from("team_members")
      .select("*")
      .in("player_id", (players || []).map(p => p.id));
    teamMembers = members || [];
  }

  return (
    <>
      <AdminNavbar eventId={eventId} eventName={event?.name} />
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-ntu-green mb-2">Manage Matches</h1>
          <p className="text-lg text-gray-600">{event?.name}</p>
        </div>

        {/* Bracket Seeding Manager - show for single elimination or season play */}
        {(event?.tournament_type === "single_elimination" || event?.tournament_type === "season_play") && players && players.length > 0 && (
          <BracketSeedingManagerWrapper
            eventId={eventId}
            players={players || []}
            matches={matches || []}
            tournamentType={event?.tournament_type as "single_elimination" | "season_play" | null}
            onSeedingUpdated={() => {
              if (typeof window !== 'undefined') {
                window.location.reload();
              }
            }}
          />
        )}

        <MatchesTable 
          eventId={eventId} 
          initialMatches={matches || []} 
          players={players || []}
          slots={slots || []}
          courts={courts || []}
          tournamentType={event?.tournament_type as "single_elimination" | "season_play" | undefined}
          registrationType={event?.registration_type as 'player' | 'team' | undefined}
          matchPlayerStats={matchPlayerStats || []}
        />

        {/* Player Statistics */}
        <div id="player-stats" className="mt-8 scroll-mt-24">
          <PlayerStats
            players={players || []}
            matches={matches || []}
            tournamentType={event?.tournament_type as "single_elimination" | "season_play" | undefined}
            registrationType={event?.registration_type as 'player' | 'team' | undefined}
            matchPlayerStats={matchPlayerStats || []}
            teamMembers={teamMembers}
          />
        </div>

        {/* Match History */}
        <div id="match-history" className="mt-8 scroll-mt-24">
          <MatchHistory
            players={players || []}
            matches={matches || []}
            registrationType={event?.registration_type as 'player' | 'team' | undefined}
          />
        </div>
      </div>
    </>
  );
}

