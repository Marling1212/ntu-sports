import { getEventByIdAndSport, getDivisionIdsForEventAndSport, getSportMatches, getEventDivisions } from "@/lib/utils/getSportEvent";
import { EventNavProvider } from "@/lib/context/EventNavContext";
import BackToTop from "@/components/BackToTop";
import EventSportSwitcher from "@/components/EventSportSwitcher";
import PublicNavbar from "@/components/PublicNavbar";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const sportLabels: Record<string, string> = {
  tennis: "Tennis",
  basketball: "Basketball",
  volleyball: "Volleyball",
  badminton: "Badminton",
  soccer: "Soccer",
  tabletennis: "Table Tennis",
  baseball: "Baseball",
  softball: "Softball",
  other: "Other",
};

function toLabel(slug: string): string {
  return sportLabels[slug.toLowerCase()] ?? (slug.charAt(0).toUpperCase() + slug.slice(1).toLowerCase());
}

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
      regularMatches.every((m: { status: string }) => m.status === "completed" || m.status === "bye" || m.status === "forfeit" || m.status === "walkover");
  }

  const divisions = event ? await getEventDivisions(event.id) : [];
  const bySport = new Map<string, { slug: string; label: string }>();
  divisions.forEach((d) => {
    const slug = (d.sport ?? "").toLowerCase();
    if (slug && !bySport.has(slug)) bySport.set(slug, { slug, label: toLabel(d.sport) });
  });
  if (bySport.size === 0 && event?.sport) {
    const slug = event.sport.toLowerCase();
    bySport.set(slug, { slug, label: toLabel(event.sport) });
  }
  const distinctSports = Array.from(bySport.values()).sort((a, b) => a.label.localeCompare(b.label));
  const showSwitcher = divisions.length >= 2 && distinctSports.length >= 1;

  return (
    <EventNavProvider
      regularSeasonComplete={regularSeasonComplete}
      tournamentType={event?.tournament_type ?? undefined}
    >
      <PublicNavbar eventName={event?.name || undefined} tournamentType={event?.tournament_type ?? undefined} />
      {showSwitcher && <EventSportSwitcher sports={distinctSports} />}
      <div className="pb-20 md:pb-0">{children}</div>
      <BackToTop />
    </EventNavProvider>
  );
}
