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
  const t = token.trim();
  if (!t) {
    return { ok: false, error: "Invalid link." };
  }

  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    return { ok: false, error: "Invalid or expired captain link." };
  }

  let team: { id: string; event_id: string } | null = null;
  const byContains = await supabase
    .from("players")
    .select("id, event_id")
    .eq("type", "team")
    .contains("custom_fields", { captain_token: t })
    .maybeSingle();
  if (byContains.data) team = byContains.data;
  if (!team) {
    const byKey = await supabase
      .from("players")
      .select("id, event_id")
      .eq("type", "team")
      .eq("custom_fields->>captain_token", t)
      .maybeSingle();
    if (byKey.data) team = byKey.data;
  }

  if (!team) {
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

  revalidatePath(`/captain/${t}`);
  return { ok: true };
}
