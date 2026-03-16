import { getEventForPublicPage, getSportAnnouncementsForList } from "@/lib/utils/getSportEvent";
import AnnouncementsPageClient from "@/components/AnnouncementsPageClient";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SportEventAnnouncementsPage({
  params,
  searchParams,
}: {
  params: Promise<{ sport: string; eventId: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { sport, eventId } = await params;
  const { preview } = await searchParams;
  const sportParam = sport.toLowerCase();

  const event = await getEventForPublicPage(eventId, sportParam, { preview });
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
