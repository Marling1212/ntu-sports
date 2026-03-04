"use client";

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

  if (!divisions || divisions.length <= 1) return null;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (!id) return;
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
        className="bg-white/20 text-white border border-white/40 rounded px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/50"
      >
        {divisions.map((d) => (
          <option key={d.id} value={d.id} className="text-gray-900">
            {label(d)}
          </option>
        ))}
      </select>
    </div>
  );
}
