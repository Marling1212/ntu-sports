"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";

interface Division {
  id: string;
  sport: string;
  name?: string | null;
  tournament_type?: string;
  display_order?: number;
}

interface DivisionSwitcherProps {
  divisions: Division[];
  currentDivisionId: string | null;
}

export default function DivisionSwitcher({ divisions, currentDivisionId }: DivisionSwitcherProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const navigatingToIdRef = useRef<string | null>(null);

  // Clear loading when the page has finished loading with the new division
  useEffect(() => {
    if (isNavigating && currentDivisionId && currentDivisionId === navigatingToIdRef.current) {
      setIsNavigating(false);
      navigatingToIdRef.current = null;
    }
  }, [isNavigating, currentDivisionId]);

  // Fallback: stop showing loading after 8s in case navigation never completes
  useEffect(() => {
    if (!isNavigating) return;
    const t = setTimeout(() => {
      setIsNavigating(false);
      navigatingToIdRef.current = null;
    }, 8000);
    return () => clearTimeout(t);
  }, [isNavigating]);

  if (!divisions || divisions.length <= 1) return null;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (!id) return;
    navigatingToIdRef.current = id;
    setIsNavigating(true);
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("divisionId", id);
    router.push(`${pathname}?${params.toString()}`);
  };

  const label = (d: Division) => (d.name ? `${d.sport} – ${d.name}` : d.sport);

  return (
    <div className="flex items-center gap-2">
      <span className="text-white text-sm opacity-90">Editing:</span>
      <select
        value={currentDivisionId ?? divisions[0]?.id ?? ""}
        onChange={handleChange}
        disabled={isNavigating}
        className="bg-white/20 text-white border border-white/40 rounded px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-70 disabled:cursor-wait"
      >
        {divisions.map((d) => (
          <option key={d.id} value={d.id} className="text-gray-900">
            {label(d)}
          </option>
        ))}
      </select>
      {isNavigating && (
        <span className="flex items-center gap-1.5 text-white text-sm opacity-95">
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading…
        </span>
      )}
    </div>
  );
}
