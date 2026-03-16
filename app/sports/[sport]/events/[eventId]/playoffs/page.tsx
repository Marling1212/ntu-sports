import SeasonPlayDisplay from "@/components/SeasonPlayDisplay";
import { getEventForPublicPage, getDivisionIdsForEventAndSport, getSportMatches, getSportPlayers } from "@/lib/utils/getSportEvent";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { syncLockedPlayoffSeeds } from "@/lib/actions/syncLockedPlayoffSeeds";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SportEventPlayoffsPage({
  params,
  searchParams,
}: {
  params: Promise<{ sport: string; eventId: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { sport, eventId } = await params;
  const { preview } = await searchParams;
  const sportParam = sport.toLowerCase();
  const sportName = sportParam ? sportParam.charAt(0).toUpperCase() + sportParam.slice(1) : "";
  const supabase = await createClient();
  const t = getT("zh");

  const event = await getEventForPublicPage(eventId, sportParam, { preview });
  if (!event) notFound();

  if (event.tournament_type !== "season_play") {
    return (
      <>
        <div className="container mx-auto px-4 py-12 text-center pb-[max(2rem,env(safe-area-inset-bottom)+140px)]">
          <h1 className="text-4xl font-bold text-ntu-green mb-4">{t("playoffs.title")}</h1>
          <p className="text-gray-600 mb-6">{t("playoffs.noPlayoffsSingleElim")}</p>
          <Link href={`/sports/${sportParam}/events/${eventId}/draw`} className="text-ntu-green hover:underline font-medium">{t("playoffs.goToDraw")}</Link>
        </div>
      </>
    );
  }

  await syncLockedPlayoffSeeds(event.id);
  const divisionIds = await getDivisionIdsForEventAndSport(event.id, sportParam);
  const divisionFilter = divisionIds.length > 0 ? divisionIds : undefined;
  const dbMatches = await getSportMatches(event.id, divisionFilter);
  const dbPlayers = await getSportPlayers(event.id, divisionFilter);

  let matchPlayerStats: any[] = [];
  let teamMembers: any[] = [];
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

  const matches = (dbMatches || []).map((m: any) => ({
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
    status: m.status,
    scheduled_time: m.scheduled_time,
    slot_code: m.slot?.code,
    court: m.court,
  }));

  const players = (dbPlayers || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    seed: p.seed,
    school: p.department,
  }));

  return (
    <>
      <div className="container mx-auto px-4 py-12 pb-[max(2rem,env(safe-area-inset-bottom)+140px)]">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-ntu-green mb-2">
            {event.name} — {t("playoffs.title")}
          </h1>
          <p className="text-lg text-gray-600">{t("playoffs.subtitle")}</p>
        </div>
        <SeasonPlayDisplay
          matches={matches}
          players={players}
          sportName={sportName}
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
