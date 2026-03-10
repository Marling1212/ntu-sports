import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getEventDivisions } from "@/lib/utils/getSportEvent";
import AnnouncementsManager from "@/components/admin/AnnouncementsManager";
import AnnouncementsPageNav from "@/components/admin/AnnouncementsPageNav";

export default async function AnnouncementsPage({
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

  // Get announcements: pinned first (by pinned_order), then by created_at
  const { data: announcements } = await supabase
    .from("announcements")
    .select("*")
    .eq("event_id", eventId)
    .order("is_pinned", { ascending: false })
    .order("pinned_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  const divisions = await getEventDivisions(eventId);
  if (divisions.length > 1 && !currentDivisionId) {
    redirect(`/admin/${eventId}/announcements?divisionId=${divisions[0].id}`);
  }
  const selectedDivision = currentDivisionId ? divisions.find((d) => d.id === currentDivisionId) : (divisions[0] ?? null);
  const effectiveDivisionId = selectedDivision?.id ?? (divisions.length === 1 ? divisions[0].id : null);

  return (
    <div className="flex">
        <AnnouncementsPageNav />
        <main className="min-w-0 flex-1 pt-6 pb-12">
          <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-ntu-green mb-2">Manage Announcements</h1>
          <p className="text-lg text-gray-600">
            {event?.name}
            {selectedDivision && (
              <span className="ml-2 text-ntu-green font-medium">
                · {selectedDivision.name ? `${selectedDivision.sport} – ${selectedDivision.name}` : selectedDivision.sport}
              </span>
            )}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            明日賽程將自動顯示於此頁，不需手動發布
          </p>
        </div>

        <div id="announcements" className="scroll-mt-24">
        <AnnouncementsManager 
          eventId={eventId} 
          initialAnnouncements={announcements || []}
        />
        </div>
          </div>
        </main>
    </div>
  );
}

