import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminNavbar from "@/components/admin/Navbar";
import SchedulingManager from "@/components/admin/SchedulingManager";

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

  const { data: blackouts } = await supabase
    .from("team_blackouts")
    .select("*, player:players(id, name, department, seed)")
    .eq("event_id", eventId)
    .order("start_time", { ascending: true });

  const { data: slotTemplates } = await supabase
    .from("event_slot_templates")
    .select("*, court:event_courts(*)")
    .eq("event_id", eventId)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  const { data: blackoutTemplates } = await supabase
    .from("team_blackout_templates")
    .select("*, player:players(id, name, department, seed)")
    .eq("event_id", eventId)
    .order("player_id", { ascending: true })
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  const { data: players } = await supabase
    .from("players")
    .select("*")
    .eq("event_id", eventId)
    .order("name", { ascending: true });

  return (
    <>
      <AdminNavbar eventId={eventId} eventName={event?.name} />
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-ntu-green mb-2">Scheduling</h1>
          <p className="text-lg text-gray-600">
            {event?.name}
          </p>
        </div>

        <SchedulingManager
          eventId={eventId}
          initialCourts={courts || []}
          initialSlots={slots || []}
          initialBlackouts={blackouts || []}
          initialSlotTemplates={slotTemplates || []}
          initialBlackoutTemplates={blackoutTemplates || []}
          players={players || []}
          initialBlackoutLimit={event?.blackout_limit ?? null}
        />
      </div>
    </>
  );
}
