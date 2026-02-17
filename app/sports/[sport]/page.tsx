import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSportMatches, getSportAnnouncements } from "@/lib/utils/getSportEvent";
import SportsPageClient from "@/components/SportsPageClient";
import EventsListClient from "@/components/EventsListClient";
import NavigationButtonsClient from "@/components/NavigationButtonsClient";
import { getLocale, getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SportPage(context: any) {
  const locale = await getLocale();
  const t = getT(locale);
  const supabase = await createClient();
  const params = (context?.params || {}) as { sport?: string };
  const sportParam = (params.sport || "").toLowerCase();
  const sportName = sportParam ? sportParam.charAt(0).toUpperCase() + sportParam.slice(1) : "";

  const { data: events } = await supabase
    .from("events")
    .select("*")
    .eq("sport", sportParam)
    .eq("is_visible", true)
    .order("start_date", { ascending: false });

  const activeEvents = events || [];

  if (activeEvents.length === 0) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">
            {t("sports.noEventsForSport").replace("{sport}", sportName)}
          </h1>
          <p className="text-gray-600 mb-4">
            {t("sports.noEventsForSport").replace("{sport}", sportName)}
          </p>
          <Link href="/" className="text-ntu-green hover:underline font-semibold">
            ← {t("common.backToHome")}
          </Link>
          <div className="mt-8">
            <NavigationButtonsClient sport={sportParam} />
          </div>
        </div>
      </div>
    );
  }

  const singleEvent = activeEvents.length === 1 ? activeEvents[0] : null;
  const tournamentStartDate = singleEvent?.start_date
    ? new Date(singleEvent.start_date)
    : new Date("2025-11-08T08:00:00+08:00");
  const hasStarted = new Date() >= tournamentStartDate;

  if (activeEvents.length > 1) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <EventsListClient events={activeEvents} sport={sportParam} />
      </div>
    );
  }

  const matches = await getSportMatches(singleEvent!.id);
  const tz = "Asia/Taipei";
  const now = new Date();
  const nowTz = new Date(now.toLocaleString("en-US", { timeZone: tz }));
  const todayStart = new Date(nowTz);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(nowTz);
  todayEnd.setHours(23, 59, 59, 999);
  const nextDayStart = new Date(nowTz);
  nextDayStart.setDate(nextDayStart.getDate() + 1);
  nextDayStart.setHours(0, 0, 0, 0);
  const nextDayEnd = new Date(nextDayStart);
  nextDayEnd.setHours(23, 59, 59, 999);

  const todayMatches = (matches || [])
    .filter((m: any) => !!m.scheduled_time)
    .filter((m: any) => {
      const d = new Date(m.scheduled_time);
      const dTz = new Date(d.toLocaleString("en-US", { timeZone: tz }));
      return dTz >= todayStart && dTz <= todayEnd;
    })
    .sort((a: any, b: any) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());

  const hasUpcomingToday = todayMatches.some((m: any) => {
    const matchTime = new Date(m.scheduled_time);
    return matchTime > now && m.status !== "completed";
  });

  const matchesToShow = hasUpcomingToday
    ? todayMatches
    : (matches || [])
        .filter((m: any) => !!m.scheduled_time)
        .filter((m: any) => {
          const d = new Date(m.scheduled_time);
          const dTz = new Date(d.toLocaleString("en-US", { timeZone: tz }));
          return dTz >= nextDayStart && dTz <= nextDayEnd;
        })
        .sort((a: any, b: any) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());

  const anns = await getSportAnnouncements(singleEvent!.id);
  const latest = (anns || [])[0];

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <SportsPageClient
        singleEvent={singleEvent}
        hasStarted={hasStarted}
        tournamentStartDate={tournamentStartDate}
        matchesToShow={matchesToShow}
        hasUpcomingToday={hasUpcomingToday}
        latestAnnouncement={latest}
        eventId={singleEvent!.id}
      />
      <NavigationButtonsClient
        eventId={singleEvent!.id}
        sport={sportParam}
        tournamentType={singleEvent!.tournament_type}
      />
    </div>
  );
}
