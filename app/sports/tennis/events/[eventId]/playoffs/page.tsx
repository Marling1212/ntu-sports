import SeasonPlayDisplay from "@/components/SeasonPlayDisplay";
import TennisNavbarClient from "@/components/TennisNavbarClient";
import { getTennisMatches, getTennisPlayers } from "@/lib/utils/getTennisEvent";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TennisEventPlayoffsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();

  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .eq("sport", "tennis")
    .eq("is_visible", true)
    .maybeSingle();

  if (error || !event) {
    notFound();
  }

  if (event.tournament_type !== "season_play") {
    return (
      <>
        <TennisNavbarClient eventName={event.name} tournamentType={event.tournament_type} />
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-4xl font-bold text-ntu-green mb-4">季後賽 / Playoffs</h1>
          <p className="text-gray-600 mb-6">本賽事為單淘汰制，無季後賽。請至籤表查看賽程。</p>
          <Link href={`/sports/tennis/events/${eventId}/draw`} className="text-ntu-green hover:underline font-medium">前往籤表 →</Link>
        </div>
      </>
    );
  }

  const dbMatches = await getTennisMatches(event.id);
  const dbPlayers = await getTennisPlayers(event.id);

  let matchPlayerStats: any[] = [];
  let teamMembers: { id: string; player_id: string; name: string; jersey_number?: number | null }[] = [];
  if (dbMatches?.length > 0) {
    const { data: stats } = await supabase
      .from("match_player_stats")
      .select("*")
      .in("match_id", dbMatches.map((m: any) => m.id));
    matchPlayerStats = stats || [];
  }
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

  const matches = dbMatches.map((m: any) => ({
    id: m.id,
    round: m.round,
    matchNumber: m.match_number,
    group_number: m.group_number,
    player1: m.player1 ? { id: m.player1.id, name: m.player1.name, seed: m.player1.seed, school: m.player1.department } : null,
    player2: m.player2 ? { id: m.player2.id, name: m.player2.name, seed: m.player2.seed, school: m.player2.department } : null,
    slot1: m.slot1_seed != null && m.slot1_group != null ? { seed: m.slot1_seed, group: m.slot1_group } : undefined,
    slot2: m.slot2_seed != null && m.slot2_group != null ? { seed: m.slot2_seed, group: m.slot2_group } : undefined,
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

  return (
    <>
      <TennisNavbarClient eventName={event.name} tournamentType={event.tournament_type} />
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-ntu-green mb-2">
            {event.name} — 季後賽 / Playoffs
          </h1>
          <p className="text-lg text-gray-600">季後賽淘汰賽程與結果</p>
        </div>

        <SeasonPlayDisplay
          matches={matches}
          players={players}
          sportName="Tennis"
          qualifiersPerGroup={(event as any)?.playoff_qualifiers_per_group || undefined}
          visibleTabs={{ regular: false, standings: false, playoffs: true }}
          defaultView="playoffs"
          registrationType={event?.registration_type as "player" | "team" | undefined}
          matchPlayerStats={matchPlayerStats}
          teamMembers={teamMembers}
        />
      </div>
    </>
  );
}
