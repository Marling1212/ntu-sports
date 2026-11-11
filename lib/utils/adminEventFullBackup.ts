import * as XLSX from "xlsx";
import type { SupabaseClient } from "@supabase/supabase-js";

export const ADMIN_BACKUP_SCHEMA_VERSION = 1;

export function cellStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export function cellBool(v: unknown): boolean | null {
  const s = cellStr(v);
  if (s === null) return null;
  if (s === "TRUE" || s === "true" || s === "1") return true;
  if (s === "FALSE" || s === "false" || s === "0") return false;
  return null;
}

export function cellInt(v: unknown): number | null {
  const s = cellStr(v);
  if (s === null) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

export function readMetaSheet(ws: XLSX.WorkSheet | undefined): Record<string, string> {
  if (!ws) return {};
  const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, raw: false }) as string[][];
  const map: Record<string, string> = {};
  for (const row of rows) {
    if (!row || row.length < 2) continue;
    const k = String(row[0] ?? "").trim();
    const v = String(row[1] ?? "").trim();
    if (k) map[k] = v;
  }
  return map;
}

export function jsonSheetToRecords(ws: XLSX.WorkSheet | undefined): Record<string, unknown>[] {
  if (!ws) return [];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null, raw: false });
}

export function buildMetaAoA(params: {
  eventId: string;
  eventName: string;
  schemaVersion: number;
}): (string | number)[][] {
  const ts = new Date().toISOString();
  return [
    ["key", "value"],
    ["schema_version", String(params.schemaVersion)],
    ["event_id", params.eventId],
    ["event_name", params.eventName],
    ["exported_at", ts],
    ["notes", "Admin 完整備份：還原時請勿改動 _Meta 的 event_id；Players / Matches 的 id 欄位須與資料庫一致。"],
  ];
}

/**
 * 完整匯出賽事備份 Excel（包含 _Meta, Players, Matches, MatchPlayerStats, TeamMembers）
 * 可供還原（Restore）使用。
 */
export async function downloadEventFullBackup(
  supabase: SupabaseClient<any, any, any>,
  eventId: string,
  eventName?: string
): Promise<string> {
  let resolvedName: string = eventName?.trim() || "";
  if (!resolvedName) {
    const { data: ev } = await supabase
      .from("events")
      .select("name")
      .eq("id", eventId)
      .maybeSingle();
    resolvedName = (ev as { name?: string } | null)?.name || "Event";
  }

  const [{ data: players, error: e1 }, { data: matches, error: e2 }] = await Promise.all([
    supabase.from("players").select("*").eq("event_id", eventId).order("name", { ascending: true }),
    supabase
      .from("matches")
      .select("*")
      .eq("event_id", eventId)
      .order("round", { ascending: true })
      .order("match_number", { ascending: true }),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;

  const plist = players ?? [];
  const mlist = matches ?? [];
  const matchIds = mlist.map((m: { id: string }) => m.id);

  let stats: Record<string, unknown>[] = [];
  if (matchIds.length) {
    const { data: st, error: e3 } = await supabase.from("match_player_stats").select("*").in("match_id", matchIds);
    if (e3) throw e3;
    stats = (st ?? []) as Record<string, unknown>[];
  }

  const teamIds = plist.filter((p: { type?: string }) => p.type === "team").map((p: { id: string }) => p.id);
  let members: Record<string, unknown>[] = [];
  if (teamIds.length) {
    const { data: tm, error: e4 } = await supabase.from("team_members").select("*").in("player_id", teamIds);
    if (e4) throw e4;
    members = (tm ?? []) as Record<string, unknown>[];
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(
      buildMetaAoA({
        eventId,
        eventName: resolvedName,
        schemaVersion: ADMIN_BACKUP_SCHEMA_VERSION,
      })
    ),
    "_Meta"
  );

  const playerRows = plist.map((p: Record<string, unknown>) => {
    const { custom_fields, ...rest } = p;
    return {
      ...rest,
      custom_fields_json: custom_fields ? JSON.stringify(custom_fields) : null,
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(playerRows), "Players");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mlist), "Matches");
  if (stats.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stats), "MatchPlayerStats");
  }
  if (members.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(members), "TeamMembers");
  }

  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const filename = `${resolvedName.replace(/\s+/g, "_")}_完整備份_${ts}.xlsx`;
  XLSX.writeFile(wb, filename);
  return filename;
}
