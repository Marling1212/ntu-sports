import { createClient } from "@/lib/supabase/client";

interface Match {
  id: string;
  round: number;
  status: string;
  winner_id?: string;
}

/**
 * Check if a round is completed and create announcement if needed
 * @param eventId - The event ID
 * @param round - The round number to check
 * @returns Promise<boolean> - Whether announcement was created
 */
export async function checkAndAnnounceRoundCompletion(
  eventId: string,
  round: number
): Promise<boolean> {
  const supabase = createClient();

  try {
    // Get all matches in this round (excluding BYE matches)
    const { data: matches, error: matchesError } = await supabase
      .from("matches")
      .select("id, round, status, winner_id")
      .eq("event_id", eventId)
      .eq("round", round)
      .neq("status", "bye");

    if (matchesError) {
      console.error("Error fetching matches:", matchesError);
      return false;
    }

    if (!matches || matches.length === 0) {
      return false;
    }

    // Check if all matches in this round are completed
    const allCompleted = matches.every(
      (match) => match.status === "completed" && match.winner_id
    );

    if (!allCompleted) {
      return false;
    }

    console.log(`✅ Round ${round} is completed! All ${matches.length} matches done.`);

    // Calculate total rounds to get proper round name
    const { data: allMatches } = await supabase
      .from("matches")
      .select("round")
      .eq("event_id", eventId);

    const totalRounds = allMatches 
      ? Math.max(...allMatches.map((m: any) => m.round)) 
      : round;

    // Get dynamic round name
    const roundName = getRoundName(round, totalRounds);

    // Check if announcement already exists for this round using tracking table
    const { data: existingTracking } = await supabase
      .from("round_completion_announcements")
      .select("id")
      .eq("event_id", eventId)
      .eq("round", round)
      .single();

    if (existingTracking) {
      console.log(`Announcement for ${roundName} already exists.`);
      return false;
    }

    // Get event details
    const { data: event } = await supabase
      .from("events")
      .select("name")
      .eq("id", eventId)
      .single();

    // Create announcement
    const announcementTitle = `🎾 ${roundName} 完賽！`;
    const announcementContent = `${roundName} 的所有比賽已經完成！

${event?.name || "賽事"} - ${roundName} 結果：
✅ 共 ${matches.length} 場比賽完成
🏆 勝者已晉級下一輪

請查看籤表以了解最新賽果和下一輪對戰！`;

    const { data: newAnnouncement, error: announcementError } = await supabase
      .from("announcements")
      .insert({
        event_id: eventId,
        title: announcementTitle,
        content: announcementContent,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (announcementError) {
      console.error("Error creating announcement:", announcementError);
      return false;
    }

    // Track this announcement to prevent duplicates
    await supabase
      .from("round_completion_announcements")
      .insert({
        event_id: eventId,
        round: round,
        announcement_id: newAnnouncement.id,
      });

    console.log(`📢 Announcement created for ${roundName}!`);
    return true;
  } catch (error) {
    console.error("Error in checkAndAnnounceRoundCompletion:", error);
    return false;
  }
}

/**
 * Calculate the total number of rounds for a bracket
 */
export function calculateTotalRounds(totalPlayers: number): number {
  return Math.ceil(Math.log2(totalPlayers));
}

/**
 * Get round name based on round number and total rounds
 */
export function getRoundName(round: number, totalRounds: number): string {
  if (round === totalRounds) return "Final";
  if (round === totalRounds - 1) return "Semifinals";
  if (round === totalRounds - 2) return "Quarterfinals";
  
  const playersInRound = Math.pow(2, totalRounds - round + 1);
  return `Round of ${playersInRound}`;
}

