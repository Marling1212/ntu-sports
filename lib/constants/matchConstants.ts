// Special UUID constant to represent a draw/tie result in matches
// This is used in the UI dropdown to indicate user selected "Draw"
// When saved, it will be stored as NULL in the database
export const DRAW_WINNER_ID = "00000000-0000-0000-0000-000000000001";

// Helper function to check if a match is a draw
// A match is a draw if: status is completed, winner_id is null, and scores are equal (if scores exist)
export function isDrawMatch(winnerId: string | null | undefined, status?: string, score1?: string | null, score2?: string | null): boolean {
  // If status is provided, check if completed
  if (status && status !== "completed") return false;
  
  // Winner_id must be null for a draw
  if (winnerId !== null && winnerId !== undefined) return false;
  
  // If scores exist, they should be equal for a draw
  if (score1 !== null && score1 !== undefined && score2 !== null && score2 !== undefined) {
    return score1 === score2;
  }
  
  // If no scores but status is completed and no winner, treat as draw
  return status === "completed";
}

// Helper function to check if winner_id value represents the "Draw" option in UI
export function isDrawOption(winnerId: string | null | undefined): boolean {
  return winnerId === DRAW_WINNER_ID;
}

// Helper function to check if match has a result (winner or draw)
export function hasResult(winnerId: string | null | undefined): boolean {
  return !!winnerId;
}

