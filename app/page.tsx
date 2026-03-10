import { createClient } from "@/lib/supabase/server";
import HomeClient, { MultiSportEvent } from "@/components/HomeClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "NTU Sports | 臺大體育賽事",
  description: "NTU Sports Tournament Tracker. View brackets, schedules, and standings for all NTU sports events.",
  openGraph: {
    title: "NTU Sports | 臺大體育賽事",
    description: "NTU Sports Tournament Tracker. View brackets, schedules, and standings for all NTU sports events.",
    type: "website",
  },
};

const sportLabels: { [key: string]: string } = {
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

function normalizeSport(s: string): string {
  const lower = s.toLowerCase();
  return sportLabels[lower] ?? (s.charAt(0).toUpperCase() + s.slice(1).toLowerCase());
}

export default async function Home() {
  const supabase = await createClient();

  let sportsToShow: string[] = ["Tennis"];
  let multiSportEvents: MultiSportEvent[] = [];
  let globalSponsors: any[] = [];

  try {
    const { data: eventsData } = await supabase
      .from("events")
      .select("id, name, sport, venue")
      .eq("is_visible", true);

    const list = eventsData || [];
    const visibleEventIds = list.map((e) => e.id).filter(Boolean);

    let divisions: { event_id: string; sport: string }[] = [];
    if (visibleEventIds.length > 0) {
      const { data: divData } = await supabase
        .from("event_divisions")
        .select("event_id, sport")
        .in("event_id", visibleEventIds)
        .order("display_order", { ascending: true });
      divisions = divData ?? [];
    }

    const divisionsByEvent: Record<string, string[]> = {};
    divisions.forEach((d) => {
      if (!divisionsByEvent[d.event_id]) divisionsByEvent[d.event_id] = [];
      if (d.sport && !divisionsByEvent[d.event_id].includes(d.sport)) {
        divisionsByEvent[d.event_id].push(d.sport);
      }
    });

    const sportsFromEvents = list
      .map((e) => e.sport)
      .filter((s): s is string => !!s && typeof s === "string");
    const sportsFromDivisions = divisions.map((d) => d.sport).filter((s): s is string => !!s);
    const allSports = [...sportsFromEvents, ...sportsFromDivisions];
    const uniqueSports = Array.from(new Set(allSports.map((s) => normalizeSport(s)))).sort();
    
    sportsToShow = uniqueSports.length > 0 ? uniqueSports : ["Tennis"];

    list.forEach((e) => {
      const divSports = divisionsByEvent[e.id] ?? [];
      const sports = divSports.length > 0 ? divSports : (e.sport ? [e.sport] : []);
      const distinctSports = [...new Set(sports.map((s) => s.toLowerCase()))];
      if (distinctSports.length > 1) {
        multiSportEvents.push({
          id: e.id,
          name: e.name ?? "Event",
          linkSport: (distinctSports[0] ?? e.sport ?? "tennis").toLowerCase(),
          sports: [...new Set(sports)].map(normalizeSport),
          venue: e.venue ?? undefined,
        });
      }
    });

    const { data: sponsorsData } = await supabase
      .from("sponsors")
      .select("*")
      .is("event_id", null)
      .order("tier", { ascending: true })
      .order("name", { ascending: true });
    
    globalSponsors = sponsorsData || [];

  } catch (error) {
    console.error("Error loading home data:", error);
  }

  return <HomeClient sportsToShow={sportsToShow} multiSportEvents={multiSportEvents} globalSponsors={globalSponsors} />;
}
