import { createClient } from "@/lib/supabase/server";
import { getSportEvent } from "@/lib/utils/getSportEvent";
import MarkdownText from "@/components/MarkdownText";
import TennisNavbarClient from "@/components/TennisNavbarClient";
import SeasonPlayDisplay from "@/components/SeasonPlayDisplay";
import { getSportMatches, getSportPlayers } from "@/lib/utils/getSportEvent";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SportSchedulePage({ params }: { params: { sport: string } }) {
  const supabase = await createClient();
  const sportName = params.sport.charAt(0).toUpperCase() + params.sport.slice(1);
  const event = await getSportEvent(params.sport); // Pass lowercase version for case-insensitive lookup
  let matches: any[] = [];
  let players: any[] = [];
  if (event) {
    const dbMatches = await getSportMatches(event.id);
    const dbPlayers = await getSportPlayers(event.id);
    matches = dbMatches.map((m: any) => ({
      id: m.id,
      round: m.round,
      matchNumber: m.match_number,
      group_number: m.group_number,
      player1: m.player1 ? { id: m.player1.id, name: m.player1.name, seed: m.player1.seed, school: m.player1.department } : null,
      player2: m.player2 ? { id: m.player2.id, name: m.player2.name, seed: m.player2.seed, school: m.player2.department } : null,
      winner: m.winner ? { id: m.winner.id, name: m.winner.name, seed: m.winner.seed, school: m.winner.department } : null,
      score: m.score1 && m.score2 ? `${m.score1}-${m.score2}` : undefined,
      status: m.status as "upcoming" | "live" | "completed" | "bye" | "delayed",
      scheduled_time: m.scheduled_time,
      slot_code: m.slot?.code,
      court_name: m.slot?.event_courts?.name,
    }));
    players = dbPlayers.map((p: any) => ({
      id: p.id,
      name: p.name,
      seed: p.seed,
      school: p.department,
    }));
  }
  
  // Get tournament rules
  const { data: rules } = await supabase
    .from("tournament_rules")
    .select("*")
    .eq("event_id", event?.id || "")
    .order("order_number", { ascending: true });

  // Get schedule items
  const { data: scheduleItems } = await supabase
    .from("schedule_items")
    .select("*")
    .eq("event_id", event?.id || "")
    .order("order_number", { ascending: true });

  return (
    <>
      <TennisNavbarClient eventName={event?.name} />
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-ntu-green mb-4">{sportName} Schedule</h1>
          <p className="text-lg text-gray-600">
            {event?.tournament_type === 'season_play'
              ? 'Regular season match schedule'
              : 'Tournament schedule and important dates'}
          </p>
        </div>

        {/* Tournament Rules (non-season-play) */}
        {event?.tournament_type !== 'season_play' && rules && rules.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-8 mb-8 border border-gray-100">
            <h2 className="text-2xl font-semibold text-ntu-green mb-4">Tournament Rules</h2>
            <div className="space-y-4">
              {rules.map((rule, idx) => (
                <div key={rule.id} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-ntu-green text-white rounded-full flex items-center justify-center font-bold">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <MarkdownText text={rule.content} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Schedule Items (non-season-play) */}
        {event?.tournament_type !== 'season_play' && scheduleItems && scheduleItems.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-8 border border-gray-100">
            <h2 className="text-2xl font-semibold text-ntu-green mb-4">Schedule</h2>
            <div className="space-y-4">
              {scheduleItems.map((item, idx) => (
                <div key={item.id} className="flex gap-4 pb-4 border-b border-gray-200 last:border-b-0">
                  <div className="flex-shrink-0 w-24 text-sm font-semibold text-gray-700">
                    {item.time || `Day ${idx + 1}`}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 mb-1">{item.title}</h3>
                    {item.description && (
                      <MarkdownText text={item.description} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Season Play: Regular Season Matches */}
        {event?.tournament_type === 'season_play' && (
          <div className="mb-8">
            <SeasonPlayDisplay
              matches={matches}
              players={players}
              sportName={sportName}
              visibleTabs={{ regular: true, standings: false, playoffs: false }}
              defaultView="regular"
            />
          </div>
        )}

        {event?.tournament_type !== 'season_play' && (!rules || rules.length === 0) && (!scheduleItems || scheduleItems.length === 0) && (
          <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-100">
            <p className="text-gray-600 text-lg">No schedule information available yet.</p>
          </div>
        )}
      </div>
    </>
  );
}

