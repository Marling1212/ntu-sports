import { getEventByIdAndSport, getSportAnnouncementsForList } from "@/lib/utils/getSportEvent";
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
      <div className="pb-[max(2rem,env(safe-area-inset-bottom)+140px)]">
        <AnnouncementsPageClient announcements={announcements} />
      </div>
    </>
  );
}
