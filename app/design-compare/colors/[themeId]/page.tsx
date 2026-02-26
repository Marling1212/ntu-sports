"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import LandingVariants from "@/components/design-variants/LandingVariants";
import SeasonPlayDisplay from "@/components/SeasonPlayDisplay";
import LoadingSpinner from "@/components/LoadingSpinner";
import { getColorTheme, getThemeOverrideCss } from "../colorThemes";
import type { Match, Player } from "@/types/tournament";

const mockPlayers: Player[] = [
  { id: "p1", name: "Team Alpha", seed: 1, school: "Dept A" },
  { id: "p2", name: "Team Beta", seed: 2, school: "Dept B" },
  { id: "p3", name: "Team Gamma", school: "Dept C" },
  { id: "p4", name: "Team Delta", school: "Dept D" },
];
const mockMatches: (Match & { group_number?: number })[] = [
  {
    id: "m1",
    round: 0,
    matchNumber: 1,
    player1: mockPlayers[0],
    player2: mockPlayers[1],
    winner: mockPlayers[0],
    score: "2-1",
    status: "completed",
    group_number: 1,
  },
  {
    id: "m2",
    round: 0,
    matchNumber: 2,
    player1: mockPlayers[2],
    player2: mockPlayers[3],
    winner: null,
    score: undefined,
    status: "upcoming",
    group_number: 1,
  },
];

export default function ColorThemeDemoPage() {
  const params = useParams();
  const themeId = (params?.themeId as string) || "";
  const theme = getColorTheme(themeId);
  const [sportsToShow, setSportsToShow] = useState<string[]>(["Tennis", "Basketball", "Soccer", "Volleyball"]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data: events } = await supabase
          .from("events")
          .select("sport")
          .eq("is_visible", true)
          .not("sport", "is", null);
        const unique = Array.from(
          new Set(
            (events || [])
              .map((e) => (e.sport ? e.sport.charAt(0).toUpperCase() + e.sport.slice(1).toLowerCase() : null))
              .filter(Boolean) as string[]
          )
        ).sort();
        if (unique.length > 0) setSportsToShow(unique);
      } catch {
        // keep default
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (!theme) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Theme not found.</p>
          <Link href="/design-compare/colors" className="text-ntu-green underline">
            Back to color themes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      data-color-theme={theme.id}
      style={{ backgroundColor: theme.surface }}
    >
      <style dangerouslySetInnerHTML={{ __html: getThemeOverrideCss(theme) }} />
      {/* Sticky bar: back + label (same as design variant page) */}
      <div
        className="sticky top-0 z-40 border-b border-gray-200 shadow-sm text-white"
        style={{ backgroundColor: theme.primary }}
      >
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/design-compare/colors" className="font-medium hover:opacity-90">
            ← All color themes
          </Link>
          <span className="text-sm font-semibold opacity-95">
            {theme.name} / {theme.nameZh}
          </span>
        </div>
      </div>

      {/* Full-width Landing (same as variant page) */}
      <section className="w-full">
        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : (
          <LandingVariants variant="mobile" sportsToShow={sportsToShow} isLoading={false} />
        )}
      </section>

      {/* Full-width Season Play (same as variant page) */}
      <section className="w-full container mx-auto px-4 py-10">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          Season Play (mock data)
        </h2>
        <SeasonPlayDisplay
          matches={mockMatches}
          players={mockPlayers}
          sportName="Soccer"
          designVariant="mobile"
          visibleTabs={{ regular: true, standings: true, playoffs: false }}
          defaultView="regular"
        />
      </section>
    </div>
  );
}
