import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminNavbar from "@/components/admin/Navbar";
import MatchDetailContent from "@/components/admin/MatchDetailContent";

export default async function MatchDetailPage({ 
  params 
}: { 
  params: Promise<{ eventId: string; matchId: string }> 
}) {
  const supabase = await createClient();
  const { eventId, matchId } = await params;

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

  // Get match details with player information
  const { data: match } = await supabase
    .from("matches")
    .select(`
      *,
      player1:players!matches_player1_id_fkey(id, name, seed, department, type),
      player2:players!matches_player2_id_fkey(id, name, seed, department, type),
      winner:players!matches_winner_id_fkey(id, name, seed),
      slot:event_slots(id, slot_date, start_time, end_time, code, court_id)
    `)
    .eq("id", matchId)
    .single();

  if (!match) {
    return (
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-red-600 mb-4">Match Not Found</h1>
        <p>The match you are looking for does not exist.</p>
      </div>
    );
  }

  // Get all players for this match (including team members if it's a team event)
  const playerIds = [match.player1_id, match.player2_id].filter(Boolean) as string[];
  
  const { data: players } = await supabase
    .from("players")
    .select("*")
    .in("id", playerIds);

  // Get team members if this is a team event
  let teamMembers: Record<string, any[]> = {};
  if (event?.registration_type === 'team' && players) {
    const teamIds = players.filter(p => p.type === 'team').map(p => p.id);
    if (teamIds.length > 0) {
      const { data: members } = await supabase
        .from("team_members")
        .select("*")
        .in("player_id", teamIds)
        .order("jersey_number", { ascending: true, nullsFirst: true })
        .order("name", { ascending: true });

      if (members) {
        members.forEach(member => {
          if (!teamMembers[member.player_id]) {
            teamMembers[member.player_id] = [];
          }
          teamMembers[member.player_id].push(member);
        });
      }
    }
  }

  // Get existing player stats for this match
  const { data: existingStats } = await supabase
    .from("match_player_stats")
    .select("*")
    .eq("match_id", matchId);

  // Get stat definitions for this sport
  const { data: statDefinitions } = await supabase
    .from("sport_stat_definitions")
    .select("*")
    .eq("sport", event?.sport || "")
    .order("display_order", { ascending: true });

  // Get courts
  const { data: courts } = await supabase
    .from("event_courts")
    .select("id, name")
    .eq("event_id", eventId)
    .order("name", { ascending: true });

  // Get slots
  const { data: slots } = await supabase
    .from("event_slots")
    .select("id, slot_date, start_time, end_time, code, court_id")
    .eq("event_id", eventId)
    .order("slot_date", { ascending: true })
    .order("start_time", { ascending: true });

  return (
    <>
      <AdminNavbar eventId={eventId} eventName={event?.name} />
      <div className="container mx-auto px-4 py-12">
        <MatchDetailContent
          eventId={eventId}
          match={match}
          event={event}
          players={players || []}
          teamMembers={teamMembers}
          statDefinitions={statDefinitions || []}
          existingStats={existingStats || []}
          courts={courts || []}
          slots={slots || []}
        />
      </div>
    </>
  );
}

