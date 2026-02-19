import { createClient } from "@/lib/supabase/server";
import TennisNavbarClient from "@/components/TennisNavbarClient";
import BracketMatchSchedule from "@/components/BracketMatchSchedule";
import SeasonPlayDisplay from "@/components/SeasonPlayDisplay";
import { getSportMatches, getSportPlayers } from "@/lib/utils/getSportEvent";
import { notFound } from "next/navigation";
import { getLocale, getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TennisEventSchedulePage({
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

  const isSeasonPlay = event.tournament_type === "season_play";

  if (isSeasonPlay) {
    const dbMatches = await getSportMatches(event.id);
    const dbPlayers = await getSportPlayers(event.id);
    const matches = (dbMatches || []).map((m: any) => ({
      id: m.id,
      round: m.round,
      matchNumber: m.match_number,
      group_number: m.group_number,
      player1: m.player1 ? { id: m.player1.id, name: m.player1.name, seed: m.player1.seed, school: m.player1.department } : null,
      player2: m.player2 ? { id: m.player2.id, name: m.player2.name, seed: m.player2.seed, school: m.player2.department } : null,
      slot1: m.slot1_seed != null && m.slot1_group != null ? { seed: m.slot1_seed, group: m.slot1_group } : undefined,
      slot2: m.slot2_seed != null && m.slot2_group != null ? { seed: m.slot2_seed, group: m.slot2_group } : undefined,
      winner: m.winner ? { id: m.winner.id, name: m.winner.name, seed: m.winner.seed, school: m.winner.department } : null,
      score: m.score1 != null && m.score2 != null ? `${m.score1}-${m.score2}` : undefined,
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
    let matchPlayerStats: any[] = [];
    let teamMembers: any[] = [];
    if (dbMatches?.length) {
      const { data: stats } = await supabase
        .from("match_player_stats")
        .select("*")
        .in("match_id", dbMatches.map((m: any) => m.id));
      matchPlayerStats = stats || [];
    }
    if (event.registration_type === "team" && dbPlayers?.length) {
      const teamIds = dbPlayers.filter((p: any) => p.type === "team").map((p: any) => p.id);
      if (teamIds.length) {
        const { data: members } = await supabase
          .from("team_members")
          .select("id, player_id, name, jersey_number")
          .in("player_id", teamIds)
          .order("jersey_number", { ascending: true, nullsFirst: true });
        teamMembers = members || [];
      }
    }

    const locale = await getLocale();
    const t = getT(locale);

    // When all regular-season games are completed, default to Playoffs on Games page too
    const regularSeasonMatches = matches.filter((m) => m.round === 0);
    const hasPlayoffs = matches.some((m) => m.round >= 1);
    const allRegularComplete = regularSeasonMatches.length > 0 && regularSeasonMatches.every((m) => m.status === "completed" || m.status === "bye");
    const defaultGamesView = hasPlayoffs && allRegularComplete ? "playoffs" : "regular";

    return (
      <>
        <TennisNavbarClient eventName={event.name} tournamentType={event.tournament_type} />
        <div className="container mx-auto px-4 py-12">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-ntu-green mb-4">
              {event.name || "NTU Tennis Schedule"}
            </h1>
            <p className="text-lg text-gray-600">{t("schedule.pageSubtitleSeason")}</p>
          </div>
          <SeasonPlayDisplay
            matches={matches}
            players={players}
            sportName="Tennis"
            qualifiersPerGroup={(event as any)?.playoff_qualifiers_per_group ?? undefined}
            visibleTabs={{ regular: true, standings: false, playoffs: hasPlayoffs }}
            defaultView={defaultGamesView}
            registrationType={(event as any)?.registration_type ?? "player"}
            matchPlayerStats={matchPlayerStats}
            teamMembers={teamMembers}
            tiebreakerConfig={(event as any)?.tiebreaker_config ?? undefined}
          />
        </div>
      </>
    );
  }

  const dbMatches = await getSportMatches(event.id);

  return (
    <>
      <TennisNavbarClient eventName={event.name} tournamentType={event.tournament_type} />
      <BracketMatchSchedule
        matches={dbMatches || []}
        sportSlug="tennis"
        eventName={event.name}
      />
    </>
  );
}

