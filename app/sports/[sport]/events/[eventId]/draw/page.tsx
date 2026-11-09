import BracketSection from "@/components/BracketSection";
import SeasonPlayDisplay from "@/components/SeasonPlayDisplay";
import ExportBracket from "@/components/ExportBracket";
import ExportPDF from "@/components/ExportPDF";
import { getEventForPublicPage, getDivisionIdsForEventAndSport, getFirstDivisionForEventAndSport, getSportMatches, getSportPlayers } from "@/lib/utils/getSportEvent";
import { resolveCourtFromMatchRow } from "@/lib/utils/getCourtDisplay";
import { createClient } from "@/lib/supabase/server";
import { Toaster } from "react-hot-toast";
import { notFound } from "next/navigation";
import { getLocale, getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const sportIcons: Record<string, string> = {
  tennis: "🎾",
  soccer: "⚽",
  basketball: "🏀",
  volleyball: "🏐",
  badminton: "🏸",
  tabletennis: "🏓",
  baseball: "⚾",
  softball: "🥎",
};

export default async function SportEventDrawPage({
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
  const sportIcon = sportIcons[sportParam] || "🏆";
  const supabase = await createClient();
  const locale = await getLocale();
  const t = getT(locale);

  const event = await getEventForPublicPage(eventId, sportParam, { preview });
  if (!event) notFound();

  const divisionIds = await getDivisionIdsForEventAndSport(event.id, sportParam);
  const divisionFilter = divisionIds.length > 0 ? divisionIds : undefined;
  const division = await getFirstDivisionForEventAndSport(event.id, sportParam);
  const tournamentType = (division?.tournament_type ?? event.tournament_type) as "single_elimination" | "season_play" | undefined;
  const registrationType = (division?.registration_type ?? event.registration_type) as "player" | "team" | undefined;

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
    player1: m.player1?.id ? { id: m.player1.id, name: m.player1.name, seed: m.player1.seed, school: m.player1.department, checked_in_at: m.player1.checked_in_at } : null,
    player2: m.player2?.id ? { id: m.player2.id, name: m.player2.name, seed: m.player2.seed, school: m.player2.department, checked_in_at: m.player2.checked_in_at } : null,
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
    court: resolveCourtFromMatchRow(m),
  }));

  const players = (dbPlayers || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    seed: p.seed,
    school: p.department,
    checked_in_at: p.checked_in_at,
  }));

  const showCheckInStatus = Boolean(
    (division as any)?.public_check_in_enabled ?? (event as any)?.public_check_in_enabled
  );
  const bracketSplitMode = (
    (division as any)?.bracket_split_mode ?? (event as any)?.bracket_split_mode ?? "4_sections"
  ) as "4_sections" | "2_sections";

  const eventDate = event.start_date && event.end_date
    ? `${event.start_date.replace(/-/g, "/")} - ${event.end_date.replace(/-/g, "/")}`
    : (locale === "zh" ? "2025/11/8 - 11/9" : "11/8/2025 - 11/9/2025");
  const eventVenue = event.venue || t("common.defaultVenue");

  // When all regular-season games are completed, default to Playoffs view
  const regularSeasonMatches = matches.filter((m: { round: number }) => m.round === 0);
  const allRegularComplete = regularSeasonMatches.length > 0 && regularSeasonMatches.every((m: { status: string }) => m.status === "completed" || m.status === "bye" || m.status === "forfeit" || m.status === "walkover");
  const defaultDrawView = allRegularComplete ? "playoffs" : "standings";

  return (
    <>
      <Toaster position="top-right" />
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-[max(2rem,env(safe-area-inset-bottom)+140px)]">
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 break-words">
              {sportIcon} {event.name || t("draw.pageTitleWithSport").replace("{sport}", sportName)}
            </h1>
            {sponsors && sponsors.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-500">
                <span>Supported by</span>
                {sponsors.map((s: any) => (
                  <div
                    key={s.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-50 border border-slate-200"
                  >
                    {s.logo_url ? (
                      <img
                        src={s.logo_url}
                        alt={s.name}
                        className="w-4 h-4 rounded-full object-contain"
                      />
                    ) : (
                      <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[9px] font-bold">
                        {s.name.charAt(0)}
                      </span>
                    )}
                    <span className="font-medium text-slate-700">{s.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
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
              sportName={sportName}
            />
          </div>
        </div>

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
            showCheckInStatus={showCheckInStatus}
          />
        ) : (
          <BracketSection
            matches={matches}
            players={players}
            sportName={sportName}
            showCheckInStatus={showCheckInStatus}
            bracketSplitMode={bracketSplitMode}
          />
        )}
      </div>
    </>
  );
}
