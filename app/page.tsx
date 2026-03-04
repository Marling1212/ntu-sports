"use client";

import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/context";
import { useEffect, useState } from "react";
import SkeletonLoader from "@/components/SkeletonLoader";
import LoadingLink from "@/components/LoadingLink";

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

const sportColors: { [key: string]: string } = {
  Tennis: "bg-green-500",
  Soccer: "bg-emerald-500",
  Basketball: "bg-orange-500",
  Volleyball: "bg-blue-500",
  Badminton: "bg-yellow-500",
  TableTennis: "bg-red-500",
  Baseball: "bg-indigo-500",
  Softball: "bg-pink-500",
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

interface MultiSportEvent {
  id: string;
  name: string;
  linkSport: string;
  sports: string[];
  venue?: string;
}

export default function Home() {
  const { t } = useI18n();
  const [sportsToShow, setSportsToShow] = useState<string[]>(["Tennis"]);
  const [multiSportEvents, setMultiSportEvents] = useState<MultiSportEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      setIsLoading(true);
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
        setSportsToShow(uniqueSports.length > 0 ? uniqueSports : ["Tennis"]);

        const multi: MultiSportEvent[] = [];
        list.forEach((e) => {
          const divSports = divisionsByEvent[e.id] ?? [];
          const sports = divSports.length > 0 ? divSports : (e.sport ? [e.sport] : []);
          const distinctSports = [...new Set(sports.map((s) => s.toLowerCase()))];
          if (distinctSports.length > 1) {
            multi.push({
              id: e.id,
              name: e.name ?? "Event",
              linkSport: (distinctSports[0] ?? e.sport ?? "tennis").toLowerCase(),
              sports: [...new Set(sports)].map(normalizeSport),
              venue: e.venue ?? undefined,
            });
          }
        });
        setMultiSportEvents(multi);
      } catch (error) {
        console.error("Error loading home data:", error);
        setSportsToShow(["Tennis"]);
        setMultiSportEvents([]);
      } finally {
        setIsLoading(false);
      }
    }
    load();
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

      {/* Sports section: one card per sport */}
      <div className="mb-8 sm:mb-12 animate-fadeIn" style={{ animationDelay: "0.2s" }}>
        <h2 className="text-sm sm:text-3xl font-semibold text-gray-500 sm:text-ntu-green mb-0.5 sm:mb-4 text-center">
          {t("home.sports")}
        </h2>
        <p className="text-center text-xs sm:text-base text-gray-400 sm:text-gray-600 mb-2 sm:mb-8 px-2 sm:px-4 hidden sm:block">
          {t("home.sportsDescription")}
        </p>
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonLoader key={i} variant="card" className="animate-pulse min-h-[88px] sm:min-h-0" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-6">
            {sportsToShow.map((sport, index) => {
              const sportLower = sport.toLowerCase();
              const icon = sportIcons[sport] || "🏆";
              const colorClass = sportColors[sport] || "bg-ntu-green";
              return (
                <LoadingLink
                  key={sport}
                  href={`/sports/${sportLower.replace(/\s+/g, "")}`}
                  className="bg-white rounded-lg sm:rounded-xl shadow-md hover:shadow-xl sm:hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border border-gray-100 group p-3 sm:p-8 animate-scaleIn active:scale-[0.98]"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="text-center">
                    <div
                      className={`w-10 h-10 sm:w-16 sm:h-16 ${colorClass} rounded-lg sm:rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-md sm:shadow-lg`}
                    >
                      <span className="text-2xl sm:text-4xl">{icon}</span>
                    </div>
                    <h3 className="text-sm sm:text-2xl font-semibold text-ntu-green mb-0.5 sm:mb-3">{sport}</h3>
                    <p className="text-gray-500 text-[10px] sm:text-sm leading-tight sm:leading-relaxed mb-1 sm:mb-4 hidden sm:block">
                      {t("home.viewDraw")}
                    </p>
                    <div className="text-gray-400 sm:text-ntu-green font-medium text-[10px] sm:text-sm group-hover:translate-x-1 transition-transform inline-flex items-center gap-0.5 sm:gap-1">
                      <span className="hidden sm:inline">{t("home.viewDetails")}</span>{" "}
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </div>
                </LoadingLink>
              );
            })}
          </div>
        )}
      </div>

      {/* Multi-sport events: only events with more than one distinct sport */}
      {!isLoading && multiSportEvents.length > 0 && (
        <div className="mb-8 sm:mb-12 animate-fadeIn" style={{ animationDelay: "0.3s" }}>
          <h2 className="text-sm sm:text-3xl font-semibold text-gray-500 sm:text-ntu-green mb-0.5 sm:mb-4 text-center">
            綜合賽事 / Multi-sport events
          </h2>
          <p className="text-center text-xs sm:text-base text-gray-400 sm:text-gray-600 mb-2 sm:mb-8 px-2 sm:px-4">
            同一賽事包含多種運動項目
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {multiSportEvents.map((evt, index) => (
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
        </div>
      )}
    </div>
  );
}
