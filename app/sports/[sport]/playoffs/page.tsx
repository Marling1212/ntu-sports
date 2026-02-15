import SeasonPlayDisplay from "@/components/SeasonPlayDisplay";
import TennisNavbarClient from "@/components/TennisNavbarClient";
import { getSportEvent, getSportMatches, getSportPlayers } from "@/lib/utils/getSportEvent";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { getLocale, getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SportPlayoffsPage(context: any) {
  const locale = await getLocale();
  const t = getT(locale);
  const params = (context?.params || {}) as { sport?: string };
  const sportParam = (params.sport || "").toLowerCase();
  const sportName = sportParam ? sportParam.charAt(0).toUpperCase() + sportParam.slice(1) : "";

  const event = sportParam ? await getSportEvent(sportParam) : null;
  const supabase = await createClient();

  let matches: any[] = [];
  let players: any[] = [];
  let matchPlayerStats: any[] = [];
  let teamMembers: any[] = [];

  if (event) {
    const dbMatches = await getSportMatches(event.id);
    const dbPlayers = await getSportPlayers(event.id);

    if (dbMatches?.length > 0) {
      const { data: stats } = await supabase
        .from("match_player_stats")
        .select("*")
        .in("match_id", dbMatches.map((m: any) => m.id));
      matchPlayerStats = stats || [];
    }

    if (event.registration_type === "team" && dbPlayers) {
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

    matches = dbMatches.map((m: any) => ({
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

    players = dbPlayers.map((p: any) => ({
      id: p.id,
      name: p.name,
      seed: p.seed,
      school: p.department,
    }));
  }

  const basePath = `/sports/${sportParam}`;

  if (!event) {
    return (
      <>
        <TennisNavbarClient eventName={undefined} tournamentType={undefined} />
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-4xl font-bold text-ntu-green mb-4">{sportName}</h1>
          <p className="text-gray-600 mb-6">{t("common.noEventFound")}</p>
          <Link href={basePath} className="text-ntu-green hover:underline font-medium">← {t("navigation.backToSport").replace("{sport}", sportName)}</Link>
        </div>
      </>
    );
  }

  if (event.tournament_type !== "season_play") {
    return (
      <>
        <TennisNavbarClient eventName={event.name} tournamentType={event.tournament_type} />
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-4xl font-bold text-ntu-green mb-4">{t("playoffs.title")}</h1>
          <p className="text-gray-600 mb-6">{t("playoffs.noPlayoffsSingleElim")}</p>
          <Link href={`${basePath}/draw`} className="text-ntu-green hover:underline font-medium">{t("playoffs.goToDraw")}</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <TennisNavbarClient eventName={event.name} tournamentType={event.tournament_type} />
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-ntu-green mb-2">
            {event.name} — {t("playoffs.titleWithEvent")}
          </h1>
          <p className="text-lg text-gray-600">
            {t("playoffs.subtitle")}
          </p>
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
