"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import LandingVariants from "@/components/design-variants/LandingVariants";
import SeasonPlayDisplay from "@/components/SeasonPlayDisplay";
import type { DesignVariant } from "@/components/design-variants/designThemes";
import type { Match, Player } from "@/types/tournament";
import LoadingSpinner from "@/components/LoadingSpinner";

const VALID_VARIANTS: DesignVariant[] = [
  "modern",
  "varsity",
  "dashboard",
  "editorial",
  "mobile",
  "neobrutalist",
  "glass",
  "split",
  "dark",
  "brutal-green",
  "brutal-rounded",
  "brutal-twocolor",
  "brutal-sections",
  "brutal-inverted",
];
const LABELS: Record<DesignVariant, string> = {
  modern: "A — Modern & Minimal",
  varsity: "B — High Energy / Varsity",
  dashboard: "C — Dashboard / Utility",
  editorial: "D — Editorial / Magazine",
  mobile: "E — Mobile-first / App-like",
  neobrutalist: "F — Neobrutalist / Bold",
  glass: "G — Glassmorphism / Soft",
  split: "H — Split / Asymmetric",
  dark: "I — Dark / Arena",
  "brutal-green": "J — Brutal + NTU Green",
  "brutal-rounded": "K — Rounded Brutalist",
  "brutal-twocolor": "L — Two-Color Only",
  "brutal-sections": "M — Brutal + Section Accents",
  "brutal-inverted": "N — Inverted Brutalist",
};

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

export default function DesignVariantPage() {
  const params = useParams();
  const slug = typeof params?.variant === "string" ? params.variant : "";
  const variant: DesignVariant | null = VALID_VARIANTS.includes(slug as DesignVariant) ? (slug as DesignVariant) : null;

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

  if (!variant) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Unknown variant. Choose one:</p>
          <Link href="/design-compare" className="text-ntu-green font-medium hover:underline">
            ← Back to design compare
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Small bar: back + label */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/design-compare" className="text-ntu-green font-medium hover:underline">
            ← All variants
          </Link>
          <span className="text-sm font-semibold text-gray-700">{LABELS[variant]}</span>
        </div>
      </div>

      {/* Full-width Landing */}
      <section className="w-full">
        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : (
          <LandingVariants variant={variant} sportsToShow={sportsToShow} isLoading={false} />
        )}
      </section>

      {/* Full-width Season Play */}
      <section className={`w-full container mx-auto px-4 py-10 ${variant === "dark" || variant === "brutal-inverted" ? "bg-gray-900" : ""}`}>
        <h2 className={`text-xl font-semibold mb-4 ${variant === "dark" || variant === "brutal-inverted" ? "text-gray-200" : "text-gray-800"}`}>
          Season Play (mock data)
        </h2>
        <SeasonPlayDisplay
          matches={mockMatches}
          players={mockPlayers}
          sportName="Soccer"
          designVariant={variant}
          visibleTabs={{ regular: true, standings: true, playoffs: false }}
          defaultView="regular"
        />
      </section>
    </div>
  );
}
