import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  shiftMatchScheduledTimeIso,
  shiftEventSlotRow,
  shiftWeeklyTemplateRow,
} from "@/lib/scheduling/shiftEventTimes";

function json(status: number, body: unknown) {
  return NextResponse.json(body, { status });
}

const MAX_ABS_HOURS = 168;

export async function POST(
  req: Request,
  context: { params: Promise<{ eventId: string }> },
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

  let body: {
    offsetHours?: unknown;
    scope?: {
      matches?: boolean;
      slots?: boolean;
      slotTemplates?: boolean;
      blackoutTemplates?: boolean;
    };
  } = {};
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, message: "Invalid JSON" });
  }

  const offsetHours = Number(body.offsetHours);
  if (!Number.isFinite(offsetHours) || Math.abs(offsetHours) > MAX_ABS_HOURS) {
    return json(400, {
      ok: false,
      message: `offsetHours must be between -${MAX_ABS_HOURS} and ${MAX_ABS_HOURS}`,
    });
  }
  if (offsetHours === 0) {
    return json(400, { ok: false, message: "offsetHours cannot be 0" });
  }

  const scope = body.scope ?? {};
  const doMatches = scope.matches !== false;
  const doSlots = scope.slots !== false;
  const doSlotTemplates = scope.slotTemplates !== false;
  const doBlackoutTemplates = scope.blackoutTemplates !== false;

  const stats = {
    matchesUpdated: 0,
    matchesSkipped: 0,
    slotsUpdated: 0,
    slotsSkipped: 0,
    slotTemplatesUpdated: 0,
    slotTemplatesSkipped: 0,
    blackoutTemplatesUpdated: 0,
    blackoutTemplatesSkipped: 0,
  };
  const warnings: string[] = [];
  const nowIso = new Date().toISOString();

  try {
    if (doMatches) {
      const { data: matchRows, error: mErr } = await supabase
        .from("matches")
        .select("id, scheduled_time")
        .eq("event_id", eventId)
        .not("scheduled_time", "is", null);

      if (mErr) throw mErr;

      for (const row of matchRows ?? []) {
        const iso = row.scheduled_time as string;
        const next = shiftMatchScheduledTimeIso(iso, offsetHours);
        if (!next) {
          stats.matchesSkipped += 1;
          continue;
        }
        const { error: uErr } = await supabase
          .from("matches")
          .update({ scheduled_time: next, updated_at: nowIso })
          .eq("id", row.id);
        if (uErr) {
          warnings.push(`match ${row.id}: ${uErr.message}`);
          stats.matchesSkipped += 1;
        } else {
          stats.matchesUpdated += 1;
        }
      }
    }

    if (doSlots) {
      const { data: slotRows, error: sErr } = await supabase
        .from("event_slots")
        .select("id, slot_date, start_time, end_time")
        .eq("event_id", eventId);

      if (sErr) throw sErr;

      for (const row of slotRows ?? []) {
        const next = shiftEventSlotRow(
          String(row.slot_date),
          String(row.start_time),
          String(row.end_time),
          offsetHours,
        );
        if (!next) {
          stats.slotsSkipped += 1;
          warnings.push(
            `時段 ${row.id}（${row.slot_date}）平移後無法維持同日且結束>開始，已略過。`,
          );
          continue;
        }
        const { error: uErr } = await supabase
          .from("event_slots")
          .update({
            slot_date: next.slot_date,
            start_time: next.start_time,
            end_time: next.end_time,
            updated_at: nowIso,
          })
          .eq("id", row.id);
        if (uErr) {
          warnings.push(`slot ${row.id}: ${uErr.message}`);
          stats.slotsSkipped += 1;
        } else {
          stats.slotsUpdated += 1;
        }
      }
    }

    if (doSlotTemplates) {
      const { data: tplRows, error: tErr } = await supabase
        .from("event_slot_templates")
        .select("id, day_of_week, start_time, end_time")
        .eq("event_id", eventId);

      if (tErr) throw tErr;

      for (const row of tplRows ?? []) {
        const next = shiftWeeklyTemplateRow(
          Number(row.day_of_week),
          String(row.start_time),
          String(row.end_time),
          offsetHours,
        );
        if (!next) {
          stats.slotTemplatesSkipped += 1;
          warnings.push(`每週時段模板 ${row.id} 平移後不符合時段規則，已略過。`);
          continue;
        }
        const { error: uErr } = await supabase
          .from("event_slot_templates")
          .update({
            day_of_week: next.day_of_week,
            start_time: next.start_time,
            end_time: next.end_time,
            updated_at: nowIso,
          })
          .eq("id", row.id);
        if (uErr) {
          warnings.push(`slot template ${row.id}: ${uErr.message}`);
          stats.slotTemplatesSkipped += 1;
        } else {
          stats.slotTemplatesUpdated += 1;
        }
      }
    }

    if (doBlackoutTemplates) {
      const { data: boRows, error: bErr } = await supabase
        .from("team_blackout_templates")
        .select("id, day_of_week, start_time, end_time")
        .eq("event_id", eventId);

      if (bErr) throw bErr;

      for (const row of boRows ?? []) {
        const next = shiftWeeklyTemplateRow(
          Number(row.day_of_week),
          String(row.start_time),
          String(row.end_time),
          offsetHours,
        );
        if (!next) {
          stats.blackoutTemplatesSkipped += 1;
          warnings.push(`不可出賽模板 ${row.id} 平移後不符合時段規則，已略過。`);
          continue;
        }
        const { error: uErr } = await supabase
          .from("team_blackout_templates")
          .update({
            day_of_week: next.day_of_week,
            start_time: next.start_time,
            end_time: next.end_time,
            updated_at: nowIso,
          })
          .eq("id", row.id);
        if (uErr) {
          warnings.push(`blackout template ${row.id}: ${uErr.message}`);
          stats.blackoutTemplatesSkipped += 1;
        } else {
          stats.blackoutTemplatesUpdated += 1;
        }
      }
    }

    await supabase.from("admin_audit_log").insert({
      event_id: eventId,
      organizer_id: user.id,
      action: "event.shift_schedule_times",
      entity_type: "event",
      entity_id: eventId,
      before_data: {},
      after_data: { offsetHours, scope: body.scope ?? null, stats, warnings: warnings.slice(0, 50) },
    });

    return json(200, {
      ok: true,
      offsetHours,
      stats,
      warnings: warnings.slice(0, 100),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return json(500, { ok: false, message: msg });
  }
}
