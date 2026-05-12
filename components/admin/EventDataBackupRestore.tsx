"use client";

import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import {
  ADMIN_BACKUP_SCHEMA_VERSION,
  buildMetaAoA,
  cellStr,
  cellBool,
  cellInt,
  readMetaSheet,
  jsonSheetToRecords,
} from "@/lib/utils/adminEventFullBackup";

const PLAYER_UPDATE_KEYS = [
  "name",
  "department",
  "seed",
  "eliminated_round",
  "type",
  "division_id",
  "email",
  "email_opt_in",
  "checked_in_at",
  "checked_in_by",
  "check_in_note",
] as const;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function pickPlayerUpdate(row: Record<string, unknown>): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const k of PLAYER_UPDATE_KEYS) {
    const raw = row[k];
    if (raw === undefined || raw === null || String(raw).trim() === "") continue;
    if (k === "seed" || k === "eliminated_round") {
      const n = cellInt(raw);
      if (n !== null) o[k] = n;
      continue;
    }
    if (k === "email_opt_in") {
      const b = cellBool(raw);
      if (b !== null) o[k] = b;
      continue;
    }
    o[k] = cellStr(raw);
  }
  const cf = cellStr(row.custom_fields_json);
  if (cf) {
    try {
      o.custom_fields = JSON.parse(cf);
    } catch {
      /* skip */
    }
  }
  return o;
}

function pickMatchUpsert(row: Record<string, unknown>): Record<string, unknown> | null {
  const id = cellStr(row.id);
  const event_id = cellStr(row.event_id);
  const round = cellInt(row.round);
  const match_number = cellInt(row.match_number);
  const status = cellStr(row.status);
  if (!id || !event_id || round === null || match_number === null || !status) return null;

  const o: Record<string, unknown> = {
    id,
    event_id,
    round,
    match_number,
    status,
  };

  const nullableKeys = [
    "division_id",
    "group_number",
    "player1_id",
    "player2_id",
    "score1",
    "score2",
    "winner_id",
    "court",
    "scheduled_time",
    "slot_id",
    "slot1_seed",
    "slot1_group",
    "slot2_seed",
    "slot2_group",
    "forfeit_team_id",
    "forfeit_reason",
    "event_note",
  ] as const;

  for (const k of nullableKeys) {
    if (!(k in row)) continue;
    const raw = row[k];
    if (raw === null || raw === undefined || String(raw).trim() === "") {
      o[k] = null;
      continue;
    }
    if (
      k === "group_number" ||
      k === "slot1_seed" ||
      k === "slot1_group" ||
      k === "slot2_seed" ||
      k === "slot2_group"
    ) {
      const n = cellInt(raw);
      o[k] = n;
      continue;
    }
    o[k] = cellStr(raw);
  }

  o.event_note_public = cellBool(row.event_note_public) ?? false;
  o.reminder_sent_48h = cellBool(row.reminder_sent_48h) ?? false;

  return o;
}

interface EventDataBackupRestoreProps {
  eventId: string;
  eventName: string;
}

