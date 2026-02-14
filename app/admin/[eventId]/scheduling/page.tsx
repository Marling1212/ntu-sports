import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminNavbar from "@/components/admin/Navbar";
import SchedulingManager from "@/components/admin/SchedulingManager";
import ImportMatchSchedule from "@/components/admin/ImportMatchSchedule";
import ScheduleGridEditor from "@/components/admin/ScheduleGridEditor";
import SchedulingPageNav from "@/components/admin/SchedulingPageNav";

export default async function SchedulingPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const supabase = await createClient();
  const { eventId } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

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

  const { data: players } = await supabase
    .from("players")
    .select("*")
    .eq("event_id", eventId)
    .order("name", { ascending: true });

  const { data: matches } = await supabase
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
      <AdminNavbar eventId={eventId} eventName={event?.name} />
      <div className="flex">
        <SchedulingPageNav />
        <main className="min-w-0 flex-1 pt-6 pb-12">
          <div className="container mx-auto px-4">
            <div className="mb-6">
              <h1 className="text-4xl font-bold text-ntu-green mb-2">排程</h1>
              <p className="text-lg text-gray-600">
                {event?.name} — 設定時段、場地，並將比賽拖曳排入
              </p>
            </div>

        <div id="import-schedule" className="scroll-mt-24 pt-2">
          <ImportMatchSchedule eventId={eventId} players={players || []} />
        </div>

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
