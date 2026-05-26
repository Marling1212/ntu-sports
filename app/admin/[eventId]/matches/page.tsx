import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getEventDivisions } from "@/lib/utils/getSportEvent";
import MatchesTable from "@/components/admin/MatchesTable";
import PlayerStats from "@/components/admin/PlayerStats";
import MatchHistory from "@/components/admin/MatchHistory";
import MatchesPageNav from "@/components/admin/MatchesPageNav";
import { enrichSeasonPlayMatchesForAdmin } from "@/lib/scheduling/enrichSeasonPlayMatchesForAdmin";

export default async function MatchesPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ divisionId?: string }>;
}) {
  const supabase = await createClient();
  const { eventId } = await params;
  const { divisionId: divisionIdParam } = await searchParams;
  const currentDivisionId = divisionIdParam ?? null;

  // MatchesPage now relies on layout.tsx for Auth, Organizer check, and Navbar rendering

  const divisions = await getEventDivisions(eventId);
  if (divisions.length > 1 && !currentDivisionId) {
    redirect(`/admin/${eventId}/matches?divisionId=${divisions[0].id}`);
  }
  const selectedDivision = currentDivisionId ? divisions.find((d) => d.id === currentDivisionId) : (divisions[0] ?? null);
  const effectiveDivisionId = selectedDivision?.id ?? (divisions.length === 1 ? divisions[0].id : null);

  // Get event details specifically for the tournament type checks
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  // Get matches with player information (filter by division when multi-division)

  // Get matches with player information (filter by division when multi-division)
  let matchesQuery = supabase
    .from("matches")
    .select(`
      *,
      player1:players!matches_player1_id_fkey(id, name, seed),
      player2:players!matches_player2_id_fkey(id, name, seed),
      winner:players!matches_winner_id_fkey(id, name, seed),
      slot:event_slots(
        id, 
        code, 
        court_id,
        event_courts!event_slots_court_id_fkey(name)
      )
    `)
    .eq("event_id", eventId)
    .order("scheduled_time", { ascending: true, nullsFirst: false })
    .order("round", { ascending: true })
    .order("match_number", { ascending: true });
  if (effectiveDivisionId) {
    if (divisions.length === 1) {
      matchesQuery = matchesQuery.or(
        `division_id.eq.${effectiveDivisionId},division_id.is.null`
      );
    } else {
      matchesQuery = matchesQuery.eq("division_id", effectiveDivisionId);
    }
  }
  const { data: matchesRaw } = await matchesQuery;

  // Get all players for dropdown (filter by division when multi-division)
  let playersQuery = supabase.from("players").select("*").eq("event_id", eventId).order("name", { ascending: true });
  if (effectiveDivisionId) {
    playersQuery = playersQuery.eq("division_id", effectiveDivisionId);
  }
  const { data: players } = await playersQuery;

  const { data: slots } = await supabase
    .from("event_slots")
    .select("id, slot_date, start_time, end_time, code, court_id, court:event_courts(name)")
    .eq("event_id", eventId)
    .order("slot_date", { ascending: true })
    .order("start_time", { ascending: true });

  // Get courts for Court select
  const { data: courts } = await supabase
    .from("event_courts")
    .select("id, name")
    .eq("event_id", eventId)
    .order("name", { ascending: true });

  // Get match player stats for individual player goals
  const { data: matchPlayerStats } = await supabase
    .from("match_player_stats")
    .select("*")
    .in("match_id", (matchesRaw || []).map((m: { id: string }) => m.id));

  // Get team members if team event (use division's registration_type when in a division)
  const effectiveRegistrationType = selectedDivision?.registration_type ?? event?.registration_type;
  let teamMembers: any[] = [];
  if (effectiveRegistrationType === 'team') {
    const { data: members } = await supabase
      .from("team_members")
      .select("*")
      .in("player_id", (players || []).map(p => p.id));
    teamMembers = members || [];
  }

  const matches =
    event?.tournament_type === "season_play" && (matchesRaw?.length ?? 0) > 0
      ? enrichSeasonPlayMatchesForAdmin(matchesRaw as any[], players || [], event as any, {
          matchPlayerStats: matchPlayerStats || [],
          teamMembers,
        })
      : matchesRaw || [];
  const matchesForTable = (matches as any[]).filter((m: any) => m.status !== "bye");

  const defaultDivisionId = effectiveDivisionId;
  return (
    <>
      <div className="flex">
        <MatchesPageNav />
        <main className="min-w-0 flex-1 pt-6 pb-12">
          <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-ntu-green mb-2">比賽</h1>
          <p className="text-lg text-gray-600">
            {event?.name}
            {selectedDivision && (
              <span className="ml-2 text-ntu-green font-medium">
                · {selectedDivision.name ? `${selectedDivision.sport} – ${selectedDivision.name}` : selectedDivision.sport}
              </span>
            )}
            {" "}— 列表、比分、統計
          </p>
        </div>

        {(!players || players.length === 0) ? (
          <div className="bg-white rounded-xl shadow-md p-10 text-center border border-gray-100 max-w-2xl mx-auto mt-12">
            <div className="text-6xl mb-4">👥</div>
            <h2 className="text-2xl font-bold text-ntu-green mb-2">No players or teams found</h2>
            <p className="text-gray-600 mb-8">
              Before you can generate brackets or schedule matches, you need to add participants to your event.
            </p>
            <Link 
              href={`/admin/${eventId}/players${currentDivisionId ? `?divisionId=${currentDivisionId}` : ''}`}
              className="inline-block bg-ntu-green text-white px-8 py-3 rounded-lg font-semibold hover:bg-opacity-90 transition-colors"
            >
              Step 1: Go to Players & Teams Management
            </Link>
          </div>
        ) : (
          <>
            <div id="matches-table" className="scroll-mt-24">
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-900">
                要排定比賽時間（拖曳比賽到時段），請至{" "}
                <Link href={`/admin/${eventId}/scheduling#schedule-editor`} className="font-medium text-ntu-green underline hover:no-underline">
                  排程
                </Link>{" "}
                頁面。
              </p>
            </div>

            <MatchesTable 
              eventId={eventId} 
              initialMatches={matchesForTable || []} 
              players={players || []}
              slots={slots || []}
              courts={courts || []}
              tournamentType={event?.tournament_type as "single_elimination" | "season_play" | undefined}
              registrationType={event?.registration_type as 'player' | 'team' | undefined}
              matchPlayerStats={matchPlayerStats || []}
              divisions={divisions}
              defaultDivisionId={defaultDivisionId}
            />
            </div>

            {/* Player Statistics */}
            <div id="player-stats" className="mt-8 scroll-mt-24">
              <PlayerStats
                players={players || []}
                matches={matchesForTable || []}
                tournamentType={event?.tournament_type as "single_elimination" | "season_play" | undefined}
                registrationType={event?.registration_type as 'player' | 'team' | undefined}
                sport={event?.sport}
                matchPlayerStats={matchPlayerStats || []}
                teamMembers={teamMembers}
              />
            </div>

            {/* Match History */}
            <div id="match-history" className="mt-8 scroll-mt-24">
              <MatchHistory
                players={players || []}
                matches={matchesForTable || []}
                registrationType={event?.registration_type as 'player' | 'team' | undefined}
              />
            </div>
          </>
        )}
          </div>
        </main>
      </div>
    </>
  );
}

