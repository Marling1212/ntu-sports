import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getEventDivisions } from "@/lib/utils/getSportEvent";
import SettingsContent from "@/components/admin/SettingsContent";
import SettingsPageNav from "@/components/admin/SettingsPageNav";

export default async function SettingsPage({
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

  // SettingsPage now relies on layout.tsx for Auth, Organizer check, and Navbar rendering

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

  // Get sponsors for this event
  const { data: sponsors } = await supabase
    .from("sponsors")
    .select("*")
    .eq("event_id", eventId)
    .order("tier", { ascending: true });

  const divisions = await getEventDivisions(eventId);
  if (divisions.length > 1 && !currentDivisionId) {
    redirect(`/admin/${eventId}/settings?divisionId=${divisions[0].id}`);
  }
  const selectedDivision = currentDivisionId ? divisions.find((d) => d.id === currentDivisionId) : (divisions[0] ?? null);
  const effectiveDivisionId = selectedDivision?.id ?? (divisions.length === 1 ? divisions[0].id : null);

  // Get event details specifically for the Settings Content payload
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  return (
    <>
      <div className="flex">
        <SettingsPageNav />
        <main className="min-w-0 flex-1 pt-6 pb-12">
          <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-ntu-green mb-2">Event Settings</h1>
          <p className="text-lg text-gray-600">
            {event?.name}
            {selectedDivision && (
              <span className="ml-2 text-ntu-green font-medium">
                · {selectedDivision.name ? `${selectedDivision.sport} – ${selectedDivision.name}` : selectedDivision.sport}
              </span>
            )}
          </p>
        </div>

        <SettingsContent 
          eventId={eventId}
          eventName={event?.name || ""}
          initialDivisions={divisions}
          initialEventData={{
            name: event?.name || "",
            sport: event?.sport || "",
            startDate: event?.start_date ? (typeof event.start_date === 'string' ? event.start_date : event.start_date.toISOString()) : "",
            endDate: event?.end_date ? (typeof event.end_date === 'string' ? event.end_date : event.end_date.toISOString()) : "",
            venue: event?.venue || "",
            description: event?.description || "",
            tournamentType: event?.tournament_type || "single_elimination",
          }}
          initialRules={rules || []}
          initialScheduleItems={scheduleItems || []}
          initialSponsors={sponsors || []}
          scheduleNotes={event?.schedule_notes || ""}
          scheduleUpdatedAt={event?.schedule_updated_at || ""}
          contactInfo={event?.contact_info || ""}
          initialRegistrationType={event?.registration_type as 'player' | 'team' | undefined}
          initialIsVisible={event?.is_visible ?? false}
          initialTiebreakerConfig={(event as any)?.tiebreaker_config ?? undefined}
          tournamentType={event?.tournament_type ?? undefined}
        />
          </div>
        </main>
      </div>
    </>
  );
}

