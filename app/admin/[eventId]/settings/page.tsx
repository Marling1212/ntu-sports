import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminNavbar from "@/components/admin/Navbar";
import SettingsContent from "@/components/admin/SettingsContent";

export default async function SettingsPage({ params }: { params: Promise<{ eventId: string }> }) {
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

  // Get tournament rules
  const { data: rules } = await supabase
    .from("tournament_rules")
    .select("*")
    .eq("event_id", eventId)
    .order("order_number", { ascending: true });

  // Get schedule items
  const { data: scheduleItems } = await supabase
    .from("schedule_items")
    .select("*")
    .eq("event_id", eventId)
    .order("day_number", { ascending: true })
    .order("order_number", { ascending: true });

  return (
    <>
      <AdminNavbar eventId={eventId} eventName={event?.name} />
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-ntu-green mb-2">Event Settings</h1>
          <p className="text-lg text-gray-600">{event?.name}</p>
        </div>

        <SettingsContent 
          eventId={eventId}
          eventName={event?.name || ""}
          initialRules={rules || []}
          initialScheduleItems={scheduleItems || []}
          scheduleNotes={event?.schedule_notes || ""}
          scheduleUpdatedAt={event?.schedule_updated_at || ""}
          contactInfo={event?.contact_info || ""}
        />
      </div>
    </>
  );
}

