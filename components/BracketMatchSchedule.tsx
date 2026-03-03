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
}

/** Full list of bracket matches (round, time, court, matchup, score, status). Used on Schedule page for bracket events. */
export default async function BracketMatchSchedule({
  matches,
  sportSlug,
  eventName,
}: BracketMatchScheduleProps) {
  const locale = await getLocale();
  const t = getT(locale);

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
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-12">
      <div className="mb-4 sm:mb-8">
        <h1 className="text-2xl sm:text-4xl font-bold text-ntu-green mb-1 sm:mb-4">
          {eventName || t("schedule.pageTitleWithSport").replace("{sport}", sportSlug)}
        </h1>
        <p className="text-xs sm:text-lg text-gray-500 sm:text-gray-600 hidden sm:block">{t("schedule.matchSchedulesDesc")}</p>
      </div>

      <BracketMatchScheduleClient matches={sorted} sportSlug={sportSlug} />
    </div>
  );
}
