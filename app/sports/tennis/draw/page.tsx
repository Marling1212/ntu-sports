import TournamentBracket from "@/components/TournamentBracket";
import ExportBracket from "@/components/ExportBracket";
import { getTennisEvent, getTennisMatches, getTennisPlayers } from "@/lib/utils/getTennisEvent";
import { generateTennisPlayers, seedPlayers, generateMatches } from "@/data/tennisDraw";
import { Toaster } from "react-hot-toast";

// Disable caching to always fetch fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function TennisDrawPage() {
  // Try to get data from Supabase
  const event = await getTennisEvent();
  
  let matches;
  let players;
  
  if (event) {
    // Fetch from Supabase
    const dbMatches = await getTennisMatches(event.id);
    const dbPlayers = await getTennisPlayers(event.id);
    
    // Convert to tournament format
    matches = dbMatches.map((m: any) => ({
      id: m.id,
      round: m.round,
      matchNumber: m.match_number,
      player1: m.player1 ? { id: m.player1.id, name: m.player1.name, seed: m.player1.seed, school: m.player1.department } : null,
      player2: m.player2 ? { id: m.player2.id, name: m.player2.name, seed: m.player2.seed, school: m.player2.department } : null,
      winner: m.winner ? { id: m.winner.id, name: m.winner.name, seed: m.winner.seed, school: m.winner.department } : null,
      score: m.score1 && m.score2 ? `${m.score1}-${m.score2}` : undefined,
      status: m.status as "upcoming" | "live" | "completed" | "bye",
    }));
    
    players = dbPlayers.map((p: any) => ({
      id: p.id,
      name: p.name,
      seed: p.seed,
      school: p.department,
    }));
  } else {
    // Fallback to static data
    const allPlayers = generateTennisPlayers();
    const seededPlayers = seedPlayers(allPlayers);
    matches = generateMatches(seededPlayers);
    players = seededPlayers;
  }

  // Format event dates for Excel export
  const eventDate = event?.start_date && event?.end_date 
    ? `${new Date(event.start_date).toLocaleDateString('zh-TW')} - ${new Date(event.end_date).toLocaleDateString('zh-TW')}`
    : "2025/11/8 - 11/9";
  
  const eventVenue = event?.venue || "台大新生網球場 5-8 場";

  return (
    <>
      <Toaster position="top-right" />
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-ntu-green mb-4">
              {event?.name || "NTU Tennis – 114 Freshman Cup Draw"}
            </h1>
            <p className="text-lg text-gray-600">
              Single-elimination tournament bracket
            </p>
          </div>
          
          <ExportBracket 
            matches={matches}
            players={players}
            eventName={event?.name || "NTU Tennis Tournament"}
            eventDate={eventDate}
            eventVenue={eventVenue}
          />
        </div>

        <TournamentBracket
          matches={matches}
          players={players}
          sportName="Tennis"
        />
      </div>
    </>
  );
}


