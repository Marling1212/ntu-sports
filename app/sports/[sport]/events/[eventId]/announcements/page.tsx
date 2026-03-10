import { getEventByIdAndSport, getSportAnnouncementsForList } from "@/lib/utils/getSportEvent";
import PublicNavbar from "@/components/PublicNavbar";
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
      <PublicNavbar eventName={event.name} tournamentType={event.tournament_type} />
      <div className="pb-[max(2rem,env(safe-area-inset-bottom)+100px)]">
        <AnnouncementsPageClient announcements={announcements} />
      </div>
    </>
  );
}
