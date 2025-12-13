import { createClient } from "@/lib/supabase/server";
import { getTennisAnnouncements } from "@/lib/utils/getTennisEvent";
import TennisNavbarClient from "@/components/TennisNavbarClient";
import AnnouncementsPageClient from "@/components/AnnouncementsPageClient";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function TennisEventAnnouncementsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();
  
  // Get the specific event
  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .eq("sport", "tennis")
    .maybeSingle();

  // If event not found or not a tennis event, show 404
  if (error || !event) {
    notFound();
  }

  const announcements = await getTennisAnnouncements(event.id);

  return (
    <>
      <TennisNavbarClient eventName={event.name} tournamentType={event.tournament_type} />
      <AnnouncementsPageClient announcements={announcements} />
    </>
  );
}

