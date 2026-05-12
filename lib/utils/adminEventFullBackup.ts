import * as XLSX from "xlsx";

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
