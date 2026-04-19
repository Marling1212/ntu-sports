import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  clampRefereeLinkTtlDays,
  createRefereeAccessToken,
} from "@/lib/utils/refereeAccessToken";

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

  let body: { userId?: string; validityDays?: number } = {};
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, message: "Missing request body" });
  }

  const userId = body.userId?.trim();
  if (!userId) return json(400, { ok: false, message: "Missing userId" });

  const { data: eventRow } = await supabase
    .from("events")
    .select("referee_link_ttl_days")
    .eq("id", eventId)
    .maybeSingle();

  const defaultDays = clampRefereeLinkTtlDays(
    (eventRow as { referee_link_ttl_days?: number } | null)?.referee_link_ttl_days
  );
  const ttlDays =
    body.validityDays !== undefined && body.validityDays !== null
      ? clampRefereeLinkTtlDays(body.validityDays)
      : defaultDays;

  const token = createRefereeAccessToken(eventId, userId, ttlDays);
  const expMs = ttlDays * 24 * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + expMs).toISOString();

  return json(200, { ok: true, token, validityDays: ttlDays, expiresAt });
}
