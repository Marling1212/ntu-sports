import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getEventDivisions } from "@/lib/utils/getSportEvent";
import AdminNavbar from "@/components/admin/Navbar";
import PlayersTable from "@/components/admin/PlayersTable";
import GenerateBracket from "@/components/admin/GenerateBracket";
import GenerateSeasonPlay from "@/components/admin/GenerateSeasonPlay";
import EditPlayoffDraw from "@/components/admin/EditPlayoffDraw";
import ImportBracket from "@/components/admin/ImportBracket";
import ImportSeasonPlay from "@/components/admin/ImportSeasonPlay";
import ImportSeasonGroups from "@/components/admin/ImportSeasonGroups";
import ManualBracketEditor from "@/components/admin/ManualBracketEditor";
import PlayersPageNav from "@/components/admin/PlayersPageNav";

export default async function PlayersPage({ params }: { params: Promise<{ eventId: string }> }) {
  const supabase = await createClient();
  const { eventId } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  // Check if user is an organizer for this event
  const { data: organizer } = await supabase
    .from("organizers")
    .select("*")
    .eq("user_id", user.id)
    .eq("event_id", eventId)
    .single();

  if (!organizer) {
    return (
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-red-600 mb-4">Access Denied</h1>
        <p>You are not an authorized organizer for this event.</p>
      </div>
    );
  }

  // Get event details
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  // Get players for this event
  const { data: players } = await supabase
    .from("players")
    .select("*")
    .eq("event_id", eventId)
    .order("seed", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  // For season_play: get num groups from round-0 matches (for EditPlayoffDraw)
  let playoffNumGroups = 1;
  if (event?.tournament_type === "season_play") {
    const { data: r0 } = await supabase
      .from("matches")
      .select("group_number")
      .eq("event_id", eventId)
      .eq("round", 0);
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

  const divisions = await getEventDivisions(eventId);
  const defaultDivisionId = divisions.length === 1 ? divisions[0].id : null;

  return (
    <>
      <AdminNavbar eventId={eventId} eventName={event?.name} sport={event?.sport} />
      <div className="flex">
        <PlayersPageNav tournamentType={event?.tournament_type} />
        <main className="min-w-0 flex-1 pt-6 pb-12">
          <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-ntu-green mb-2">
            {event?.registration_type === 'team' ? '管理隊伍' : '管理選手'}
          </h1>
          <p className="text-lg text-gray-600">{event?.name}</p>
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
          defaultDivisionId={defaultDivisionId}
        />
        </div>

        {/* Step 2: 生成籤表/賽季 - 需要先有選手才能生成 */}
        {event?.tournament_type === 'season_play' ? (
          <div className="space-y-6 mt-8">
            <div id="generate-season-play" className="scroll-mt-24">
              <GenerateSeasonPlay 
                eventId={eventId}
                players={players || []}
                initialQualifiersPerGroup={event?.playoff_qualifiers_per_group ?? undefined}
                defaultDivisionId={defaultDivisionId}
              />
            </div>
            <div id="edit-playoff-draw" className="scroll-mt-24">
              <EditPlayoffDraw
                eventId={eventId}
                numGroups={playoffNumGroups}
                qualifiersPerGroup={event?.playoff_qualifiers_per_group ?? 4}
                defaultDivisionId={defaultDivisionId}
              />
            </div>
            <div id="import-season-groups" className="scroll-mt-24">
              <ImportSeasonGroups 
                eventId={eventId}
                players={players || []}
                defaultDivisionId={defaultDivisionId}
              />
            </div>
            <div id="import-season-play" className="scroll-mt-24">
              <ImportSeasonPlay 
                eventId={eventId}
                players={players || []}
                defaultDivisionId={defaultDivisionId}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-6 mt-8">
            <div id="generate-bracket" className="scroll-mt-24">
              <GenerateBracket 
                eventId={eventId}
                players={players || []}
                defaultDivisionId={defaultDivisionId}
              />
            </div>
            <div id="manual-bracket" className="scroll-mt-24">
              <ManualBracketEditor 
                eventId={eventId}
                players={players || []}
                defaultDivisionId={defaultDivisionId}
              />
            </div>
            <div id="import-bracket" className="scroll-mt-24">
              <ImportBracket 
                eventId={eventId}
                players={players || []}
                defaultDivisionId={defaultDivisionId}
              />
            </div>
          </div>
        )}
          </div>
        </main>
      </div>
    </>
  );
}

