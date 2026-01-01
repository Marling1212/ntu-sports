import { createClient } from "@/lib/supabase/server";
import { getSportMatches, getSportAnnouncements } from "@/lib/utils/getSportEvent";
import SportsPageClient from "@/components/SportsPageClient";
import EventsListClient from "@/components/EventsListClient";
import NavigationButtonsClient from "@/components/NavigationButtonsClient";

export default async function TennisPage() {
  const supabase = await createClient();
  
  // Get all active Tennis events (DB stores sport in lowercase)
  // Only get visible events for public display
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .eq("sport", "tennis")
    .eq("is_visible", true)
    .order("start_date", { ascending: false });

  const activeEvents = events || [];

  // If only one event, show it directly
  // If multiple events, show event list
  const singleEvent = activeEvents.length === 1 ? activeEvents[0] : null;

  // Tournament start date: November 8, 2025 at 08:00 AM Taiwan time (114 academic year)
  // Format: YYYY-MM-DDTHH:MM:SS with explicit timezone (+08:00 for Taiwan)
  const tournamentStartDate = singleEvent?.start_date 
    ? new Date(singleEvent.start_date) 
    : new Date("2025-11-08T08:00:00+08:00");
  const hasStarted = new Date() >= tournamentStartDate;

  // Multiple events - show event list
  if (activeEvents.length > 1) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <EventsListClient events={activeEvents} />
      </div>
    );
  }

  // Single event - show event intro page
  // Handle case when no events exist
  if (!singleEvent) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">No Tennis Events Found</h1>
          <p className="text-gray-600">There are currently no active tennis events.</p>
        </div>
        <NavigationButtonsClient />
      </div>
    );
  }

  // Fetch data for single event
  const matches = await getSportMatches(singleEvent.id);
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
  
  const anns = await getSportAnnouncements(singleEvent.id);
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
      />

      {/* Navigation Buttons */}
      <NavigationButtonsClient eventId={singleEvent.id} sport="tennis" />
    </div>
  );
}

