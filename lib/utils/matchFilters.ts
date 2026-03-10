export interface SortedMatchData {
  todayStart: Date;
  todayEnd: Date;
  nextDayStart: Date;
  nextDayEnd: Date;
  todayMatches: any[];
  hasUpcomingToday: boolean;
  matchesToShow: any[];
  titleKey: string;
  emptyMessageKey: string;
}

export function processMatchesForDisplay(matches: any[] | null): SortedMatchData {
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
  
  return {
    todayStart,
    todayEnd,
    nextDayStart,
    nextDayEnd,
    todayMatches,
    hasUpcomingToday,
    matchesToShow,
    titleKey: hasUpcomingToday ? "sports.todayScheduleWithSport" : "sports.tomorrowScheduleWithSport",
    emptyMessageKey: hasUpcomingToday ? "sports.noMatchesToday" : "sports.noMatchesTomorrow"
  };
}
