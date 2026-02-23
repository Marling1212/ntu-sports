import BracketSection from "@/components/BracketSection";
import SeasonPlayDisplay from "@/components/SeasonPlayDisplay";
import ExportBracket from "@/components/ExportBracket";
import ExportPDF from "@/components/ExportPDF";
import TennisNavbarClient from "@/components/TennisNavbarClient";
import { getSportEvent, getSportMatches, getSportPlayers } from "@/lib/utils/getSportEvent";
import { generateTennisPlayers, seedPlayers, generateMatches } from "@/data/tennisDraw";
import { Toaster } from "react-hot-toast";
import { createClient } from "@/lib/supabase/server";
import { getLocale, getT } from "@/lib/i18n/server";
import { redirect } from "next/navigation";

// Disable caching to always fetch fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SportDrawPage(context: any) {
  const params = (context?.params || {}) as { sport?: string };
  const sportParam = (params.sport || "").toLowerCase();
  // Standardize on event-level URLs: redirect sport-level to event-level when exactly one event
  const supabase = await createClient();
  const { data: events } = sportParam
    ? await supabase.from("events").select("id").eq("sport", sportParam).eq("is_visible", true).order("start_date", { ascending: false })
    : { data: [] };
  if (events?.length === 1) {
    redirect(`/sports/${sportParam}/events/${events[0].id}/draw`);
  }
  redirect(`/sports/${sportParam}`);

  const locale = await getLocale();
  const t = getT(locale);
  // Capitalize first letter of sport name
  const sportName = sportParam ? sportParam.charAt(0).toUpperCase() + sportParam.slice(1) : "";
  
  // Try to get data from Supabase (case-insensitive)
  const event = sportParam ? await getSportEvent(sportParam) : null; // Pass lowercase version for case-insensitive lookup
  
  let matches: any[] = [];
  let players: any[] = [];
  let matchPlayerStats: any[] = [];
  let statDefinitions: { stat_name: string; stat_label: string; display_order: number; stat_level?: string }[] = [];
  let teamMembers: any[] = [];
  
  if (event) {
    // Fetch from Supabase
    const dbMatches = await getSportMatches(event.id);
    const dbPlayers = await getSportPlayers(event.id);
    
    // Get match player stats for top scorers and for Excel export
    if (dbMatches && dbMatches.length > 0) {
      const { data: stats } = await supabase
        .from("match_player_stats")
        .select("*")
        .in("match_id", dbMatches.map((m: any) => m.id));
      matchPlayerStats = stats || [];
    }

    // Stat definitions for Excel export (include stat_level for 球員統計 sheet)
    if (event?.sport) {
      const { data: defs } = await supabase
        .from("sport_stat_definitions")
        .select("stat_name, stat_label, display_order, stat_level")
        .eq("sport", event.sport)
        .order("display_order", { ascending: true });
      statDefinitions = defs || [];
    }
    
    // Get team members if team event (for 球員統計: which player scored, yellow card, etc.)
    if (event.registration_type === 'team' && dbPlayers) {
      const teamIds = dbPlayers.filter((p: any) => p.type === 'team').map((p: any) => p.id);
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
    matches = dbMatches.map((m: any) => ({
      id: m.id,
      round: m.round,
      matchNumber: m.match_number,
      group_number: m.group_number, // Pass through group_number for season play
      player1: m.player1 ? { id: m.player1.id, name: m.player1.name, seed: m.player1.seed, school: m.player1.department } : null,
      player2: m.player2 ? { id: m.player2.id, name: m.player2.name, seed: m.player2.seed, school: m.player2.department } : null,
      slot1: m.slot1_seed != null && m.slot1_group != null ? { seed: m.slot1_seed, group: m.slot1_group } : undefined,
      slot2: m.slot2_seed != null && m.slot2_group != null ? { seed: m.slot2_seed, group: m.slot2_group } : undefined,
      winner: m.winner ? { id: m.winner.id, name: m.winner.name, seed: m.winner.seed, school: m.winner.department } : null,
      winner_id: m.winner_id, // Pass through winner_id for draw detection
      score: m.score1 && m.score2 ? `${m.score1}-${m.score2}` : undefined,
      score1: m.score1, // Pass through score1 for draw detection
      score2: m.score2, // Pass through score2 for draw detection
      status: m.status as "upcoming" | "live" | "completed" | "bye" | "delayed",
      scheduled_time: m.scheduled_time, // Pass through scheduled_time for sorting
      slot_code: m.slot?.code, // Pass through slot code if available
      court: m.court, // Use match.court for consistency with admin page
    }));
    
    players = dbPlayers.map((p: any) => ({
      id: p.id,
      name: p.name,
      seed: p.seed,
      school: p.department,
    }));
  } else {
    // Fallback to static data (only for tennis)
    if (sportName === "Tennis") {
      const allPlayers = generateTennisPlayers();
      const seededPlayers = seedPlayers(allPlayers);
      matches = generateMatches(seededPlayers);
      players = seededPlayers;
    } else {
      matches = [];
      players = [];
    }
  }

  // Format event dates for Excel export
  const eventDate = event?.start_date && event?.end_date 
    ? `${new Date(event.start_date).toLocaleDateString(locale === "zh" ? "zh-TW" : "en-US")} - ${new Date(event.end_date).toLocaleDateString(locale === "zh" ? "zh-TW" : "en-US")}`
    : (locale === "zh" ? "2025/11/8 - 11/9" : "11/8/2025 - 11/9/2025");
  
  const eventVenue = event?.venue || t("common.defaultVenue");

  return (
    <>
      <TennisNavbarClient eventName={event?.name} tournamentType={event?.tournament_type} />
      <Toaster position="top-right" />
      <div className="container mx-auto px-4 py-6 md:py-12">
        <div className="mb-6 md:mb-8 flex flex-row justify-between items-start gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl md:text-4xl font-bold text-ntu-green mb-2 md:mb-4 break-words">
              {event?.name || t("draw.pageTitleWithSport").replace("{sport}", sportName)}
            </h1>
            <p className="text-base md:text-lg text-gray-600">
              {event?.tournament_type === 'season_play' 
                ? t("draw.pageSubtitleSeason")
                : t("draw.pageSubtitleBracket")}
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-2 shrink-0">
          <ExportBracket 
            matches={matches}
            players={players}
            eventName={event?.name || t("sports.ntuSportTournament").replace("{sport}", sportName)}
            eventDate={eventDate}
            eventVenue={eventVenue}
            tournamentType={event?.tournament_type || "single_elimination"}
            matchPlayerStats={matchPlayerStats}
            statDefinitions={statDefinitions}
            teamMembers={teamMembers}
          />
          <ExportPDF
            matches={matches}
            players={players}
            eventName={event?.name || t("sports.ntuSportTournament").replace("{sport}", sportName)}
            eventDate={eventDate}
            eventVenue={eventVenue}
            tournamentType={event?.tournament_type || "single_elimination"}
          />
        </div>
      </div>

      {event?.tournament_type === 'season_play' ? (
        <SeasonPlayDisplay
          matches={matches}
          players={players}
          sportName={sportName}
          qualifiersPerGroup={(event as any)?.playoff_qualifiers_per_group || undefined}
          visibleTabs={{ regular: false, standings: true, playoffs: false }}
          defaultView="standings"
          registrationType={event?.registration_type as 'player' | 'team' | undefined}
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

