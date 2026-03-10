import { createClient } from "@/lib/supabase/server";
import { getSportEvent } from "@/lib/utils/getSportEvent";
import TennisNavbarClient from "@/components/TennisNavbarClient";
import TeamDetailView from "@/components/TeamDetailView";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function TeamDetailPage(context: any) {
  const supabase = await createClient();
  const params = (context?.params || {}) as { sport?: string; teamId?: string };
  const sportParam = (params.sport || "").toLowerCase();
  const teamId = params.teamId;

  if (!teamId) {
    notFound();
  }

  const event = sportParam ? await getSportEvent(sportParam) : null;
  
  if (!event) {
    notFound();
  }

  // Get team/player details
  const { data: team } = await supabase
    .from("players")
    .select("*")
    .eq("id", teamId)
    .eq("event_id", event.id)
    .single();

  if (!team) {
    notFound();
  }

  // Get team members if this is a team event
  let teamMembers: any[] = [];
  if (event?.registration_type === 'team' && team.type === 'team') {
    const { data: members } = await supabase
      .from("team_members")
      .select("*")
      .eq("player_id", teamId)
      .order("jersey_number", { ascending: true, nullsFirst: true })
      .order("name", { ascending: true });

    teamMembers = members || [];
  }

  // Get all matches for this team
  const { data: matches } = await supabase
    .from("matches")
    .select(`
      *,
      player1:players!matches_player1_id_fkey(id, name, seed, department),
      player2:players!matches_player2_id_fkey(id, name, seed, department),
      winner:players!matches_winner_id_fkey(id, name)
    `)
    .eq("event_id", event.id)
    .or(`player1_id.eq.${teamId},player2_id.eq.${teamId}`)
    .order("scheduled_time", { ascending: true, nullsFirst: true })
    .order("round", { ascending: true })
    .order("match_number", { ascending: true });

  // Get match stats for this team
  const matchIds = matches?.map(m => m.id) || [];
  let matchStats: any[] = [];
  if (matchIds.length > 0) {
    const { data: stats } = await supabase
      .from("match_player_stats")
      .select("*")
      .in("match_id", matchIds)
      .eq("player_id", teamId);
    matchStats = stats || [];
  }

  // Get stat definitions for this sport
  const { data: statDefinitions } = await supabase
    .from("sport_stat_definitions")
    .select("*")
    .eq("sport", event?.sport || "")
    .order("display_order", { ascending: true });

  // Calculate team statistics
  const wins = matches?.filter(m => m.winner_id === teamId).length || 0;
  const losses = matches?.filter(m => 
    m.status === 'completed' && 
    m.winner_id && 
    m.winner_id !== teamId && 
    (m.player1_id === teamId || m.player2_id === teamId)
  ).length || 0;
  const draws = matches?.filter(m => 
    m.status === 'completed' && 
    !m.winner_id && 
    m.score1 && 
    m.score2 && 
    m.score1 === m.score2 &&
    (m.player1_id === teamId || m.player2_id === teamId)
  ).length || 0;

  let goalsFor = 0;
  let goalsAgainst = 0;
  matches?.forEach(m => {
    if (m.status === 'completed' && m.score1 && m.score2) {
      if (m.player1_id === teamId) {
        goalsFor += parseInt(m.score1) || 0;
        goalsAgainst += parseInt(m.score2) || 0;
      } else if (m.player2_id === teamId) {
        goalsFor += parseInt(m.score2) || 0;
        goalsAgainst += parseInt(m.score1) || 0;
      }
    }
  });

  const points = wins * 3 + draws;
  const goalDiff = goalsFor - goalsAgainst;

  const sportName = sportParam ? sportParam.charAt(0).toUpperCase() + sportParam.slice(1) : "";

  return (
    <>
      <TennisNavbarClient eventName={event?.name} tournamentType={event?.tournament_type} />
      <div className="container mx-auto px-4 py-12">
        <TeamDetailView
          team={team}
          event={event}
          teamMembers={teamMembers}
          matches={matches || []}
          matchStats={matchStats}
          statDefinitions={statDefinitions || []}
          statistics={{
            wins,
            losses,
            draws,
            points,
            goalsFor,
            goalsAgainst,
            goalDiff,
          }}
          sportName={sportName}
        />
      </div>
    </>
  );
}

