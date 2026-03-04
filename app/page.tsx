"use client";

import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/context";
import { useEffect, useState } from "react";
import SkeletonLoader from "@/components/SkeletonLoader";
import LoadingLink from "@/components/LoadingLink";

// Sport icons for badges
const sportIcons: { [key: string]: string } = {
  Tennis: "🎾",
  Soccer: "⚽",
  Basketball: "🏀",
  Volleyball: "🏐",
  Badminton: "🏸",
  TableTennis: "🏓",
  Baseball: "⚾",
  Softball: "🥎",
  Other: "🏆",
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

export interface HomeEvent {
  id: string;
  name: string;
  /** Primary sport for URL (first division or event.sport) */
  linkSport: string;
  /** All sports in this event (one or many), display names */
  sports: string[];
  startDate?: string;
  venue?: string;
}

export default function Home() {
  const { t } = useI18n();
  const [events, setEvents] = useState<HomeEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadEvents() {
      setIsLoading(true);
      try {
        const { data: eventsData } = await supabase
          .from("events")
          .select("id, name, sport, start_date, venue")
          .eq("is_visible", true)
          .order("start_date", { ascending: false });

        const list = eventsData || [];
        if (list.length === 0) {
          setEvents([]);
          return;
        }

        const eventIds = list.map((e) => e.id);
        const { data: divisions } = await supabase
          .from("event_divisions")
          .select("event_id, sport")
          .in("event_id", eventIds)
          .order("display_order", { ascending: true });

        const divisionsByEvent: Record<string, string[]> = {};
        (divisions || []).forEach((d) => {
          if (!divisionsByEvent[d.event_id]) divisionsByEvent[d.event_id] = [];
          if (d.sport && !divisionsByEvent[d.event_id].includes(d.sport)) {
            divisionsByEvent[d.event_id].push(d.sport);
          }
        });

        const homeEvents: HomeEvent[] = list.map((e) => {
          const divSports = divisionsByEvent[e.id] ?? [];
          const sports = divSports.length > 0 ? divSports : (e.sport ? [e.sport] : []);
          const linkSport = sports[0] ?? e.sport ?? "tennis";
          return {
            id: e.id,
            name: e.name ?? "Event",
            linkSport: linkSport.toLowerCase(),
            sports: [...new Set(sports)].map(normalizeSport),
            startDate: e.start_date,
            venue: e.venue ?? undefined,
          };
        });

        setEvents(homeEvents);
      } catch (error) {
        console.error("Error loading events:", error);
        setEvents([]);
      } finally {
        setIsLoading(false);
      }
    }
    loadEvents();
  }, [supabase]);

  return (
    <div className="container mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-12 lg:py-16">
      <div className="text-center mb-4 sm:mb-16 animate-fadeIn">
        <div className="mb-2 sm:mb-6 flex justify-center">
          <div className="w-12 h-12 sm:w-24 sm:h-24 bg-gradient-to-br from-ntu-green to-green-700 rounded-full flex items-center justify-center shadow-lg sm:shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 sm:hover:scale-110">
            <span className="text-lg sm:text-4xl text-white font-bold">NTU</span>
          </div>
        </div>
        <h1 className="text-2xl sm:text-5xl lg:text-6xl font-bold text-ntu-green mb-2 sm:mb-6 leading-tight">
          🏆 {t("home.title")}
        </h1>
        <p className="text-sm sm:text-xl lg:text-2xl text-gray-700 max-w-3xl mx-auto leading-snug sm:leading-relaxed mb-1 sm:mb-6 px-1 sm:px-4">
          {t("home.subtitle")}
        </p>
        <p className="text-xs sm:text-base lg:text-lg text-gray-600 max-w-2xl mx-auto px-1 sm:px-4 hidden sm:block">
          {t("home.description")}
        </p>
      </div>

      <div className="mb-8 sm:mb-12 animate-fadeIn" style={{ animationDelay: "0.2s" }}>
        <h2 className="text-sm sm:text-3xl font-semibold text-gray-500 sm:text-ntu-green mb-0.5 sm:mb-4 text-center">
          {t("home.sports")}
        </h2>
        <p className="text-center text-xs sm:text-base text-gray-400 sm:text-gray-600 mb-2 sm:mb-8 px-2 sm:px-4 hidden sm:block">
          {t("home.sportsDescription")}
        </p>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonLoader key={i} variant="card" className="animate-pulse min-h-[120px] sm:min-h-0" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <p className="text-center text-gray-500 py-8">目前沒有公開賽事</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {events.map((evt, index) => (
              <LoadingLink
                key={evt.id}
                href={`/sports/${evt.linkSport}/events/${evt.id}`}
                className="bg-white rounded-lg sm:rounded-xl shadow-md hover:shadow-xl sm:hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border border-gray-100 group p-4 sm:p-6 animate-scaleIn active:scale-[0.98] text-left"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <h3 className="text-base sm:text-xl font-semibold text-ntu-green mb-2 sm:mb-3 group-hover:underline">
                  {evt.name}
                </h3>
                <div className="flex flex-wrap gap-1.5 mb-2 sm:mb-3">
                  {evt.sports.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-xs sm:text-sm font-medium"
                    >
                      <span>{sportIcons[s] || "🏆"}</span>
                      {s}
                    </span>
                  ))}
                </div>
                {evt.venue && (
                  <p className="text-gray-500 text-xs sm:text-sm truncate" title={evt.venue}>
                    {evt.venue}
                  </p>
                )}
                <div className="text-ntu-green font-medium text-xs sm:text-sm mt-2 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                  {t("home.viewDetails")} <span>→</span>
                </div>
              </LoadingLink>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

