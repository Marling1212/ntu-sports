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

/**
 * Add a weekly blackout row from an event slot template — same data as admin Registrations → team row.
 */
export async function addCaptainBlackoutTemplate(token: string, slotTemplateId: string): Promise<BlackoutResult> {
  const t = token.trim();
  if (!t) return { ok: false, error: "Invalid link." };
  if (!slotTemplateId?.trim()) return { ok: false, error: "請選擇時段。" };

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

  const { data: slotTemplate, error: slotErr } = await supabase
    .from("event_slot_templates")
    .select("id, event_id, day_of_week, start_time, end_time")
    .eq("id", slotTemplateId)
    .eq("event_id", team.event_id)
    .maybeSingle();
  if (slotErr || !slotTemplate) {
    return { ok: false, error: "找不到該時段模板。" };
  }

  const limit = event.blackout_limit != null ? Number(event.blackout_limit) : null;
  if (limit != null && limit >= 0) {
    const { count } = await supabase
      .from("team_blackout_templates")
      .select("*", { count: "exact", head: true })
      .eq("player_id", team.id)
      .eq("event_id", team.event_id);
    if (count != null && count >= limit) {
      return { ok: false, error: `不可出賽時段已達上限（${limit} 筆）。` };
    }
  }

  const { error: insErr } = await supabase.from("team_blackout_templates").insert({
    event_id: team.event_id,
    player_id: team.id,
    day_of_week: slotTemplate.day_of_week,
    start_time: slotTemplate.start_time,
    end_time: slotTemplate.end_time,
  });
  if (insErr) return { ok: false, error: insErr.message };

  revalidatePath(`/captain/${t}`);
  return { ok: true };
}

export async function deleteCaptainBlackoutTemplate(token: string, templateId: string): Promise<BlackoutResult> {
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
    .from("team_blackout_templates")
    .delete()
    .eq("id", templateId)
    .eq("player_id", team.id)
    .eq("event_id", team.event_id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/captain/${t}`);
  return { ok: true };
}
