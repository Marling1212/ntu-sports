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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json(401, { ok: false, message: "Unauthorized" });

  const { data: organizer } = await supabase
    .from("organizers")
    .select("id")
    .eq("user_id", user.id)
    .eq("event_id", eventId)
    .maybeSingle();
  if (!organizer) return json(403, { ok: false, message: "Forbidden" });

  let body: { name?: string; email?: string; note?: string; linkedPlayerId?: string } = {};
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, message: "Invalid request body" });
  }

  const name = body.name?.trim() || "";
  const providedEmail = body.email?.trim() || "";
  if (!name) {
    return json(400, { ok: false, message: "Name is required." });
  }
  const email = providedEmail || null;
  const externalRefUserId = crypto.randomUUID();

  const { data: refRow, error: refErr } = await supabase
    .from("event_referees")
    .insert({
      event_id: eventId,
      user_id: externalRefUserId,
      display_name: name,
      email,
      linked_player_id: body.linkedPlayerId?.trim() || null,
      note: body.note?.trim() || null,
    })
    .select("id, event_id, user_id, display_name, email, linked_player_id, note")
    .single();

  if (refErr || !refRow) {
    return json(400, { ok: false, message: refErr?.message || "Failed to add referee." });
  }

  return json(200, { ok: true, referee: refRow });
}
