import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getEventDivisions } from "@/lib/utils/getSportEvent";
import SchedulingManager from "@/components/admin/SchedulingManager";
import ImportMatchSchedule from "@/components/admin/ImportMatchSchedule";
import ScheduleGridEditor from "@/components/admin/ScheduleGridEditor";
import SchedulingPageNav from "@/components/admin/SchedulingPageNav";
import ShiftAllScheduleTimesPanel from "@/components/admin/ShiftAllScheduleTimesPanel";
import SchedulingModePrompt from "@/components/admin/SchedulingModePrompt";

export default async function SchedulingPage({
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

  // SchedulingPage now relies on layout.tsx for Auth, Organizer check, and Navbar rendering

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  const { data: courts } = await supabase
    .from("event_courts")
    .select("*")
    .eq("event_id", eventId)
    .order("name", { ascending: true });

  const { data: slots } = await supabase
    .from("event_slots")
    .select("*, court:event_courts(*)")
    .eq("event_id", eventId)
    .order("slot_date", { ascending: true })
    .order("start_time", { ascending: true });

  const { data: slotTemplates } = await supabase
    .from("event_slot_templates")
    .select("*, court:event_courts(*)")
    .eq("event_id", eventId)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  const divisions = await getEventDivisions(eventId);
  if (divisions.length > 1 && !currentDivisionId) {
    redirect(`/admin/${eventId}/scheduling?divisionId=${divisions[0].id}`);
  }
  const selectedDivision = currentDivisionId ? divisions.find((d) => d.id === currentDivisionId) : (divisions[0] ?? null);
  const effectiveDivisionId = selectedDivision?.id ?? (divisions.length === 1 ? divisions[0].id : null);

  const { data: players } = await supabase
    .from("players")
    .select("*")
    .eq("event_id", eventId)
    .order("name", { ascending: true });

  let matchesQuery = supabase
    .from("matches")
    .select(`
      *,
      player1:players!matches_player1_id_fkey(id, name, seed),
      player2:players!matches_player2_id_fkey(id, name, seed),
      slot:event_slots(id, slot_date, start_time, end_time, code, court_id, event_courts!event_slots_court_id_fkey(name))
    `)
    .eq("event_id", eventId)
    .neq("status", "bye")
    .order("scheduled_time", { ascending: true, nullsFirst: false })
    .order("round", { ascending: true })
    .order("match_number", { ascending: true });
  // 單一組別賽事：一併載入 division_id 為 NULL 的舊資料，否則拖曳排程永遠清不到、公開頁仍顯示舊時間
  if (effectiveDivisionId) {
    if (divisions.length === 1) {
      matchesQuery = matchesQuery.or(
        `division_id.eq.${effectiveDivisionId},division_id.is.null`
      );
    } else {
      matchesQuery = matchesQuery.eq("division_id", effectiveDivisionId);
    }
  }
  const { data: matches } = await matchesQuery;

  const { data: blackoutTemplates } = await supabase
    .from("team_blackout_templates")
    .select("player_id, day_of_week, start_time, end_time")
    .eq("event_id", eventId);

  const slotsForGrid = (slots || []).map((s: any) => ({
    id: s.id,
    slot_date: s.slot_date,
    start_time: s.start_time,
    end_time: s.end_time,
    code: s.code,
    court_id: s.court_id,
    court: s.court,
  }));
  const matchesForGrid = (matches || []).map((m: any) => ({
    id: m.id,
    player1_id: m.player1_id,
    player2_id: m.player2_id,
    slot_id: m.slot_id,
    scheduled_time: m.scheduled_time,
    status: m.status,
    round: m.round,
    match_number: m.match_number,
    player1: m.player1,
    player2: m.player2,
  }));

  return (
    <>
      <div className="flex">
        <SchedulingPageNav />
        <main className="min-w-0 flex-1 pt-6 pb-12">
          <div className="container mx-auto px-4">
            <SchedulingModePrompt eventId={eventId} />
            <div className="mb-6">
              <h1 className="text-4xl font-bold text-ntu-green mb-2">排程</h1>
              <p className="text-lg text-gray-600">
                {event?.name} — 設定時段、場地，並將比賽拖曳排入
              </p>
            </div>

            <section
              id="fixed-scheduling-section"
              className="rounded-xl border-2 border-ntu-green/20 bg-ntu-green/5 px-4 py-3 mb-4 scroll-mt-24"
            >
              <h2 className="text-lg font-semibold text-ntu-green">區塊一：原本排程功能（固定時間）</h2>
              <p className="text-sm text-gray-600 mt-1">
                先建立場地與時段，接著將比賽拖曳到指定時間。
              </p>
            </section>

            <div id="import-schedule" className="scroll-mt-24 pt-2">
              <ImportMatchSchedule eventId={eventId} players={players || []} />
            </div>

            <ShiftAllScheduleTimesPanel eventId={eventId} />

            <SchedulingManager
              eventId={eventId}
              initialCourts={courts || []}
              initialSlots={slots || []}
              initialSlotTemplates={slotTemplates || []}
            />

            <div id="schedule-editor" className="mt-10 scroll-mt-24">
              <h2 className="text-2xl font-semibold text-ntu-green mb-2">排程編輯（拖曳比賽）</h2>
              <p className="text-sm text-gray-600 mb-4">
                將左側比賽拖曳至下方時段格；若該時段為某隊不可出賽會顯示警示，仍可儲存。
              </p>
              <ScheduleGridEditor
                eventId={eventId}
                divisionId={effectiveDivisionId}
                divisionsCount={divisions.length}
                slots={slotsForGrid}
                matches={matchesForGrid}
                blackoutTemplates={blackoutTemplates || []}
              />
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
