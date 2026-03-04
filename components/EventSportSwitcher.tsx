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

  if (sports.length <= 1) return null;

  return (
    <div className="bg-gray-50 border-b border-gray-200">
      <div className="container mx-auto px-4 py-2">
        <p className="text-xs text-gray-500 mb-1.5">View by sport / 依運動項目查看</p>
        <div className="flex flex-wrap gap-2">
          {sports.map(({ slug, label }) => {
            const href = pathname.replace(/\/sports\/[^/]+/, `/sports/${slug}`);
            const isActive = currentSport === slug.toLowerCase();
            const icon = sportIcons[slug.toLowerCase()] ?? "🏆";
            return (
              <Link
                key={slug}
                href={href}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-ntu-green text-white"
                    : "bg-white text-gray-700 border border-gray-200 hover:border-ntu-green hover:text-ntu-green"
                }`}
              >
                <span>{icon}</span>
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
