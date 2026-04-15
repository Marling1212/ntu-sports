"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";
import { verifyRefereeAccessToken } from "@/lib/utils/refereeAccessToken";
import { DRAW_WINNER_ID } from "@/lib/constants/matchConstants";

export type RefereeUpdateResult = { ok: true } | { ok: false; error: string };

export async function updateRefereeMatchResult(
  token: string,
  matchId: string,
  input: {
    score1: string;
    score2: string;
    winner_id: string;
    status: string;
    playerStats?: Array<{ player_id: string; stat_name: string; stat_value: string }>;
  }
): Promise<RefereeUpdateResult> {
  const claims = verifyRefereeAccessToken(token.trim());
  if (!claims) return { ok: false, error: "Invalid or expired referee link." };

  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    return { ok: false, error: "Referee portal is unavailable." };
  }

  const { data: assigned } = await supabase
    .from("match_referees")
    .select("match_id")
    .eq("match_id", matchId)
    .eq("user_id", claims.userId)
    .maybeSingle();
  if (!assigned) return { ok: false, error: "You are not assigned to this match." };

  const { data: match } = await supabase
    .from("matches")
    .select("id, event_id, player1_id, player2_id")
    .eq("id", matchId)
    .maybeSingle();
  if (!match || match.event_id !== claims.eventId) {
    return { ok: false, error: "Match not found for this event." };
  }

  const normalizedStatus = ["upcoming", "live", "completed", "delayed"].includes(input.status)
    ? input.status
    : "upcoming";
  let winnerId: string | null = input.winner_id || null;
  if (winnerId === DRAW_WINNER_ID) winnerId = null;
  if (winnerId && winnerId !== match.player1_id && winnerId !== match.player2_id) {
    return { ok: false, error: "Winner must be one of the teams in this match." };
  }

  const { error } = await supabase
    .from("matches")
    .update({
      score1: input.score1?.trim() || null,
      score2: input.score2?.trim() || null,
      winner_id: winnerId,
      status: normalizedStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", matchId);

  if (error) return { ok: false, error: error.message };

  const nextAssignmentStatus = normalizedStatus === "completed" ? "completed" : "assigned";
  await supabase
    .from("match_referees")
    .update({ assignment_status: nextAssignmentStatus })
    .eq("match_id", matchId)
    .eq("user_id", claims.userId);

  const statsInput = (input.playerStats ?? []).filter(
    (row) => row?.player_id && row?.stat_name
  );
  const statNames = Array.from(new Set(statsInput.map((s) => s.stat_name)));
  const playerIds = Array.from(new Set(statsInput.map((s) => s.player_id)));
  if (statNames.length > 0 && playerIds.length > 0) {
    const { error: deleteErr } = await supabase
      .from("match_player_stats")
      .delete()
      .eq("match_id", matchId)
      .in("player_id", playerIds)
      .in("stat_name", statNames);
    if (deleteErr) return { ok: false, error: deleteErr.message };

    const insertRows = statsInput
      .map((row) => ({
        match_id: matchId,
        player_id: row.player_id,
        stat_name: row.stat_name,
        stat_value: row.stat_value?.trim() ?? "",
      }))
      .filter((row) => row.stat_value !== "");
    if (insertRows.length > 0) {
      const { error: insertErr } = await supabase.from("match_player_stats").insert(insertRows);
      if (insertErr) return { ok: false, error: insertErr.message };
    }
  }

  revalidatePath(`/referee/${token}`);
  return { ok: true };
}
