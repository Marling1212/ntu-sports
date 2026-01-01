import { getTennisEvent, getTennisAnnouncements } from "@/lib/utils/getTennisEvent";
import TennisNavbarClient from "@/components/TennisNavbarClient";
import AnnouncementsPageClient from "@/components/AnnouncementsPageClient";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function TennisAnnouncementsPage() {
  const supabase = await createClient();
  
  // Check if there are multiple events (only visible ones)
  const { data: events } = await supabase
    .from("events")
    .select("id")
    .eq("sport", "tennis")
    .eq("is_visible", true);
  
  // If multiple events exist, redirect to event list
  if (events && events.length > 1) {
    redirect("/sports/tennis");
  }
  
  const event = await getTennisEvent();
  const announcements = event ? await getTennisAnnouncements(event.id) : [];

  return (
    <>
      <TennisNavbarClient eventName={event?.name} tournamentType={event?.tournament_type} />
      <AnnouncementsPageClient announcements={announcements} />
    </>
  );
}

