"use client";

import dynamic from "next/dynamic";
import { Player } from "@/types/database";

interface BracketSeedingManagerWrapperProps {
  eventId: string;
  players: Player[];
  matches: any[];
  tournamentType: "single_elimination" | "season_play" | null;
  onSeedingUpdated: () => void;
}

// Dynamically import BracketSeedingManager with SSR disabled
const BracketSeedingManager = dynamic(
  () => import("@/components/admin/BracketSeedingManager"),
  { ssr: false }
);

export default function BracketSeedingManagerWrapper(props: BracketSeedingManagerWrapperProps) {
  return <BracketSeedingManager {...props} />;
}
