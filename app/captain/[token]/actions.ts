"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

export type SubmitRosterRequestResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Validate captain token and submit a roster change request.
 * Uses service_role to bypass RLS (captain has no session).
 */
export async function submitRosterChangeRequest(
  token: string,
  action: "add" | "remove" | "update",
  memberData: Record<string, unknown>,
  requestedBy?: string | null
): Promise<SubmitRosterRequestResult> {
  if (!token.trim()) {
    return { ok: false, error: "Invalid link." };
  }

  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    return { ok: false, error: "Invalid or expired captain link." };
  }

  const { data: team, error: teamError } = await supabase
    .from("players")
    .select("id, event_id")
    .eq("type", "team")
    .contains("custom_fields", { captain_token: token })
    .maybeSingle();

  if (teamError || !team) {
    return { ok: false, error: "Invalid or expired captain link." };
  }

  const { error: insertError } = await supabase.from("roster_change_requests").insert({
    event_id: team.event_id,
    player_id: team.id,
    action,
    member_data: memberData,
    status: "pending",
    requested_by: requestedBy?.trim() || null,
  });

  if (insertError) {
    return { ok: false, error: insertError.message };
  }

  revalidatePath(`/captain/${token}`);
  return { ok: true };
}
