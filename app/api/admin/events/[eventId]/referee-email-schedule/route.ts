import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendResendEmail } from "@/lib/email/resend";
import { publicRefereePortalUrl } from "@/lib/utils/publicSiteUrl";
import {
  clampRefereeLinkTtlDays,
  createRefereeAccessToken,
} from "@/lib/utils/refereeAccessToken";

function json(status: number, body: unknown) {
  return NextResponse.json(body, { status });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

  let body: { userId?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, message: "Invalid body" });
  }
  const userId = body.userId?.trim();
  if (!userId) return json(400, { ok: false, message: "Missing userId" });

  const { data: refRow } = await supabase
    .from("event_referees")
    .select("email, display_name")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();

  const to = (refRow?.email || "").trim();
  if (!to) {
    return json(400, {
      ok: false,
      message: "No email on file. Save an email for this referee first.",
    });
  }

  const { data: event } = await supabase
    .from("events")
    .select("name, referee_link_ttl_days")
    .eq("id", eventId)
    .single();

  const eventName = event?.name || "NTU Sports event";
  const ttlDays = clampRefereeLinkTtlDays(
    (event as { referee_link_ttl_days?: number } | null)?.referee_link_ttl_days
  );

  let service;
  try {
    service = createServiceClient();
  } catch {
    return json(500, { ok: false, message: "Server email lookup unavailable." });
  }

  const { data: assignRows } = await service
    .from("match_referees")
    .select(
      `
      role,
      wage,
      matches (
        id,
        event_id,
        scheduled_time,
        court,
        round,
        match_number,
        group_number,
        player1_id,
        player2_id,
        p1:players!matches_player1_id_fkey(name),
        p2:players!matches_player2_id_fkey(name)
      )
    `
    )
    .eq("user_id", userId);

  const asMatch = (m: unknown) => {
    if (!m) return null;
    if (Array.isArray(m)) return (m[0] ?? null) as Record<string, unknown> | null;
    return m as Record<string, unknown>;
  };

  const rows = (assignRows ?? [])
    .map((r: { role: string; wage: number; matches: unknown }) => {
      const matches = asMatch(r.matches);
      if (!matches || String(matches.event_id) !== eventId) return null;
      return { role: r.role, wage: r.wage, matches };
    })
    .filter(Boolean) as Array<{
    role: string;
    wage: number;
    matches: Record<string, unknown> & {
      scheduled_time: string | null;
      court: string | null;
      round: number;
      match_number: number;
      group_number: number | null;
      p1?: unknown;
      p2?: unknown;
    };
  }>;

  const { data: jobs } = await supabase
    .from("event_referee_jobs")
    .select("id, name")
    .eq("event_id", eventId);

  const jobNameById = new Map((jobs ?? []).map((j) => [j.id, j.name]));

  const roleLabel = (role: string) => {
    if (role.startsWith("job:")) {
      const id = role.slice(4);
      return jobNameById.get(id) || role;
    }
    return role;
  };

  const pName = (rel: unknown) => {
    const o = Array.isArray(rel) ? rel[0] : rel;
    const name = (o as { name?: string | null } | null)?.name;
    return name?.trim() || "TBD";
  };

  const sorted = [...rows].sort((a, b) => {
    const ta = a.matches.scheduled_time
      ? new Date(String(a.matches.scheduled_time)).getTime()
      : 0;
    const tb = b.matches.scheduled_time
      ? new Date(String(b.matches.scheduled_time)).getTime()
      : 0;
    return ta - tb;
  });

  let token: string;
  try {
    token = createRefereeAccessToken(eventId, userId, ttlDays);
  } catch (e) {
    console.error(e);
    return json(500, { ok: false, message: "Could not create portal link." });
  }

  const portalUrl = publicRefereePortalUrl(token, req);
  const refDisplay = (refRow?.display_name || "").trim() || "Referee";

  const tableRows = sorted
    .map((r) => {
      const m = r.matches;
      const when = m.scheduled_time
        ? escapeHtml(
            new Date(String(m.scheduled_time)).toLocaleString("zh-TW", {
              timeZone: "Asia/Taipei",
            })
          )
        : "TBD";
      const matchup = escapeHtml(`${pName(m.p1)} vs ${pName(m.p2)}`);
      const court = escapeHtml((m.court != null ? String(m.court) : "—") || "—");
      const role = escapeHtml(roleLabel(r.role));
      const grp = m.group_number != null ? ` · G${m.group_number}` : "";
      const meta = escapeHtml(`R${m.round} M${m.match_number}${grp}`);
      return `<tr><td>${when}</td><td>${matchup}</td><td>${meta}</td><td>${court}</td><td>${role}</td></tr>`;
    })
    .join("");

  const html = `
  <p>Hi ${escapeHtml(refDisplay)},</p>
  <p>You have been assigned to help officiate <strong>${escapeHtml(eventName)}</strong>. Below are your current match assignments.</p>
  <p><strong>Your portal link</strong> (enter scores / status):<br/>
  <a href="${escapeHtml(portalUrl)}">${escapeHtml(portalUrl)}</a></p>
  <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
    <thead><tr><th>Time</th><th>Matchup</th><th>Round / #</th><th>Court</th><th>Role</th></tr></thead>
    <tbody>${tableRows || `<tr><td colspan="5">No assignments yet for this event.</td></tr>`}</tbody>
  </table>
  <p style="font-size:12px;color:#555">This message was sent by an organizer via NTU Sports. Link validity follows the event settings.</p>
  `;

  try {
    await sendResendEmail({
      to: [to],
      subject: `[NTU Sports] Your assignments — ${eventName}`,
      html,
    });
  } catch (e) {
    console.error(e);
    return json(500, {
      ok: false,
      message: e instanceof Error ? e.message : "Failed to send email.",
    });
  }

  return json(200, { ok: true });
}
