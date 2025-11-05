export interface Player {
  id: string;
  name: string;
  seed?: number;
  school?: string;
}

export interface Match {
  id: string;
  round: number;
  matchNumber: number;
  player1?: Player | null;
  player2?: Player | null;
  winner?: Player | null;
  score?: string;
  status: "upcoming" | "live" | "completed" | "bye";
}

export interface TournamentBracketProps {
  players: Player[];
  matches: Match[];
  sportName?: string;
}


