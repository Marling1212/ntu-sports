import BracketSection from "@/components/BracketSection";
import SeasonPlayDisplay from "@/components/SeasonPlayDisplay";
import ExportBracket from "@/components/ExportBracket";
import ExportPDF from "@/components/ExportPDF";
import TennisNavbarClient from "@/components/TennisNavbarClient";
import { getSportEvent, getSportMatches, getSportPlayers } from "@/lib/utils/getSportEvent";
import { generateTennisPlayers, seedPlayers, generateMatches } from "@/data/tennisDraw";
import { Toaster } from "react-hot-toast";
import { createClient } from "@/lib/supabase/server";

// Disable caching to always fetch fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SportDrawPage(context: any) {
  const params = (context?.params || {}) as { sport?: string };
  const sportParam = (params.sport || "").toLowerCase();
  // Capitalize first letter of sport name
  const sportName = sportParam ? sportParam.charAt(0).toUpperCase() + sportParam.slice(1) : "";
  
  // Try to get data from Supabase (case-insensitive)
  const event = sportParam ? await getSportEvent(sportParam) : null; // Pass lowercase version for case-insensitive lookup
  const supabase = await createClient();
  
  let matches: any[] = [];
  let players: any[] = [];
  let matchPlayerStats: any[] = [];
  let teamMembers: any[] = [];
  
  if (event) {
    // Fetch from Supabase
    const dbMatches = await getSportMatches(event.id);
    const dbPlayers = await getSportPlayers(event.id);
    
    // Get match player stats for top scorers
    if (dbMatches && dbMatches.length > 0) {
      const { data: stats } = await supabase
        .from("match_player_stats")
        .select("*")
        .in("match_id", dbMatches.map((m: any) => m.id));
      matchPlayerStats = stats || [];
    }
    
    // Get team members if team event
    if (event.registration_type === 'team' && dbPlayers) {
      const teamIds = dbPlayers.filter((p: any) => p.type === 'team').map((p: any) => p.id);
      if (teamIds.length > 0) {
        const { data: members } = await supabase
          .from("team_members")
          .select("*")
          .in("player_id", teamIds)
          .order("jersey_number", { ascending: true, nullsFirst: true });
        teamMembers = members || [];
      }
    }
    
    // Convert to tournament format
    matches = dbMatches.map((m: any) => ({
      id: m.id,
      round: m.round,
      matchNumber: m.match_number,
      group_number: m.group_number, // Pass through group_number for season play
      player1: m.player1 ? { id: m.player1.id, name: m.player1.name, seed: m.player1.seed, school: m.player1.department } : null,
      player2: m.player2 ? { id: m.player2.id, name: m.player2.name, seed: m.player2.seed, school: m.player2.department } : null,
      winner: m.winner ? { id: m.winner.id, name: m.winner.name, seed: m.winner.seed, school: m.winner.department } : null,
      winner_id: m.winner_id, // Pass through winner_id for draw detection
      score: m.score1 && m.score2 ? `${m.score1}-${m.score2}` : undefined,
      score1: m.score1, // Pass through score1 for draw detection
      score2: m.score2, // Pass through score2 for draw detection
      status: m.status as "upcoming" | "live" | "completed" | "bye" | "delayed",
      scheduled_time: m.scheduled_time, // Pass through scheduled_time for sorting
      slot_code: m.slot?.code, // Pass through slot code if available
      court: m.court, // Use match.court for consistency with admin page
    }));
    
    players = dbPlayers.map((p: any) => ({
      id: p.id,
      name: p.name,
      seed: p.seed,
      school: p.department,
    }));
  } else {
    // Fallback to static data (only for tennis)
    if (sportName === "Tennis") {
      const allPlayers = generateTennisPlayers();
      const seededPlayers = seedPlayers(allPlayers);
      matches = generateMatches(seededPlayers);
      players = seededPlayers;
    } else {
      matches = [];
      players = [];
    }
  }

  // Format event dates for Excel export
  const eventDate = event?.start_date && event?.end_date 
    ? `${new Date(event.start_date).toLocaleDateString('zh-TW')} - ${new Date(event.end_date).toLocaleDateString('zh-TW')}`
    : "2025/11/8 - 11/9";
  
  const eventVenue = event?.venue || "台大新生網球場 5-8 場";

  return (
    <>
      <TennisNavbarClient eventName={event?.name} tournamentType={event?.tournament_type} />
      <Toaster position="top-right" />
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-ntu-green mb-4">
              {event?.name || `NTU ${sportName} Tournament Draw`}
            </h1>
            <p className="text-lg text-gray-600">
              {event?.tournament_type === 'season_play' 
                ? 'Season Play: Regular Season + Playoffs' 
                : 'Single-elimination tournament bracket'}
            </p>
          </div>
        <div className="flex gap-2">
          <ExportBracket 
            matches={matches}
            players={players}
            eventName={event?.name || `NTU ${sportName} Tournament`}
            eventDate={eventDate}
            eventVenue={eventVenue}
            tournamentType={event?.tournament_type || "single_elimination"}
          />
          <ExportPDF
            matches={matches}
            players={players}
            eventName={event?.name || `NTU ${sportName} Tournament`}
            eventDate={eventDate}
            eventVenue={eventVenue}
            tournamentType={event?.tournament_type || "single_elimination"}
          />
        </div>
      </div>

      {event?.tournament_type === 'season_play' ? (
        <SeasonPlayDisplay
          matches={matches}
          players={players}
          sportName={sportName}
          qualifiersPerGroup={(event as any)?.playoff_qualifiers_per_group || undefined}
          visibleTabs={{ regular: false, standings: true, playoffs: true }}
          defaultView="standings"
          registrationType={event?.registration_type as 'player' | 'team' | undefined}
          matchPlayerStats={matchPlayerStats}
          teamMembers={teamMembers}
        />
      ) : (
        <BracketSection
          matches={matches}
          players={players}
          sportName={sportName}
        />
      )}
      </div>
    </>
  );
}

