"use client";

import { createContext, useContext, ReactNode } from "react";

export interface EventNavState {
  /** When true, regular season is complete; show Playoffs as primary in nav and defaults. */
  regularSeasonComplete?: boolean;
  tournamentType?: string;
}

const EventNavContext = createContext<EventNavState>({});

export function EventNavProvider({
  children,
  regularSeasonComplete,
  tournamentType,
}: {
  children: ReactNode;
  regularSeasonComplete?: boolean;
  tournamentType?: string;
}) {
  return (
    <EventNavContext.Provider value={{ regularSeasonComplete, tournamentType }}>
      {children}
    </EventNavContext.Provider>
  );
}

export function useEventNav(): EventNavState {
  return useContext(EventNavContext);
}
