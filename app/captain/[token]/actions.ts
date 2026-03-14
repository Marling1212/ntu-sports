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

export type BlackoutResult = { ok: true } | { ok: false; error: string };

async function getTeamByToken(
  supabase: ReturnType<typeof createServiceClient>,
  token: string
): Promise<{ id: string; event_id: string } | null> {
  const byContains = await supabase
    .from("players")
    .select("id, event_id")
    .eq("type", "team")
    .contains("custom_fields", { captain_token: token })
    .maybeSingle();
  if (byContains.data) return byContains.data;
  const byKey = await supabase
    .from("players")
    .select("id, event_id")
    .eq("type", "team")
    .eq("custom_fields->>captain_token", token)
    .maybeSingle();
  return byKey.data ?? null;
}

export async function upsertCaptainBlackout(
  token: string,
  payload: { id?: string; start_time: string; end_time: string; reason?: string | null }
): Promise<BlackoutResult> {
  const t = token.trim();
  if (!t) return { ok: false, error: "Invalid link." };

  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    return { ok: false, error: "Invalid or expired captain link." };
  }

  const team = await getTeamByToken(supabase, t);
  if (!team) return { ok: false, error: "Invalid or expired captain link." };

  const { data: event } = await supabase
    .from("events")
    .select("captain_blackouts_open, blackout_limit")
    .eq("id", team.event_id)
    .single();
  if (!event?.captain_blackouts_open) {
    return { ok: false, error: "目前未開放填寫不可出賽時段。" };
  }

  const start = payload.start_time?.trim();
  const end = payload.end_time?.trim();
  if (!start || !end) return { ok: false, error: "請填寫開始與結束時間。" };
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return { ok: false, error: "時間格式不正確。" };
  }
  if (endDate <= startDate) return { ok: false, error: "結束時間必須晚於開始時間。" };

  if (payload.id) {
    const { data: existing } = await supabase
      .from("team_blackouts")
      .select("id")
      .eq("id", payload.id)
      .eq("player_id", team.id)
      .eq("event_id", team.event_id)
      .single();
    if (!existing) return { ok: false, error: "找不到該時段。" };
    const { error } = await supabase
      .from("team_blackouts")
      .update({
        start_time: start,
        end_time: end,
        reason: payload.reason?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payload.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const limit = event.blackout_limit != null ? Number(event.blackout_limit) : null;
    if (limit != null && limit >= 0) {
      const { count } = await supabase
        .from("team_blackouts")
        .select("*", { count: "exact", head: true })
        .eq("player_id", team.id)
        .eq("event_id", team.event_id);
      if (count != null && count >= limit) {
        return { ok: false, error: `不可出賽時段已達上限（${limit} 筆）。` };
      }
    }
    const { error } = await supabase.from("team_blackouts").insert({
      event_id: team.event_id,
      player_id: team.id,
      start_time: start,
      end_time: end,
      reason: payload.reason?.trim() || null,
    });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath(`/captain/${t}`);
  return { ok: true };
}

export async function deleteCaptainBlackout(token: string, blackoutId: string): Promise<BlackoutResult> {
  const t = token.trim();
  if (!t) return { ok: false, error: "Invalid link." };

  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    return { ok: false, error: "Invalid or expired captain link." };
  }

  const team = await getTeamByToken(supabase, t);
  if (!team) return { ok: false, error: "Invalid or expired captain link." };

  const { data: event } = await supabase
    .from("events")
    .select("captain_blackouts_open")
    .eq("id", team.event_id)
    .single();
  if (!event?.captain_blackouts_open) {
    return { ok: false, error: "目前未開放填寫不可出賽時段。" };
  }

  const { error } = await supabase
    .from("team_blackouts")
    .delete()
    .eq("id", blackoutId)
    .eq("player_id", team.id)
    .eq("event_id", team.event_id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/captain/${t}`);
  return { ok: true };
}
