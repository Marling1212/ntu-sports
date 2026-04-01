"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

type ShiftResponse = {
  ok: boolean;
  offsetHours?: number;
  stats?: {
    matchesUpdated: number;
    matchesSkipped: number;
    slotsUpdated: number;
    slotsSkipped: number;
    slotTemplatesUpdated: number;
    slotTemplatesSkipped: number;
    blackoutTemplatesUpdated: number;
    blackoutTemplatesSkipped: number;
  };
  warnings?: string[];
  message?: string;
};

export default function ShiftAllScheduleTimesPanel({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [offsetStr, setOffsetStr] = useState("");
  const [scopeMatches, setScopeMatches] = useState(true);
  const [scopeSlots, setScopeSlots] = useState(true);
  const [scopeSlotTemplates, setScopeSlotTemplates] = useState(true);
  const [scopeBlackoutTemplates, setScopeBlackoutTemplates] = useState(true);
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<ShiftResponse | null>(null);

  const runShift = async () => {
    const offsetHours = Number(offsetStr.trim());
    if (offsetStr.trim() === "" || !Number.isFinite(offsetHours) || offsetHours === 0) {
      toast.error("請輸入非零數字（小時），例如 -8 或 3");
      return;
    }
    if (Math.abs(offsetHours) > 168) {
      toast.error("偏移需在 -168～168 小時之間（一週內）");
      return;
    }
    const ok = window.confirm(
      `確定要將勾選範圍內的所有時間平移 ${offsetHours > 0 ? "+" : ""}${offsetHours} 小時嗎？此操作無法自動還原，請先確認數字正確。`,
    );
    if (!ok) return;

    setBusy(true);
    setLastResult(null);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/shift-schedule-times`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offsetHours,
          scope: {
            matches: scopeMatches,
            slots: scopeSlots,
            slotTemplates: scopeSlotTemplates,
            blackoutTemplates: scopeBlackoutTemplates,
          },
        }),
      });
      const data = (await res.json()) as ShiftResponse;
      setLastResult(data);
      if (!res.ok || !data.ok) {
        toast.error(data.message || "平移失敗");
        return;
      }
      toast.success("時間已平移");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "請求失敗");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-8 rounded-lg border border-amber-200 bg-amber-50/80 p-4 text-gray-800 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left font-semibold text-amber-900"
      >
        <span>進階：一次性平移全站排程時間</span>
        <span className="text-sm font-normal text-amber-800">{open ? "收合" : "展開"}</span>
      </button>
      <p className="mt-2 text-sm text-amber-900/90">
        若先前誤用錯誤時區輸入，可在此將「比賽排定時間、場地時段、每週模板、隊伍不可出賽模板」一併加減相同小時數，無須逐筆重填。
        比賽時間以資料庫 UTC 儲存，會直接加減小時；場地與模板依台北當日牆上時間計算。若某筆平移後會跨日或違反「結束晚於開始」，該筆會略過並列在結果中。
      </p>

      {open && (
        <div className="mt-4 space-y-4 border-t border-amber-200/80 pt-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span>偏移（小時）</span>
              <input
                type="number"
                step="0.5"
                placeholder="例：-8 或 3"
                className="w-36 rounded border border-gray-300 px-2 py-1.5"
                value={offsetStr}
                onChange={(e) => setOffsetStr(e.target.value)}
                disabled={busy}
              />
            </label>
            <span className="pb-2 text-xs text-gray-600">
              例：實際應為台北時間但當成 UTC 輸入，可試 <code className="rounded bg-white px-1">+8</code>；反向則{" "}
              <code className="rounded bg-white px-1">-8</code>。
            </span>
          </div>

          <fieldset className="space-y-2 text-sm">
            <legend className="font-medium text-gray-800">套用範圍</legend>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={scopeMatches}
                onChange={(e) => setScopeMatches(e.target.checked)}
                disabled={busy}
              />
              比賽排定時間
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={scopeSlots}
                onChange={(e) => setScopeSlots(e.target.checked)}
                disabled={busy}
              />
              場地時段
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={scopeSlotTemplates}
                onChange={(e) => setScopeSlotTemplates(e.target.checked)}
                disabled={busy}
              />
              每週時段模板
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={scopeBlackoutTemplates}
                onChange={(e) => setScopeBlackoutTemplates(e.target.checked)}
                disabled={busy}
              />
              隊伍不可出賽時間模板
            </label>
          </fieldset>

          <button
            type="button"
            onClick={runShift}
            disabled={busy}
            className="rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
          >
            {busy ? "處理中…" : "執行平移"}
          </button>

          {lastResult?.ok && lastResult.stats && (
            <div className="rounded border border-green-200 bg-white/90 p-3 text-sm">
              <p className="font-medium text-green-900">結果摘要</p>
              <ul className="mt-2 list-inside list-disc text-gray-700">
                <li>
                  比賽：已更新 {lastResult.stats.matchesUpdated}，略過 {lastResult.stats.matchesSkipped}
                </li>
                <li>
                  場地時段：已更新 {lastResult.stats.slotsUpdated}，略過 {lastResult.stats.slotsSkipped}
                </li>
                <li>
                  每週模板：已更新 {lastResult.stats.slotTemplatesUpdated}，略過{" "}
                  {lastResult.stats.slotTemplatesSkipped}
                </li>
                <li>
                  不可出賽模板：已更新 {lastResult.stats.blackoutTemplatesUpdated}，略過{" "}
                  {lastResult.stats.blackoutTemplatesSkipped}
                </li>
              </ul>
              {lastResult.warnings && lastResult.warnings.length > 0 && (
                <div className="mt-3 border-t border-amber-100 pt-2">
                  <p className="font-medium text-amber-900">略過或警告（最多顯示 100 則）</p>
                  <ul className="mt-1 max-h-40 list-inside list-disc overflow-y-auto text-xs text-gray-600">
                    {lastResult.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
