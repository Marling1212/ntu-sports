import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function json(status: number, body: unknown) {
  return NextResponse.json(body, { status });
}

export async function POST(
  req: Request,
  context: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await context.params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json(401, { ok: false, message: "Unauthorized" });

  const { data: organizer } = await supabase
    .from("organizers")
    .select("id")
    .eq("user_id", user.id)
    .eq("event_id", eventId)
    .maybeSingle();
  if (!organizer) return json(403, { ok: false, message: "Forbidden" });

  let body: { assignments?: Array<{ matchId: string; slotId: string; scheduledTime: string }> } = {};
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, message: "Invalid JSON" });
  }
  const assignments = Array.isArray(body.assignments) ? body.assignments : [];

  const assignedIds = new Set(assignments.map((a) => a.matchId));
  const { data: eventMatches } = await supabase
    .from("matches")
    .select("id")
    .eq("event_id", eventId)
    .neq("status", "bye");

  const toClear = (eventMatches ?? []).filter((m: { id: string }) => !assignedIds.has(m.id));
  const now = new Date().toISOString();

  for (const id of toClear.map((m: { id: string }) => m.id)) {
    const { error } = await supabase
      .from("matches")
      .update({ slot_id: null, scheduled_time: null, updated_at: now })
      .eq("id", id);
    if (error) return json(500, { ok: false, message: `清除時段失敗：${error.message}` });
  }

  for (const a of assignments) {
    const { error } = await supabase
      .from("matches")
      .update({
        slot_id: a.slotId,
        scheduled_time: a.scheduledTime,
        updated_at: now,
      })
      .eq("id", a.matchId)
      .eq("event_id", eventId);
    if (error) return json(500, { ok: false, message: `更新比賽時段失敗：${error.message}` });
  }

  return json(200, { ok: true, applied: assignments.length, cleared: toClear.length });
}
