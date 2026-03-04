import { createClient } from "@/lib/supabase/server";
import { getEventByIdAndSport, getDivisionIdsForEventAndSport, getSportMatches } from "@/lib/utils/getSportEvent";
import { EventNavProvider } from "@/lib/context/EventNavContext";
import BackToTop from "@/components/BackToTop";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SportEventLayout({
  params,
  children,
}: {
  params: Promise<{ sport: string; eventId: string }>;
  children: React.ReactNode;
}) {
  const { sport, eventId } = await params;
  const sportParam = sport.toLowerCase();
  const event = await getEventByIdAndSport(eventId, sportParam);
  const divisionIds = event ? await getDivisionIdsForEventAndSport(event.id, sportParam) : [];

  let regularSeasonComplete: boolean | undefined;
  if (event?.tournament_type === "season_play") {
    const dbMatches = await getSportMatches(eventId, divisionIds.length > 0 ? divisionIds : undefined);
    const regularMatches = (dbMatches || []).filter((m: { round: number }) => m.round === 0);
    regularSeasonComplete =
      regularMatches.length > 0 &&
      regularMatches.every((m: { status: string }) => m.status === "completed" || m.status === "bye");
  }

  return (
    <EventNavProvider
      regularSeasonComplete={regularSeasonComplete}
      tournamentType={event?.tournament_type ?? undefined}
    >
      <div className="pb-20 md:pb-0">{children}</div>
      <BackToTop />
    </EventNavProvider>
  );
}
