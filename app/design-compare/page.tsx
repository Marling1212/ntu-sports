"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import LandingVariants from "@/components/design-variants/LandingVariants";
import SeasonPlayDisplay from "@/components/SeasonPlayDisplay";
import type { DesignVariant } from "@/components/design-variants/designThemes";
import type { Match, Player } from "@/types/tournament";
import LoadingSpinner from "@/components/LoadingSpinner";

// Minimal mock data for Season Play comparison when no event is available
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

const VARIANTS: { id: DesignVariant; label: string }[] = [
  { id: "modern", label: "A — Modern & Minimal" },
  { id: "varsity", label: "B — High Energy / Varsity" },
  { id: "dashboard", label: "C — Dashboard / Utility" },
];

export default function DesignComparePage() {
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
        // keep default sports
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="sticky top-0 z-40 bg-gray-800 text-white shadow-lg">
        <div className="container mx-auto px-4 py-3">
          <h1 className="text-lg font-bold">Phase 3: Design System Comparison</h1>
          <p className="text-sm text-gray-300 mt-1">
            Landing + Season Play — compare Version A (Modern), B (Varsity), C (Dashboard) side by side.
          </p>
        </div>
      </div>

      {/* Landing variants — 3 columns */}
      <section className="container mx-auto px-4 py-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Landing Page</h2>
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {VARIANTS.map(({ id, label }) => (
              <div key={id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700">
                  {label}
                </div>
                <div className="min-h-[320px]">
                  <LandingVariants variant={id} sportsToShow={sportsToShow} isLoading={false} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Season Play variants — 3 columns with mock data */}
      <section className="container mx-auto px-4 py-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Season Play Display (mock data)</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {VARIANTS.map(({ id, label }) => (
            <div key={id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700">
                {label}
              </div>
              <div className="p-4 min-h-[400px]">
                <SeasonPlayDisplay
                  matches={mockMatches}
                  players={mockPlayers}
                  sportName="Soccer"
                  designVariant={id}
                  visibleTabs={{ regular: true, standings: true, playoffs: false }}
                  defaultView="regular"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="container mx-auto px-4 py-6 text-center text-sm text-gray-500">
        Use these variants to choose a design direction. Apply the chosen theme globally via layout/globals or by passing designVariant where needed.
      </footer>
    </div>
  );
}
