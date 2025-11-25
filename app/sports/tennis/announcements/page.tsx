import { getTennisEvent, getTennisAnnouncements } from "@/lib/utils/getTennisEvent";
import TennisNavbarClient from "@/components/TennisNavbarClient";
import AnnouncementsPageClient from "@/components/AnnouncementsPageClient";

export default async function TennisAnnouncementsPage() {
  const event = await getTennisEvent();
  const announcements = event ? await getTennisAnnouncements(event.id) : [];

  return (
    <>
      <TennisNavbarClient eventName={event?.name} tournamentType={event?.tournament_type} />
      <AnnouncementsPageClient announcements={announcements} />
    </>
  );
}

