import { createClient } from "@/lib/supabase/server";
import { getSportAnnouncements } from "@/lib/utils/getSportEvent";
import TennisNavbarClient from "@/components/TennisNavbarClient";
import AnnouncementsPageClient from "@/components/AnnouncementsPageClient";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SportEventAnnouncementsPage({
  params,
}: {
  params: Promise<{ sport: string; eventId: string }>;
}) {
  const { sport, eventId } = await params;
  const sportParam = sport.toLowerCase();
  const supabase = await createClient();

  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .eq("sport", sportParam)
    .eq("is_visible", true)
    .maybeSingle();

  if (error || !event) {
    notFound();
  }

  const announcements = await getSportAnnouncements(event.id);

  return (
    <>
      <TennisNavbarClient eventName={event.name} tournamentType={event.tournament_type} />
      <AnnouncementsPageClient announcements={announcements} />
    </>
  );
}
