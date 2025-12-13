import { createClient } from "@/lib/supabase/server";
import { getSportMatches, getSportAnnouncements } from "@/lib/utils/getSportEvent";
import SportsPageClient from "@/components/SportsPageClient";
import NavigationButtonsClient from "@/components/NavigationButtonsClient";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function TennisEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();
  
  // Get the specific event
  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .eq("sport", "tennis")
    .maybeSingle();

  // If event not found or not a tennis event, show 404
  if (error || !event) {
    notFound();
  }

  // Tournament start date
  const tournamentStartDate = event.start_date 
    ? new Date(event.start_date) 
    : new Date("2025-11-08T08:00:00+08:00");
  const hasStarted = new Date() >= tournamentStartDate;

  // Fetch data for the event
  const matches = await getSportMatches(event.id);
  const tz = "Asia/Taipei";
  const now = new Date();
  const nowTz = new Date(now.toLocaleString("en-US", { timeZone: tz }));
  
  // Calculate today's date range
  const todayStart = new Date(nowTz);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(nowTz);
  todayEnd.setHours(23, 59, 59, 999);
  
  // Calculate tomorrow's date range
  const nextDayStart = new Date(nowTz);
  nextDayStart.setDate(nextDayStart.getDate() + 1);
  nextDayStart.setHours(0, 0, 0, 0);
  const nextDayEnd = new Date(nextDayStart);
  nextDayEnd.setHours(23, 59, 59, 999);
  
  // Get today's matches
  const todayMatches = (matches || [])
    .filter((m: any) => !!m.scheduled_time)
    .filter((m: any) => {
      const d = new Date(m.scheduled_time);
      const dTz = new Date(d.toLocaleString("en-US", { timeZone: tz }));
      return dTz >= todayStart && dTz <= todayEnd;
    })
    .sort((a: any, b: any) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());
  
  // Check if any of today's matches haven't started yet (scheduled_time > now)
  const hasUpcomingToday = todayMatches.some((m: any) => {
    const matchTime = new Date(m.scheduled_time);
    return matchTime > now && m.status !== "completed";
  });
  
  // Determine which matches to show
  const matchesToShow = hasUpcomingToday ? todayMatches : (matches || [])
    .filter((m: any) => !!m.scheduled_time)
    .filter((m: any) => {
      const d = new Date(m.scheduled_time);
      const dTz = new Date(d.toLocaleString("en-US", { timeZone: tz }));
      return dTz >= nextDayStart && dTz <= nextDayEnd;
    })
    .sort((a: any, b: any) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());
  
  const anns = await getSportAnnouncements(event.id);
  const latest = (anns || [])[0];

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <SportsPageClient
        singleEvent={event}
        hasStarted={hasStarted}
        tournamentStartDate={tournamentStartDate}
        matchesToShow={matchesToShow}
        hasUpcomingToday={hasUpcomingToday}
        latestAnnouncement={latest}
      />

      {/* Navigation Buttons */}
      <NavigationButtonsClient eventId={event.id} sport="tennis" />
    </div>
  );
}

