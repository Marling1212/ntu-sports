export interface Player {
  id: string;
  name: string;
  seed?: number;
  school?: string;
}

/** Playoff bracket slot: seed (1-based) and group number when match uses seed placeholders. */
export interface SlotPlaceholder {
  seed: number;
  group: number;
}

export interface Match {
  id: string;
  round: number;
  matchNumber: number;
  /** Season play: round-robin group (1-based). */
  group_number?: number | null;
  player1?: Player | null;
  player2?: Player | null;
  /** When set, bracket shows "Seed N Group X" (or resolved name from standings) instead of player1. */
  slot1?: SlotPlaceholder | null;
  /** When set, bracket shows "Seed N Group X" (or resolved name from standings) instead of player2. */
  slot2?: SlotPlaceholder | null;
  winner?: Player | null;
  score?: string;
  status: "upcoming" | "live" | "completed" | "bye" | "delayed" | "forfeit" | "walkover";
}

export interface TournamentBracketProps {
  players: Player[];
  matches: Match[];
  sportName?: string;
}


