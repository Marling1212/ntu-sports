"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/context";
import { useEffect, useState } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import SkeletonLoader from "@/components/SkeletonLoader";
import LoadingLink from "@/components/LoadingLink";

// Sport icons mapping
const sportIcons: { [key: string]: string } = {
  Tennis: "🎾",
  Soccer: "⚽",
  Basketball: "🏀",
  Volleyball: "🏐",
  Badminton: "🏸",
  TableTennis: "🏓",
  Baseball: "⚾",
  Softball: "🥎",
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

export default function Home() {
  const { t } = useI18n();
  const [sportsToShow, setSportsToShow] = useState<string[]>(["Tennis"]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadSports() {
      setIsLoading(true);
      try {
        const { data: events } = await supabase
          .from("events")
          .select("id, sport")
          .eq("is_visible", true);

        const visibleEventIds = (events || []).map((e) => e.id).filter(Boolean);

        const sportsFromEvents = (events || [])
          .map((e) => e.sport)
          .filter((s): s is string => !!s && typeof s === "string");

        let sportsFromDivisions: string[] = [];
        if (visibleEventIds.length > 0) {
          const { data: divisions } = await supabase
            .from("event_divisions")
            .select("sport")
            .in("event_id", visibleEventIds);
          sportsFromDivisions = (divisions || []).map((d) => d.sport).filter((s): s is string => !!s);
        }

        const normalize = (s: string) =>
          s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
        const allSports = [...sportsFromEvents, ...sportsFromDivisions];
        const uniqueSports = Array.from(new Set(allSports.map(normalize))).sort();

        setSportsToShow(uniqueSports.length > 0 ? uniqueSports : ["Tennis"]);
      } catch (error) {
        console.error("Error loading sports:", error);
        setSportsToShow(["Tennis"]);
      } finally {
        setIsLoading(false);
      }
    }
    loadSports();
  }, [supabase]);

  return (
    <div className="container mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-12 lg:py-16">
      {/* Hero: compact on mobile so sport cards appear above the fold */}
      <div className="text-center mb-4 sm:mb-16 animate-fadeIn">
        <div className="mb-2 sm:mb-6 flex justify-center">
          <div className="w-12 h-12 sm:w-24 sm:h-24 bg-gradient-to-br from-ntu-green to-green-700 rounded-full flex items-center justify-center shadow-lg sm:shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 sm:hover:scale-110">
            <span className="text-lg sm:text-4xl text-white font-bold">NTU</span>
          </div>
        </div>
        <h1 className="text-2xl sm:text-5xl lg:text-6xl font-bold text-ntu-green mb-2 sm:mb-6 leading-tight">
          🏆 {t('home.title')}
        </h1>
        <p className="text-sm sm:text-xl lg:text-2xl text-gray-700 max-w-3xl mx-auto leading-snug sm:leading-relaxed mb-1 sm:mb-6 px-1 sm:px-4">
          {t('home.subtitle')}
        </p>
        <p className="text-xs sm:text-base lg:text-lg text-gray-600 max-w-2xl mx-auto px-1 sm:px-4 hidden sm:block">
          {t('home.description')}
        </p>
      </div>

      {/* Sports: labels subtle on mobile so cards are the focus */}
      <div className="mb-8 sm:mb-12 animate-fadeIn" style={{ animationDelay: '0.2s' }}>
        <h2 className="text-sm sm:text-3xl font-semibold text-gray-500 sm:text-ntu-green mb-0.5 sm:mb-4 text-center">
          {t('home.sports')}
        </h2>
        <p className="text-center text-xs sm:text-base text-gray-400 sm:text-gray-600 mb-2 sm:mb-8 px-2 sm:px-4 hidden sm:block">
          {t('home.sportsDescription')}
        </p>
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonLoader
                key={index}
                variant="card"
                className="animate-pulse min-h-[88px] sm:min-h-0"
              />
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
                  href={`/sports/${sportLower}`}
                  className="bg-white rounded-lg sm:rounded-xl shadow-md hover:shadow-xl sm:hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border border-gray-100 group p-3 sm:p-8 animate-scaleIn active:scale-[0.98]"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="text-center">
                    <div className={`w-10 h-10 sm:w-16 sm:h-16 ${colorClass} rounded-lg sm:rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-md sm:shadow-lg`}>
                      <span className="text-2xl sm:text-4xl">{icon}</span>
                    </div>
                    <h3 className="text-sm sm:text-2xl font-semibold text-ntu-green mb-0.5 sm:mb-3">
                      {sport}
                    </h3>
                    <p className="text-gray-500 text-[10px] sm:text-sm leading-tight sm:leading-relaxed mb-1 sm:mb-4 hidden sm:block">
                      {t('home.viewDraw')}
                    </p>
                    <div className="text-gray-400 sm:text-ntu-green font-medium text-[10px] sm:text-sm group-hover:translate-x-1 transition-transform inline-flex items-center gap-0.5 sm:gap-1">
                      <span className="hidden sm:inline">{t('home.viewDetails')}</span> <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </div>
                </LoadingLink>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

