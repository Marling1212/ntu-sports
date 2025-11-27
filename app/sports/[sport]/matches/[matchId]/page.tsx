import { createClient } from "@/lib/supabase/server";
import { getSportEvent } from "@/lib/utils/getSportEvent";
import TennisNavbarClient from "@/components/TennisNavbarClient";
import MatchDetailView from "@/components/MatchDetailView";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MatchDetailPage(context: any) {
  const supabase = await createClient();
  const params = (context?.params || {}) as { sport?: string; matchId?: string };
  const sportParam = (params.sport || "").toLowerCase();
  const matchId = params.matchId;

  if (!matchId) {
    notFound();
  }

  const event = sportParam ? await getSportEvent(sportParam) : null;
  
  if (!event) {
    notFound();
  }

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
    .eq("event_id", event.id)
    .single();

  if (!match) {
    notFound();
  }

  // Get all players for this match
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

  // Get match player stats
  const { data: matchStats } = await supabase
    .from("match_player_stats")
    .select("*")
    .eq("match_id", matchId);

  // Get stat definitions for this sport
  const { data: statDefinitions } = await supabase
    .from("sport_stat_definitions")
    .select("*")
    .eq("sport", event?.sport || "")
    .order("display_order", { ascending: true });

  const sportName = sportParam ? sportParam.charAt(0).toUpperCase() + sportParam.slice(1) : "";

  return (
    <>
      <TennisNavbarClient eventName={event?.name} tournamentType={event?.tournament_type} />
      <div className="container mx-auto px-4 py-12">
        <MatchDetailView
          match={match}
          event={event}
          players={players || []}
          teamMembers={teamMembers}
          statDefinitions={statDefinitions || []}
          matchStats={matchStats || []}
          sportName={sportName}
        />
      </div>
    </>
  );
}

