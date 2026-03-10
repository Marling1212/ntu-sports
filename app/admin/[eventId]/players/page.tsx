import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getEventDivisions } from "@/lib/utils/getSportEvent";
import PlayersTable from "@/components/admin/PlayersTable";
import GenerateBracket from "@/components/admin/GenerateBracket";
import GenerateSeasonPlay from "@/components/admin/GenerateSeasonPlay";
import EditPlayoffDraw from "@/components/admin/EditPlayoffDraw";
import ImportBracket from "@/components/admin/ImportBracket";
import ImportSeasonPlay from "@/components/admin/ImportSeasonPlay";
import ImportSeasonGroups from "@/components/admin/ImportSeasonGroups";
import ManualBracketEditor from "@/components/admin/ManualBracketEditor";
import PlayersPageNav from "@/components/admin/PlayersPageNav";

export default async function PlayersPage({
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

  // PlayersPage now relies on layout.tsx for Auth, Organizer check, and Navbar rendering

  const divisions = await getEventDivisions(eventId);
  // Multi-division: require a division (redirect to first so each division feels like a separate event)
  if (divisions.length > 1 && !currentDivisionId) {
    redirect(`/admin/${eventId}/players?divisionId=${divisions[0].id}`);
  }
  const selectedDivision = currentDivisionId ? divisions.find((d) => d.id === currentDivisionId) : (divisions[0] ?? null);

  // Get event details specifically for tournament_type fallback and registration checks
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  const effectiveTournamentType = (selectedDivision?.tournament_type ?? event?.tournament_type) as "season_play" | "single_elimination" | undefined;
  const effectiveDefaultDivisionId = selectedDivision?.id ?? (divisions.length === 1 ? divisions[0].id : null);

  // Get players for this event (optionally filter by division when editing one division)
  let playersQuery = supabase
    .from("players")
    .select("*")
    .eq("event_id", eventId)
    .order("seed", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });
  if (effectiveDefaultDivisionId) {
    playersQuery = playersQuery.eq("division_id", effectiveDefaultDivisionId);
  }
  const { data: playersRaw } = await playersQuery;
  const players = playersRaw ?? [];

  // For season_play: get num groups from round-0 matches (for EditPlayoffDraw), optionally for selected division
  let playoffNumGroups = 1;
  if (effectiveTournamentType === "season_play") {
    let r0Query = supabase.from("matches").select("group_number").eq("event_id", eventId).eq("round", 0);
    if (effectiveDefaultDivisionId) r0Query = r0Query.eq("division_id", effectiveDefaultDivisionId);
    const { data: r0 } = await r0Query;
    const groups = new Set((r0 || []).map((m: any) => m.group_number).filter((g: any) => g != null));
    playoffNumGroups = groups.size || 1;
  }

  // For 不可出賽: slot templates (weekly) and blackout templates per player
  const { data: slotTemplates } = await supabase
    .from("event_slot_templates")
    .select("*")
    .eq("event_id", eventId)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  const { data: blackoutTemplates } = await supabase
    .from("team_blackout_templates")
    .select("*")
    .eq("event_id", eventId)
    .order("player_id", { ascending: true })
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  return (
    <>
      <div className="flex">
        <PlayersPageNav tournamentType={effectiveTournamentType} />
        <main className="min-w-0 flex-1 pt-6 pb-12">
          <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-ntu-green mb-2">
            {(selectedDivision?.registration_type ?? event?.registration_type) === "team" ? "管理隊伍" : "管理選手"}
          </h1>
          <p className="text-lg text-gray-600">
            {event?.name}
            {selectedDivision && (
              <span className="ml-2 text-ntu-green font-medium">
                · {selectedDivision.name ? `${selectedDivision.sport} – ${selectedDivision.name}` : selectedDivision.sport}
              </span>
            )}
          </p>
        </div>

        {/* Step 1: 添加選手/隊伍 - 這是創建比賽的第一步 */}
        <div id="players-table" className="scroll-mt-24">
        <PlayersTable 
          eventId={eventId} 
          initialPlayers={players || []} 
          registrationType={event?.registration_type as 'player' | 'team' | undefined}
          initialBlackoutLimit={event?.blackout_limit ?? null}
          initialSlotTemplates={slotTemplates || []}
          initialBlackoutTemplates={blackoutTemplates || []}
          divisions={divisions}
          defaultDivisionId={effectiveDefaultDivisionId}
        />
        </div>

        {/* Step 2: 生成籤表/賽季 - 需要先有選手才能生成 (use selected division's type when one is selected) */}
        {(players && players.length > 0) ? (
          effectiveTournamentType === "season_play" ? (
            <div className="space-y-6 mt-8">
              <div id="generate-season-play" className="scroll-mt-24">
                <GenerateSeasonPlay 
                  eventId={eventId}
                  players={players || []}
                  initialQualifiersPerGroup={event?.playoff_qualifiers_per_group ?? undefined}
                  defaultDivisionId={effectiveDefaultDivisionId}
                />
              </div>
              <div id="edit-playoff-draw" className="scroll-mt-24">
                <EditPlayoffDraw
                  eventId={eventId}
                  numGroups={playoffNumGroups}
                  qualifiersPerGroup={event?.playoff_qualifiers_per_group ?? 4}
                  defaultDivisionId={effectiveDefaultDivisionId}
                />
              </div>
              <div id="import-season-groups" className="scroll-mt-24">
                <ImportSeasonGroups 
                  eventId={eventId}
                  players={players || []}
                  defaultDivisionId={effectiveDefaultDivisionId}
                />
              </div>
              <div id="import-season-play" className="scroll-mt-24">
                <ImportSeasonPlay 
                  eventId={eventId}
                  players={players || []}
                  defaultDivisionId={effectiveDefaultDivisionId}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6 mt-8">
              <div id="generate-bracket" className="scroll-mt-24">
                <GenerateBracket 
                  eventId={eventId}
                  players={players || []}
                  defaultDivisionId={effectiveDefaultDivisionId}
                />
              </div>
              <div id="manual-bracket" className="scroll-mt-24">
                <ManualBracketEditor 
                  eventId={eventId}
                  players={players || []}
                  defaultDivisionId={effectiveDefaultDivisionId}
                />
              </div>
              <div id="import-bracket" className="scroll-mt-24">
                <ImportBracket 
                  eventId={eventId}
                  players={players || []}
                  defaultDivisionId={effectiveDefaultDivisionId}
                />
              </div>
            </div>
          )
        ) : (
          <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-xl text-center">
            <h3 className="text-xl font-bold text-blue-800 mb-2">Step 2 waiting for participants...</h3>
            <p className="text-blue-600">
              Once you have added players or teams above, your bracket management tools will appear here.
            </p>
          </div>
        )}
          </div>
        </main>
      </div>
    </>
  );
}

