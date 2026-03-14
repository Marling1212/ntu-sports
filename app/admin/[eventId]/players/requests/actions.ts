"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ResolveResult = { ok: true } | { ok: false; error: string };

export async function approveRequest(requestId: string, eventId: string): Promise<ResolveResult> {
  const supabase = await createClient();
  const { data: req, error: fetchErr } = await supabase
    .from("roster_change_requests")
    .select("*")
    .eq("id", requestId)
    .eq("event_id", eventId)
    .eq("status", "pending")
    .single();

  if (fetchErr || !req) {
    return { ok: false, error: "找不到該申請或已處理。" };
  }

  const playerId = req.player_id as string;
  const action = req.action as string;
  const memberData = (req.member_data || {}) as Record<string, unknown>;

  if (action === "add") {
    const name = memberData.name as string;
    const jerseyNumber = memberData.jersey_number as number | undefined;
    const { error: insertErr } = await supabase.from("team_members").insert({
      player_id: playerId,
      name: name ?? "",
      ...(jerseyNumber != null && !isNaN(Number(jerseyNumber)) && { jersey_number: Number(jerseyNumber) }),
    });
    if (insertErr) return { ok: false, error: insertErr.message };
  } else if (action === "update") {
    const memberId = memberData.member_id as string;
    if (!memberId) return { ok: false, error: "缺少 member_id。" };
    const name = memberData.name as string | undefined;
    const jerseyNumber = memberData.jersey_number as number | undefined;
    const updates: Record<string, unknown> = {};
    if (name != null) updates.name = name;
    if (jerseyNumber != null && !isNaN(Number(jerseyNumber))) updates.jersey_number = Number(jerseyNumber);
    if (Object.keys(updates).length === 0) return { ok: false, error: "無可更新欄位。" };
    const { error: updateErr } = await supabase
      .from("team_members")
      .update(updates)
      .eq("id", memberId)
      .eq("player_id", playerId);
    if (updateErr) return { ok: false, error: updateErr.message };
  } else if (action === "remove") {
    const memberId = memberData.member_id as string;
    if (!memberId) return { ok: false, error: "缺少 member_id。" };
    const { error: deleteErr } = await supabase
      .from("team_members")
      .delete()
      .eq("id", memberId)
      .eq("player_id", playerId);
    if (deleteErr) return { ok: false, error: deleteErr.message };
  } else {
    return { ok: false, error: "不支援的 action。" };
  }

  const { error: updateReqErr } = await supabase
    .from("roster_change_requests")
    .update({ status: "approved", resolved_at: new Date().toISOString() })
    .eq("id", requestId);

  if (updateReqErr) return { ok: false, error: updateReqErr.message };
  revalidatePath(`/admin/${eventId}/players`);
  revalidatePath(`/admin/${eventId}/players/requests`);
  return { ok: true };
}

export async function rejectRequest(
  requestId: string,
  eventId: string,
  adminNote?: string | null
): Promise<ResolveResult> {
  const supabase = await createClient();
  const { data: req, error: fetchErr } = await supabase
    .from("roster_change_requests")
    .select("id")
    .eq("id", requestId)
    .eq("event_id", eventId)
    .eq("status", "pending")
    .single();

  if (fetchErr || !req) {
    return { ok: false, error: "找不到該申請或已處理。" };
  }

  const { error: updateErr } = await supabase
    .from("roster_change_requests")
    .update({
      status: "rejected",
      admin_note: adminNote?.trim() || null,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (updateErr) return { ok: false, error: updateErr.message };
  revalidatePath(`/admin/${eventId}/players`);
  revalidatePath(`/admin/${eventId}/players/requests`);
  return { ok: true };
}
