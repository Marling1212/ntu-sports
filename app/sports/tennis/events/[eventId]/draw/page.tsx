import BracketSection from "@/components/BracketSection";
import SeasonPlayDisplay from "@/components/SeasonPlayDisplay";
import ExportBracket from "@/components/ExportBracket";
import ExportPDF from "@/components/ExportPDF";
import TennisNavbarClient from "@/components/TennisNavbarClient";
import { getTennisMatches, getTennisPlayers } from "@/lib/utils/getTennisEvent";
import { createClient } from "@/lib/supabase/server";
import { Toaster } from "react-hot-toast";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function TennisEventDrawPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();
  
  // Get the specific event (only visible events for public)
  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .eq("sport", "tennis")
    .eq("is_visible", true)
    .maybeSingle();

  // If event not found, not a tennis event, or not visible, show 404
  if (error || !event) {
    notFound();
  }

  // Fetch from Supabase
  const dbMatches = await getTennisMatches(event.id);
  const dbPlayers = await getTennisPlayers(event.id);

  let matchPlayerStats: any[] = [];
  let statDefinitions: { stat_name: string; stat_label: string; display_order: number; stat_level?: string }[] = [];
  let teamMembers: { id: string; player_id: string; name: string; jersey_number?: number | null }[] = [];
  if (dbMatches?.length > 0) {
    const { data: stats } = await supabase
      .from("match_player_stats")
      .select("*")
      .in("match_id", dbMatches.map((m: any) => m.id));
    matchPlayerStats = stats || [];
  }
  const { data: defs } = await supabase
    .from("sport_stat_definitions")
    .select("stat_name, stat_label, display_order, stat_level")
    .eq("sport", "tennis")
    .order("display_order", { ascending: true });
  statDefinitions = defs || [];
  if (event.registration_type === "team" && dbPlayers?.length) {
    const teamIds = dbPlayers.filter((p: any) => p.type === "team").map((p: any) => p.id);
    if (teamIds.length > 0) {
      const { data: members } = await supabase
        .from("team_members")
        .select("id, player_id, name, jersey_number")
        .in("player_id", teamIds)
        .order("jersey_number", { ascending: true, nullsFirst: true });
      teamMembers = members || [];
    }
  }
  
  // Convert to tournament format
  const matches = dbMatches.map((m: any) => ({
    id: m.id,
    round: m.round,
    matchNumber: m.match_number,
    group_number: m.group_number,
    player1: m.player1?.id ? { id: m.player1.id, name: m.player1.name, seed: m.player1.seed, school: m.player1.department } : null,
    player2: m.player2?.id ? { id: m.player2.id, name: m.player2.name, seed: m.player2.seed, school: m.player2.department } : null,
    slot1: m.slot1_seed != null && m.slot1_group != null ? { seed: m.slot1_seed, group: m.slot1_group } : undefined,
    slot2: m.slot2_seed != null && m.slot2_group != null ? { seed: m.slot2_seed, group: m.slot2_group } : undefined,
    winner: m.winner?.id ? { id: m.winner.id, name: m.winner.name, seed: m.winner.seed, school: m.winner.department } : null,
    winner_id: m.winner_id,
    score: m.score1 && m.score2 ? `${m.score1}-${m.score2}` : undefined,
    score1: m.score1,
    score2: m.score2,
    status: m.status as "upcoming" | "live" | "completed" | "bye" | "delayed",
    scheduled_time: m.scheduled_time,
    slot_code: m.slot?.code,
    court: m.court,
  }));
  
  const players = dbPlayers.map((p: any) => ({
    id: p.id,
    name: p.name,
    seed: p.seed,
    school: p.department,
  }));

  // Format event dates for Excel export
  const eventDate = event.start_date && event.end_date 
    ? `${new Date(event.start_date).toLocaleDateString('zh-TW')} - ${new Date(event.end_date).toLocaleDateString('zh-TW')}`
    : "2025/11/8 - 11/9";
  
  const eventVenue = event.venue || "台大新生網球場 5-8 場";

  // When all regular-season games are completed, default to Playoffs view
  const regularSeasonMatches = matches.filter((m) => m.round === 0);
  const allRegularComplete = regularSeasonMatches.length > 0 && regularSeasonMatches.every((m) => m.status === "completed" || m.status === "bye");
  const defaultDrawView = allRegularComplete ? "playoffs" : "standings";

  return (
    <>
      <TennisNavbarClient eventName={event.name} tournamentType={event.tournament_type} />
      <Toaster position="top-right" />
      <div className="container mx-auto px-4 py-6 md:py-12">
        <div className="mb-6 md:mb-8 flex flex-col gap-4 md:flex-row md:justify-between md:items-start">
          <div className="order-1 min-w-0">
            <h1 className="text-2xl md:text-4xl font-bold text-ntu-green mb-2 md:mb-4 break-words">
              {event.name || "NTU Tennis – 114 Freshman Cup Draw"}
            </h1>
            <p className="text-base md:text-lg text-gray-600">
              {event.tournament_type === 'season_play' 
                ? 'Season Play: Regular Season + Playoffs' 
                : 'Single-elimination tournament bracket'}
            </p>
          </div>
          <div className="order-2 w-full md:w-auto min-w-0 flex flex-col gap-2 md:shrink-0">
          <ExportBracket 
            matches={matches}
            players={players}
            eventName={event.name || "NTU Tennis Tournament"}
            eventDate={eventDate}
            eventVenue={eventVenue}
            tournamentType={event.tournament_type || "single_elimination"}
            matchPlayerStats={matchPlayerStats}
            statDefinitions={statDefinitions}
            teamMembers={teamMembers}
          />
          <ExportPDF
            matches={matches}
            players={players}
            eventName={event.name || "NTU Tennis Tournament"}
            eventDate={eventDate}
            eventVenue={eventVenue}
            tournamentType={event.tournament_type || "single_elimination"}
          />
        </div>
      </div>

      {event.tournament_type === 'season_play' ? (
        <SeasonPlayDisplay
          matches={matches}
          players={players}
          sportName="Tennis"
          visibleTabs={{ regular: false, standings: true, playoffs: true }}
          defaultView={defaultDrawView}
        />
      ) : (
        <BracketSection
          matches={matches}
          players={players}
          sportName="Tennis"
        />
      )}
      </div>
    </>
  );
}