export default function EventDataBackupRestore({ eventId, eventName }: EventDataBackupRestoreProps) {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [restorePhrase, setRestorePhrase] = useState("");

  const handleDownload = async () => {
    setBusy(true);
    try {
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
            eventName,
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
      XLSX.writeFile(wb, `${eventName.replace(/\s+/g, "_")}_完整備份_${ts}.xlsx`);
      toast.success("已下載完整備份 Excel");
    } catch (e: unknown) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "下載失敗");
    } finally {
      setBusy(false);
    }
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (restorePhrase.trim().toUpperCase() !== "RESTORE") {
      toast.error("請在下方輸入框鍵入 RESTORE（大寫）後再選檔");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const meta = readMetaSheet(wb.Sheets["_Meta"]);
      if (meta.event_id !== eventId) {
        throw new Error(`檔案中的 event_id 與本頁賽事不符（檔案: ${meta.event_id ?? "?"})`);
      }
      const ver = parseInt(meta.schema_version || "0", 10);
      if (ver !== ADMIN_BACKUP_SCHEMA_VERSION) {
        throw new Error(`不支援的備份版本：${meta.schema_version}（目前僅支援 ${ADMIN_BACKUP_SCHEMA_VERSION}）`);
      }

      const playerRows = jsonSheetToRecords(wb.Sheets["Players"]);
      const matchRows = jsonSheetToRecords(wb.Sheets["Matches"]);
      if (!matchRows.length) throw new Error("缺少 Matches 工作表或無資料列");

      let updatedPlayers = 0;
      for (const batch of chunk(playerRows, 25)) {
        await Promise.all(
          batch.map(async (row) => {
            const id = cellStr(row.id);
            if (!id) return;
            const payload = pickPlayerUpdate(row);
            if (Object.keys(payload).length === 0) return;
            const { error } = await supabase.from("players").update(payload).eq("id", id).eq("event_id", eventId);
            if (error) throw error;
            updatedPlayers += 1;
          })
        );
      }

      const preparedMatches = matchRows.map(pickMatchUpsert).filter(Boolean) as Record<string, unknown>[];
      for (const batch of chunk(preparedMatches, 80)) {
        const { error } = await supabase.from("matches").upsert(batch, { onConflict: "id" });
        if (error) throw error;
      }

      const statRows = wb.Sheets["MatchPlayerStats"]
        ? jsonSheetToRecords(wb.Sheets["MatchPlayerStats"])
        : [];
      const matchIdsFromFile = preparedMatches.map((m) => String(m.id)).filter(Boolean);
      if (matchIdsFromFile.length) {
        const { error: delErr } = await supabase.from("match_player_stats").delete().in("match_id", matchIdsFromFile);
        if (delErr) throw delErr;
      }
      if (statRows.length) {
        const inserts = statRows
          .map((r) => {
            const id = cellStr(r.id);
            const match_id = cellStr(r.match_id);
            const player_id = cellStr(r.player_id);
            const stat_name = cellStr(r.stat_name);
            if (!match_id || !player_id || !stat_name) return null;
            const row: Record<string, unknown> = {
              match_id,
              player_id,
              stat_name,
              stat_value: cellStr(r.stat_value),
            };
            const tm = cellStr(r.team_member_id);
            if (tm) row.team_member_id = tm;
            if (id) row.id = id;
            return row;
          })
          .filter(Boolean) as Record<string, unknown>[];
        for (const batch of chunk(inserts, 100)) {
          const { error } = await supabase.from("match_player_stats").insert(batch);
          if (error) throw error;
        }
      }

      const memberRows = wb.Sheets["TeamMembers"] ? jsonSheetToRecords(wb.Sheets["TeamMembers"]) : [];
      for (const batch of chunk(memberRows, 40)) {
        await Promise.all(
          batch.map(async (row) => {
            const id = cellStr(row.id);
            if (!id) return;
            const payload: Record<string, unknown> = {};
            const name = cellStr(row.name);
            if (name) payload.name = name;
            const jn = cellInt(row.jersey_number);
            if (jn !== null) payload.jersey_number = jn;
            const ic = cellBool(row.is_captain);
            if (ic !== null) payload.is_captain = ic;
            if (Object.keys(payload).length === 0) return;
            const { error } = await supabase.from("team_members").update(payload).eq("id", id);
            if (error) throw error;
          })
        );
      }

      toast.success(
        `還原完成：已 upsert ${preparedMatches.length} 場比賽、更新 ${updatedPlayers} 筆選手` +
          (statRows.length ? `、寫入 ${statRows.length} 筆球員統計` : "") +
          (memberRows.length ? `、更新 ${memberRows.length} 筆隊員` : "")
      );
      setRestorePhrase("");
      setTimeout(() => window.location.reload(), 800);
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "還原失敗");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 max-w-4xl">
      <h2 className="text-2xl font-semibold text-ntu-green mb-2">賽事完整備份與還原</h2>
      <p className="text-sm text-gray-600 mb-4">
        下載的 Excel 含本賽事<strong>全部</strong>選手、比賽、球員統計與隊員資料（不分組別、不限賽制）。上傳同一格式檔案可依內容<strong>覆寫</strong>資料庫中的對應列（以{" "}
        <code className="text-xs bg-gray-100 px-1 rounded">id</code> 對齊）。
      </p>
      <ul className="text-xs text-gray-500 list-disc pl-5 space-y-1 mb-6">
        <li>適用單淘汰、賽季＋季後賽等所有已建立在系統內的比賽列。</li>
        <li>還原會先依 Matches 內的 match_id 清空再寫入「MatchPlayerStats」工作表內容。</li>
        <li>請勿手改 <code className="text-xs bg-gray-100 px-1">_Meta</code> 的 <code className="text-xs bg-gray-100 px-1">event_id</code>。</li>
      </ul>

      <div className="flex flex-wrap gap-3 items-end mb-6">
        <button
          type="button"
          disabled={busy}
          onClick={handleDownload}
          className="bg-ntu-green text-white px-5 py-2.5 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 text-sm"
        >
          {busy ? "處理中…" : "1. 下載完整備份 Excel"}
        </button>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">還原前請輸入 RESTORE</label>
          <input
            type="text"
            value={restorePhrase}
            onChange={(ev) => setRestorePhrase(ev.target.value)}
            placeholder="RESTORE"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-40 font-mono"
            autoComplete="off"
          />
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="bg-gray-800 text-white px-5 py-2.5 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 text-sm"
        >
          2. 選擇備份檔還原
        </button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleRestoreFile} />
      </div>

      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
        還原屬高風險操作：請確認檔案來源正確。調整籤位請在「報名管理」使用產生籤表或手動編輯籤表；大範圍還原戰績與名單請使用本頁備份檔。
      </p>
    </div>
  );
}
