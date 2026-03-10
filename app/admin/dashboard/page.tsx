import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardContent from "@/components/admin/DashboardContent";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  // Check if user is a platform admin
  const { data: platformAdmin } = await supabase
    .from("platform_admins")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const isPlatformAdmin = !!platformAdmin;

  // Get events where user is an organizer
  const { data: organizers, error: organizersError } = await supabase
    .from("organizers")
    .select("event_id")
    .eq("user_id", user.id);

  console.log("Organizers:", organizers, "Error:", organizersError);

  let events: any[] = [];
  let divisionsByEventId: Record<string, { id: string; event_id: string; sport: string; name?: string | null; display_order: number }[]> = {};

  if (organizers && organizers.length > 0) {
    const eventIds = organizers.map(org => org.event_id);

    const { data: eventsData, error: eventsError } = await supabase
      .from("events")
      .select("*")
      .in("id", eventIds);

    console.log("Events:", eventsData, "Error:", eventsError);
    events = eventsData || [];

    if (eventIds.length > 0) {
      const { data: divisionsData } = await supabase
        .from("event_divisions")
        .select("id, event_id, sport, name, display_order")
        .in("event_id", eventIds)
        .order("display_order", { ascending: true })
        .order("sport", { ascending: true });
      const divs = divisionsData ?? [];
      divs.forEach((d: any) => {
        if (!divisionsByEventId[d.event_id]) divisionsByEventId[d.event_id] = [];
        divisionsByEventId[d.event_id].push(d);
      });
    }
  }

  return <DashboardContent user={user} initialEvents={events} divisionsByEventId={divisionsByEventId} isPlatformAdmin={isPlatformAdmin} />;
}

