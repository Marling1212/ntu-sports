import { createClient } from "@/lib/supabase/server";
import HomeClient, { MultiSportEvent, SportCardItem } from "@/components/HomeClient";
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
  let sportsData: SportCardItem[] = [];
  let multiSportEvents: MultiSportEvent[] = [];
  let globalSponsors: any[] = [];

  try {
    const { data: eventsData } = await supabase
      .from("events")
      .select("id, name, sport, venue, start_date, end_date")
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
    
    // Always include Soccer and Tennis as primary sports
    const baseSports = uniqueSports.length > 0 ? uniqueSports : ["Soccer", "Tennis"];
    if (!baseSports.includes("Soccer")) baseSports.unshift("Soccer");
    if (!baseSports.includes("Tennis")) baseSports.push("Tennis");

    const now = new Date();
    sportsData = baseSports.map((sport) => {
      const sportLower = sport.toLowerCase();
      const matchingEvents = list.filter((e) => {
        const primary = (e.sport || "").toLowerCase() === sportLower;
        const divSports = (divisionsByEvent[e.id] || []).map((s) => s.toLowerCase());
        return primary || divSports.includes(sportLower);
      });

      // 1. Soccer: Active tournament default per spec
      if (sportLower === "soccer") {
        const activeEvent = matchingEvents.find((e) => {
          if (!e.start_date || !e.end_date) return true;
          const s = new Date(e.start_date);
          const end = new Date(e.end_date);
          return now >= s && now <= end;
        }) || matchingEvents[0];

        return {
          sport,
          status: "in_progress" as const,
          tournamentName: activeEvent?.name || "台大盃",
        };
      }

      // 2. Tennis: Off-season default (or upcoming if an upcoming tournament exists)
      if (sportLower === "tennis") {
        const upcomingEvent = matchingEvents.find((e) => {
          if (!e.start_date) return false;
          return new Date(e.start_date) > now;
        });

        if (upcomingEvent) {
          return {
            sport,
            status: "upcoming" as const,
            tournamentName: upcomingEvent.name || "新生盃",
          };
        }

        return {
          sport,
          status: "off_season" as const,
          tournamentName: undefined,
        };
      }

      // 3. Other Sports: dynamically calculate status
      const activeEvent = matchingEvents.find((e) => {
        if (!e.start_date || !e.end_date) return false;
        return now >= new Date(e.start_date) && now <= new Date(e.end_date);
      });
      if (activeEvent) {
        return {
          sport,
          status: "in_progress" as const,
          tournamentName: activeEvent.name,
        };
      }

      const upcomingEvent = matchingEvents.find((e) => {
        if (!e.start_date) return false;
        return new Date(e.start_date) > now;
      });
      if (upcomingEvent) {
        return {
          sport,
          status: "upcoming" as const,
          tournamentName: upcomingEvent.name,
        };
      }

      return {
        sport,
        status: "off_season" as const,
        tournamentName: undefined,
      };
    });

    sportsToShow = baseSports;

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

  return (
    <HomeClient
      sportsToShow={sportsToShow}
      sportsData={sportsData}
      multiSportEvents={multiSportEvents}
      globalSponsors={globalSponsors}
    />
  );
}
