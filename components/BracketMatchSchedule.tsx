import { getLocale, getT } from "@/lib/i18n/server";
import BracketMatchScheduleClient from "./BracketMatchScheduleClient";

interface MatchRow {
  id: string;
  round?: number | string | null;
  scheduled_time?: string | null;
  court?: string | null;
  slot?: { code?: string | null } | null;
  status?: string | null;
  player1?: { id: string; name: string } | null;
  player2?: { id: string; name: string } | null;
  score1?: number | null;
  score2?: number | null;
}

interface BracketMatchScheduleProps {
  matches: MatchRow[];
  sportSlug: string;
  eventName?: string | null;
  sponsors?: any[] | null;
}

const sportIcons: Record<string, string> = {
  tennis: "🎾",
  soccer: "⚽",
  basketball: "🏀",
  volleyball: "🏐",
  badminton: "🏸",
  tabletennis: "🏓",
  baseball: "⚾",
  softball: "🥎",
};

/** Full list of bracket matches (round, time, court, matchup, score, status). Used on Schedule page for bracket events. */
export default async function BracketMatchSchedule({
  matches,
  sportSlug,
  eventName,
  sponsors,
}: BracketMatchScheduleProps) {
  const locale = await getLocale();
  const t = getT(locale);
  const sportIcon = sportIcons[sportSlug.toLowerCase()] || "🏆";

  const noBye = matches.filter((m) => m.status !== "bye");
  const sorted = [...noBye].sort((a, b) => {
    const at = a.scheduled_time ? new Date(a.scheduled_time).getTime() : 0;
    const bt = b.scheduled_time ? new Date(b.scheduled_time).getTime() : 0;
    if (at !== bt) return at - bt;
    const ar = Number(a.round) || 0;
    const br = Number(b.round) || 0;
    return ar - br;
  });

  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <h1 className="text-lg sm:text-2xl font-bold text-slate-900 mb-1 sm:mb-2">
          {sportIcon} {eventName || t("schedule.pageTitleWithSport").replace("{sport}", sportSlug)}
        </h1>
        {sponsors && sponsors.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-500">
            <span>Supported by</span>
            {sponsors.map((s) => (
              <div
                key={s.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-50 border border-slate-200"
              >
                {s.logo_url ? (
                  <img
                    src={s.logo_url}
                    alt={s.name}
                    className="w-4 h-4 rounded-full object-contain"
                  />
                ) : (
                  <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[9px] font-bold">
                    {s.name.charAt(0)}
                  </span>
                )}
                <span className="font-medium text-slate-700">{s.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <BracketMatchScheduleClient matches={sorted} sportSlug={sportSlug} />
    </div>
  );
}
