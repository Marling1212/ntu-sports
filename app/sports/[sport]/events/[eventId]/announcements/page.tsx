import { getEventByIdAndSport, getSportAnnouncementsForList } from "@/lib/utils/getSportEvent";
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

  const event = await getEventByIdAndSport(eventId, sportParam);
  if (!event) notFound();

  const announcements = await getSportAnnouncementsForList(event.id);

  return (
    <>
      <TennisNavbarClient eventName={event.name} tournamentType={event.tournament_type} />
      <AnnouncementsPageClient announcements={announcements} />
    </>
  );
}
