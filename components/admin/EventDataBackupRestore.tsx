"use client";

import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import {
  readMetaSheet,
  downloadEventFullBackup,
  restoreEventFullBackup,
} from "@/lib/utils/adminEventFullBackup";

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
      await downloadEventFullBackup(supabase, eventId, eventName);
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

      if (meta.event_id && meta.event_id !== eventId) {
        const confirmed = window.confirm(
          `檔案中的 event_id (${meta.event_id}) 與本頁賽事 (${eventId}) 不同。\n是否確認將此備份還原匯入至目前賽事？`
        );
        if (!confirmed) {
          if (fileRef.current) fileRef.current.value = "";
          return;
        }
      }

      const result = await restoreEventFullBackup(supabase, eventId, wb);

      const advancedMsg =
        result.bracketWinnersAdvanced > 0
          ? `（已自動推進 ${result.bracketWinnersAdvanced} 個完賽籤位）`
          : "";

      toast.success(
        `還原完成：已還原 ${result.matchesRestored} 場比賽、${result.playersRestored} 筆選手${advancedMsg}` +
          (result.statsRestored ? `、${result.statsRestored} 筆統計` : "") +
          (result.teamMembersRestored ? `、${result.teamMembersRestored} 筆隊員` : "")
      );
      setRestorePhrase("");
      setTimeout(() => window.location.reload(), 1000);
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
        下載的 Excel 含本賽事<strong>全部</strong>選手、組別、場地、比賽、球員統計與隊員資料（不分組別、不限賽制）。上傳同一格式檔案可依內容<strong>完整還原</strong>至資料庫中，並自動維護籤表晉級完整性。
      </p>
      <ul className="text-xs text-gray-500 list-disc pl-5 space-y-1 mb-6">
        <li>適用單淘汰、賽季＋季後賽等所有已建立在系統內的比賽列。</li>
        <li>還原會依相依順序（設定 → 組別 → 場地 → 選手與隊員 → 比賽 → 統計數據）寫入資料庫。</li>
        <li>還原後會自動驗證勝者晉級狀態，確保第 1 輪已完賽比分與勝者正確進入下一輪籤位。</li>
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
        還原屬高風險操作：請確認檔案來源正確。還原會依備份檔重新校準比賽與籤位戰績；若僅微調籤位請在「報名管理」使用手動編輯籤表。
      </p>
    </div>
  );
}
