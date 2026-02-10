import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runAutoSchedule } from "@/lib/scheduling/autoSchedule";

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

  let body: { clearExisting?: boolean; dryRun?: boolean; minSlotsBetweenSameTeam?: number } = {};
  try {
    body = await req.json();
  } catch {
    // optional body
  }
  const clearExisting = !!body.clearExisting;
  const dryRun = !!body.dryRun;
  const minSlotsBetweenSameTeam = typeof body.minSlotsBetweenSameTeam === "number" ? body.minSlotsBetweenSameTeam : 1;

  const [
    { data: slots },
    { data: matches },
    { data: blackoutTemplates },
  ] = await Promise.all([
    supabase
      .from("event_slots")
      .select("id, slot_date, start_time, end_time, capacity")
      .eq("event_id", eventId)
      .order("slot_date", { ascending: true })
      .order("start_time", { ascending: true }),
    supabase
      .from("matches")
      .select("id, player1_id, player2_id, round, match_number, slot_id, player1:players!matches_player1_id_fkey(name), player2:players!matches_player2_id_fkey(name)")
      .eq("event_id", eventId)
      .neq("status", "bye"),
    supabase
      .from("team_blackout_templates")
      .select("player_id, day_of_week, start_time, end_time")
      .eq("event_id", eventId),
  ]);

  if (!slots?.length) {
    return json(400, {
      ok: false,
      message: "請先建立「所有可用時段」（排程頁依模板生成或手動新增）",
    });
  }
  if (!matches?.length) {
    return json(400, {
      ok: false,
      message: "尚無需排程的比賽（請先產生對戰／賽程）",
    });
  }

  if (!dryRun && clearExisting) {
    const { error: clearErr } = await supabase
      .from("matches")
      .update({ slot_id: null, scheduled_time: null, updated_at: new Date().toISOString() })
      .eq("event_id", eventId);
    if (clearErr) {
      return json(500, { ok: false, message: `清除既有排程失敗：${clearErr.message}` });
    }
  }

  const matchPayload = matches.map((m: any) => ({
    id: m.id,
    player1_id: m.player1_id,
    player2_id: m.player2_id,
    round: m.round,
    match_number: m.match_number,
    slot_id: m.slot_id,
  }));
  const { assignments, unassigned } = runAutoSchedule(
    slots as any,
    matchPayload,
    (blackoutTemplates ?? []) as any,
    { clearExisting: dryRun ? true : clearExisting, minSlotsBetweenSameTeam }
  );

  if (dryRun) {
    const matchNames = (matches as any[]).map((m: any) => ({
      id: m.id,
      round: m.round,
      match_number: m.match_number,
      player1_name: m.player1?.name ?? "—",
      player2_name: m.player2?.name ?? "—",
    }));
    return json(200, {
      ok: true,
      dryRun: true,
      slots: slots.map((s: any) => ({ id: s.id, slot_date: s.slot_date, start_time: s.start_time, end_time: s.end_time, capacity: s.capacity ?? 1 })),
      assignments,
      unassigned: unassigned.map((m) => m.id),
      matches: matchNames,
    });
  }

  for (const a of assignments) {
    const { error } = await supabase
      .from("matches")
      .update({
        slot_id: a.slotId,
        scheduled_time: a.scheduledTime,
        updated_at: new Date().toISOString(),
      })
      .eq("id", a.matchId);
    if (error) {
      console.error("Update match error", a.matchId, error);
      return json(500, {
        ok: false,
        message: `更新比賽時段失敗：${error.message}`,
      });
    }
  }

  return json(200, {
    ok: true,
    assigned: assignments.length,
    unassigned: unassigned.length,
    message:
      unassigned.length > 0
        ? `已排程 ${assignments.length} 場，${unassigned.length} 場因時段不足或不可出賽無法排入，請新增時段或調整不可出賽後再試。`
        : `已為 ${assignments.length} 場比賽完成排程。`,
  });
}
