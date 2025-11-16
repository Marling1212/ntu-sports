import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function json(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: Request, context: any) {
  const { eventId } = (context?.params || {}) as { eventId: string };
  const supabase = await createClient();

  // AuthN
  const userRes = await supabase.auth.getUser().catch(() => null as any);
  const user = userRes?.data?.user;
  if (!user) return json(401, { ok: false, message: "Unauthorized" });

  // Verify organizer permission
  const orgRes = await supabase
    .from("organizers")
    .select("id")
    .eq("user_id", user.id)
    .eq("event_id", eventId)
    .maybeSingle()
    .catch(() => null as any);
  const organizer = orgRes?.data;
  const hasAccess = !!organizer;

  if (!hasAccess) return json(403, { ok: false, message: "Forbidden" });

  const body = await safeJson(req);
  const { confirmAck, confirmName, confirmId } = (body as any) || {};
  if (!confirmAck) return json(400, { ok: false, message: "Confirmation required" });

  // Load event to validate name
  const { data: event } = await superfluousTry(() =>
    supabase.from("events").select("*").eq("id", eventId).single()
  );
  if (!event) return json(404, { ok: false, message: "Event not found" });
  // accept either {confirmPhrase: 'DELETE'} or legacy confirmId === 'DELETE'
  const { confirmPhrase } = (body as any) || {};
  const keywordOk = (confirmPhrase === "DELETE") || (confirmId === "DELETE") || false;
  if (confirmName !== event.name || !keywordOk) {
    return json(400, { ok: false, message: "Confirmation values do not match" });
  }

  // Delete dependents then event (best-effort)
  const tables: Array<{ name: string; key: string }> = [
    { name: "matches", key: "event_id" },
    { name: "players", key: "event_id" },
    { name: "event_slots", key: "event_id" },
    { name: "event_courts", key: "event_id" },
    { name: "tournament_rules", key: "event_id" },
    { name: "schedule_items", key: "event_id" },
    { name: "announcements", key: "event_id" },
    { name: "team_blackouts", key: "event_id" },
    { name: "push_subscriptions", key: "event_id" },
  ];
  for (const t of tables) {
    await superfluousTry(() => supabase.from(t.name).delete().eq(t.key, eventId));
  }
  const { error: delErr } = await supabase.from("events").delete().eq("id", eventId);
  if (delErr) return json(500, { ok: false, message: delErr.message || "Delete failed" });

  return json(200, { ok: true });
}

async function safeJson(req: Request) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

async function superfluousTry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (_e) {
    // swallow and return {}-like
    // @ts-ignore
    return {};
  }
}


