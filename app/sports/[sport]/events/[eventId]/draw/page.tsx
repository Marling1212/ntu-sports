import BracketSection from "@/components/BracketSection";
import SeasonPlayDisplay from "@/components/SeasonPlayDisplay";
import ExportBracket from "@/components/ExportBracket";
import ExportPDF from "@/components/ExportPDF";
import PublicNavbar from "@/components/PublicNavbar";
import { getEventByIdAndSport, getDivisionIdsForEventAndSport, getFirstDivisionForEventAndSport, getSportMatches, getSportPlayers } from "@/lib/utils/getSportEvent";
import { createClient } from "@/lib/supabase/server";
import { Toaster } from "react-hot-toast";
import { notFound } from "next/navigation";
import { getLocale, getT } from "@/lib/i18n/server";
import { syncLockedPlayoffSeeds } from "@/lib/actions/syncLockedPlayoffSeeds";
import EventSponsorBanner from "@/components/EventSponsorBanner";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SportEventDrawPage({
  params,
}: {
  params: Promise<{ sport: string; eventId: string }>;
}) {
  const { sport, eventId } = await params;
  const sportParam = sport.toLowerCase();
  const sportName = sportParam ? sportParam.charAt(0).toUpperCase() + sportParam.slice(1) : "";
  const supabase = await createClient();
  const locale = await getLocale();
  const t = getT(locale);

  const event = await getEventByIdAndSport(eventId, sportParam);
  if (!event) notFound();

  const divisionIds = await getDivisionIdsForEventAndSport(event.id, sportParam);
  const divisionFilter = divisionIds.length > 0 ? divisionIds : undefined;
  const division = await getFirstDivisionForEventAndSport(event.id, sportParam);
  const tournamentType = (division?.tournament_type ?? event.tournament_type) as "single_elimination" | "season_play" | undefined;
  const registrationType = (division?.registration_type ?? event.registration_type) as "player" | "team" | undefined;

  if (tournamentType === "season_play") {
    await syncLockedPlayoffSeeds(event.id);
  }
  const { data: sponsors } = await supabase
    .from("sponsors")
    .select("id, name, logo_url, website_url")
    .eq("event_id", event.id);
  const dbMatches = await getSportMatches(event.id, divisionFilter);
  const dbPlayers = await getSportPlayers(event.id, divisionFilter);

  let matchPlayerStats: any[] = [];
  let statDefinitions: any[] = [];
  let teamMembers: any[] = [];
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
    .eq("sport", sportParam)
    .order("display_order", { ascending: true });
  statDefinitions = defs || [];
  if (registrationType === "team" && dbPlayers?.length) {
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

  const eventDate = event.start_date && event.end_date
    ? `${new Date(event.start_date).toLocaleDateString(locale === "zh" ? "zh-TW" : "en-US")} - ${new Date(event.end_date).toLocaleDateString(locale === "zh" ? "zh-TW" : "en-US")}`
    : (locale === "zh" ? "2025/11/8 - 11/9" : "11/8/2025 - 11/9/2025");
  const eventVenue = event.venue || t("common.defaultVenue");

  // When all regular-season games are completed, default to Playoffs view
  const regularSeasonMatches = matches.filter((m: { round: number }) => m.round === 0);
  const allRegularComplete = regularSeasonMatches.length > 0 && regularSeasonMatches.every((m: { status: string }) => m.status === "completed" || m.status === "bye");
  const defaultDrawView = allRegularComplete ? "playoffs" : "standings";

  return (
    <>
      <PublicNavbar eventName={event.name} tournamentType={tournamentType} />
      <Toaster position="top-right" />
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-12 pb-[max(2rem,env(safe-area-inset-bottom)+140px)]">
        <div className="mb-6 md:mb-8 flex flex-row justify-between items-start gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl md:text-4xl font-bold text-ntu-green mb-2 md:mb-4 break-words">
              {event.name || t("draw.pageTitleWithSport").replace("{sport}", sportName)}
            </h1>
            <p className="text-base md:text-lg text-gray-600">
              {tournamentType === "season_play"
                ? t("draw.pageSubtitleSeason")
                : t("draw.pageSubtitleBracket")}
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-2 shrink-0">
            <ExportBracket
              matches={matches}
              players={players}
              eventName={event.name || t("sports.ntuSportTournament").replace("{sport}", sportName)}
              eventDate={eventDate}
              eventVenue={eventVenue}
              tournamentType={tournamentType || "single_elimination"}
              matchPlayerStats={matchPlayerStats}
              statDefinitions={statDefinitions}
              teamMembers={teamMembers}
            />
            <ExportPDF
              matches={matches}
              players={players}
              eventName={event.name || t("sports.ntuSportTournament").replace("{sport}", sportName)}
              eventDate={eventDate}
              eventVenue={eventVenue}
              tournamentType={tournamentType || "single_elimination"}
            />
          </div>
        </div>

        {sponsors && sponsors.length > 0 && (
          <EventSponsorBanner sponsors={sponsors} label="Supported by" />
        )}

        {tournamentType === "season_play" ? (
          <SeasonPlayDisplay
            matches={matches}
            players={players}
            sportName={sportName}
            qualifiersPerGroup={(event as any)?.playoff_qualifiers_per_group || undefined}
            visibleTabs={{ regular: false, standings: true, playoffs: true }}
            defaultView={defaultDrawView}
            registrationType={registrationType}
            matchPlayerStats={matchPlayerStats}
            teamMembers={teamMembers}
            tiebreakerConfig={(event as any)?.tiebreaker_config ?? undefined}
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
