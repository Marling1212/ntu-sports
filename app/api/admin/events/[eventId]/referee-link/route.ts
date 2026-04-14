import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createRefereeAccessToken } from "@/lib/utils/refereeAccessToken";

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

  let body: { userId?: string } = {};
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, message: "Missing request body" });
  }

  const userId = body.userId?.trim();
  if (!userId) return json(400, { ok: false, message: "Missing userId" });

  const token = createRefereeAccessToken(eventId, userId);
  return json(200, { ok: true, token });
}
