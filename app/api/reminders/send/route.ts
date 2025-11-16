import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Note: schedule this endpoint via an external cron or Supabase Scheduled Functions
// e.g., run hourly. It will send reminders for matches ~48 hours away.

const TAIPEI_TZ = "Asia/Taipei";

async function sendEmail(to: string[], subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "NTU Sports <noreply@your-domain>",
      to,
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend error: ${res.status} ${text}`);
  }
}

function formatDateTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("zh-TW", {
      month: "short",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: TAIPEI_TZ,
    }).format(d);
  } catch {
    return dateStr;
  }
}

export async function GET() {
  try {
    const supabase = await createClient();

    // Run hourly for better accuracy.
    const now = new Date();

    // Pull upcoming/delayed matches that haven't been reminded; we’ll filter by event config below
    const { data: matches, error } = await supabase
      .from("matches")
      .select(`
        *,
        player1:players!matches_player1_id_fkey(id, name, email, email_opt_in),
        player2:players!matches_player2_id_fkey(id, name, email, email_opt_in),
        slot:event_slots(id, code, court_id, event_courts(name)),
        events!matches_event_id_fkey(id, name, sport, reminder_mode, reminder_value)
      `)
      .in("status", ["upcoming", "delayed"])
      .eq("reminder_sent_48h", false);

    if (error) {
      throw error;
    }

    const results: Array<{ match_id: string; sent_to: string[]; skipped: string[]; error?: string }> = [];

    // Group matches by event for efficient checks
    const matchesByEvent = new Map<string, any[]>();
    for (const m of matches || []) {
      const evId = (m as any).events?.id;
      if (!evId) continue;
      if (!matchesByEvent.has(evId)) matchesByEvent.set(evId, []);
      matchesByEvent.get(evId)!.push(m);
    }

    // Helper to decide if a match should be reminded now based on event config
    const shouldSendForMatch = async (m: any) => {
      const ev = m.events || {};
      const mode = ev.reminder_mode || "hours";
      const value = typeof ev.reminder_value === "number" ? ev.reminder_value : 48;

      if (!m.scheduled_time) return false; // cannot evaluate without a time

      if (mode === "hours") {
        // send when match is between (now + value hours) and (now + value + 1 hour)
        const start = new Date(now.getTime() + value * 60 * 60 * 1000);
        const end = new Date(now.getTime() + (value + 1) * 60 * 60 * 1000);
        const when = new Date(m.scheduled_time);
        return when >= start && when < end;
      } else {
        // mode === "games"
        // Count the number of scheduled matches between now and this match start within the same event
        const eventId = ev.id;
        if (!eventId) return false;

        const { data: earlierMatches, error: earlierErr } = await supabase
          .from("matches")
          .select("id, scheduled_time, status")
          .eq("event_id", eventId)
          .in("status", ["upcoming", "live", "delayed"])
          .gt("scheduled_time", now.toISOString())
          .lt("scheduled_time", m.scheduled_time);
        if (earlierErr) return false;
        const remaining = (earlierMatches || []).length;
        return remaining === value;
      }
    };

    for (const m of matches || []) {
      // Skip if event config says it's not the right time
      const ok = await shouldSendForMatch(m);
      if (!ok) continue;

      const to: string[] = [];
      const skipped: string[] = [];
      const p1 = (m as any).player1;
      const p2 = (m as any).player2;
      if (p1?.email && p1.email_opt_in !== false) to.push(p1.email); else skipped.push(p1?.name || "Player 1");
      if (p2?.email && p2.email_opt_in !== false) to.push(p2.email); else skipped.push(p2?.name || "Player 2");

      if (to.length === 0) {
        results.push({ match_id: m.id, sent_to: [], skipped, error: "No recipient emails" });
        continue;
      }

      const eventName = (m as any).events?.name || "NTU Sports Event";
      const sport = ((m as any).events?.sport || "sport").toString();
      const scheduled = m.scheduled_time ? formatDateTime(m.scheduled_time) : "TBD";
      const court = (m as any).slot?.event_courts?.name || "-";
      const slotCode = (m as any).slot?.code || "-";
      const ev = (m as any).events || {};
      const mode = ev.reminder_mode || "hours";
      const value = typeof ev.reminder_value === "number" ? ev.reminder_value : 48;
      const subject =
        mode === "hours"
          ? `提醒：${eventName} 將於 ${value} 小時後進行`
          : `提醒：${eventName} 於前方 ${value} 場比賽後進行`;

      const html = `
        <div style="font-family: Arial, sans-serif; line-height:1.6;">
          <h2>${eventName} - 比賽提醒</h2>
          <p>您的比賽將於 <strong>${scheduled}</strong> 開打。</p>
          <ul>
            <li>對戰組合：${p1?.name || "TBD"} vs ${p2?.name || "TBD"}</li>
            <li>場地：${court}（時段代碼：${slotCode}）</li>
            <li>賽事：${sport}</li>
          </ul>
          <p>請準時到場，祝比賽順利！</p>
          <p style="color:#888;font-size:12px;">若不想再接收提醒，請回覆此信或聯絡主辦方。</p>
        </div>
      `;

      try {
        await sendEmail(to, subject, html);
        const { error: updErr } = await supabase
          .from("matches")
          .update({ reminder_sent_48h: true })
          .eq("id", m.id);
        if (updErr) throw updErr;
        results.push({ match_id: m.id, sent_to: to, skipped });
      } catch (e: any) {
        results.push({ match_id: m.id, sent_to: [], skipped, error: e?.message || "send failed" });
      }
    }

    return NextResponse.json({ ok: true, count: results.length, results });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "unknown error" }, { status: 500 });
  }
}


