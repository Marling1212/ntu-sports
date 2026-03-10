import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminNavbar from "@/components/admin/Navbar";
import { getEventDivisions } from "@/lib/utils/getSportEvent";

export default async function EventAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
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

  // Verify the user is an organizer for this particular event
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

  // Prefetch event and generic division details for the Navbar to use
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  const divisions = await getEventDivisions(eventId);

  return (
    <>
      <AdminNavbar
        eventId={eventId}
        eventName={event?.name}
        sport={event?.sport}
        isVisible={event?.is_visible}
        divisions={divisions}
      />
      {children}
    </>
  );
}
