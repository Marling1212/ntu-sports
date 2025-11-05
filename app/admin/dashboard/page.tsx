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

  // Get events where user is an organizer
  const { data: organizers, error: organizersError } = await supabase
    .from("organizers")
    .select("event_id")
    .eq("user_id", user.id);

  console.log("Organizers:", organizers, "Error:", organizersError);

  let events = [];

  if (organizers && organizers.length > 0) {
    const eventIds = organizers.map(org => org.event_id);
    
    const { data: eventsData, error: eventsError } = await supabase
      .from("events")
      .select("*")
      .in("id", eventIds);
    
    console.log("Events:", eventsData, "Error:", eventsError);
    events = eventsData || [];
  }

  return <DashboardContent user={user} initialEvents={events} />;
}

