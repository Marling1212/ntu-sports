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
  
  // Get the specific event
  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .eq("sport", "tennis")
    .maybeSingle();

  // If event not found or not a tennis event, show 404
  if (error || !event) {
    notFound();
  }

  // Fetch from Supabase
  const dbMatches = await getTennisMatches(event.id);
  const dbPlayers = await getTennisPlayers(event.id);
  
  // Convert to tournament format
  const matches = dbMatches.map((m: any) => ({
    id: m.id,
    round: m.round,
    matchNumber: m.match_number,
    group_number: m.group_number,
    player1: m.player1 ? { id: m.player1.id, name: m.player1.name, seed: m.player1.seed, school: m.player1.department } : null,
    player2: m.player2 ? { id: m.player2.id, name: m.player2.name, seed: m.player2.seed, school: m.player2.department } : null,
    winner: m.winner ? { id: m.winner.id, name: m.winner.name, seed: m.winner.seed, school: m.winner.department } : null,
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

  return (
    <>
      <TennisNavbarClient eventName={event.name} tournamentType={event.tournament_type} />
      <Toaster position="top-right" />
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-ntu-green mb-4">
              {event.name || "NTU Tennis – 114 Freshman Cup Draw"}
            </h1>
            <p className="text-lg text-gray-600">
              {event.tournament_type === 'season_play' 
                ? 'Season Play: Regular Season + Playoffs' 
                : 'Single-elimination tournament bracket'}
            </p>
          </div>
          
        <div className="flex gap-2">
          <ExportBracket 
            matches={matches}
            players={players}
            eventName={event.name || "NTU Tennis Tournament"}
            eventDate={eventDate}
            eventVenue={eventVenue}
            tournamentType={event.tournament_type || "single_elimination"}
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

