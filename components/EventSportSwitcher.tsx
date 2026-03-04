"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sportIcons: { [key: string]: string } = {
  tennis: "🎾",
  basketball: "🏀",
  volleyball: "🏐",
  badminton: "🏸",
  soccer: "⚽",
  tabletennis: "🏓",
  baseball: "⚾",
  softball: "🥎",
  other: "🏆",
};

interface EventSportSwitcherProps {
  /** Distinct sports in this event (slug + display label). */
  sports: { slug: string; label: string }[];
}

export default function EventSportSwitcher({ sports }: EventSportSwitcherProps) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const currentSport = segments[1]?.toLowerCase() ?? "";

  if (sports.length === 0) return null;

  return (
    <div className="bg-ntu-green/10 border-b-2 border-ntu-green shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <p className="text-sm font-medium text-ntu-green mb-2">View by sport / 依運動項目查看</p>
        <div className="flex flex-wrap gap-2">
          {sports.map(({ slug, label }) => {
            const href = pathname.replace(/\/sports\/[^/]+/, `/sports/${slug}`);
            const isActive = currentSport === slug.toLowerCase();
            const icon = sportIcons[slug.toLowerCase()] ?? "🏆";
            return (
              <Link
                key={slug}
                href={href}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-ntu-green text-white shadow"
                    : "bg-white text-gray-700 border-2 border-gray-200 hover:border-ntu-green hover:text-ntu-green"
                }`}
              >
                <span className="text-lg">{icon}</span>
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
