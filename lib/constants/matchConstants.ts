// Special UUID constant to represent a draw/tie result in matches
// This is used when winner_id should indicate a draw instead of a specific player
export const DRAW_WINNER_ID = "00000000-0000-0000-0000-000000000001";

// Helper function to check if a winner_id represents a draw
export function isDraw(winnerId: string | null | undefined): boolean {
  return winnerId === DRAW_WINNER_ID;
}

// Helper function to check if match has a result (winner or draw)
export function hasResult(winnerId: string | null | undefined): boolean {
  return !!winnerId;
}

