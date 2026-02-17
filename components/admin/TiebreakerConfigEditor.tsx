"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import type { TiebreakerConfig, TiebreakerCriteria } from "@/types/database";
import {
  getDefaultTiebreakerConfig,
  normalizeTiebreakerConfig,
  DEFAULT_TIEBREAKER_ORDER,
  ALL_TIEBREAKER_CRITERIA,
} from "@/lib/standings";

const CRITERIA_LABELS: { value: TiebreakerCriteria; labelZh: string; labelEn: string }[] = [
  { value: "points", labelZh: "積分", labelEn: "Points" },
  { value: "wins", labelZh: "勝場數", labelEn: "Wins" },
  { value: "losses", labelZh: "敗場數（少者較前）", labelEn: "Losses (fewer first)" },
  { value: "draws", labelZh: "和局數", labelEn: "Draws" },
  { value: "head_to_head", labelZh: "對戰成績（H2H）", labelEn: "Head-to-head" },
  { value: "goal_difference", labelZh: "得失差", labelEn: "Goal difference" },
  { value: "goals_for", labelZh: "得分", labelEn: "Goals for" },
  { value: "goals_against", labelZh: "失分（少者較前）", labelEn: "Goals against (fewer first)" },
  { value: "fair_play", labelZh: "公平競賽（黃／紅牌）", labelEn: "Fair play (cards)" },
];

interface TiebreakerConfigEditorProps {
  eventId: string;
  initialConfig: TiebreakerConfig | null | undefined;
  tournamentType: string | undefined;
  onSaved?: () => void;
}

export default function TiebreakerConfigEditor({
  eventId,
  initialConfig,
  tournamentType,
  onSaved,
}: TiebreakerConfigEditorProps) {
  const normalized = normalizeTiebreakerConfig(initialConfig);
  const [order, setOrder] = useState<TiebreakerCriteria[]>(() =>
    normalized.order.filter((c) => c !== "final")
  );
  const [finalTiebreaker, setFinalTiebreaker] = useState<"admin_decide" | "alphabetical">(
    normalized.final_tiebreaker
  );
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const n = normalizeTiebreakerConfig(initialConfig);
    setOrder(n.order.filter((c) => c !== "final"));
    setFinalTiebreaker(n.final_tiebreaker);
  }, [initialConfig]);

  if (tournamentType !== "season_play") return null;

  const isSelected = (crit: TiebreakerCriteria) => order.includes(crit);
  const toggle = (crit: TiebreakerCriteria) => {
    if (isSelected(crit)) setOrder((prev) => prev.filter((c) => c !== crit));
    else setOrder((prev) => [...prev, crit]);
  };

  const move = (index: number, dir: "up" | "down") => {
    const next = [...order];
    const j = dir === "up" ? index - 1 : index + 1;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setOrder(next);
  };

  const restoreDefault = () => {
    setOrder(DEFAULT_TIEBREAKER_ORDER.filter((c) => c !== "final"));
    setFinalTiebreaker(getDefaultTiebreakerConfig().final_tiebreaker);
    toast.success("已還原為預設（含預設順序與選項）");
  };

  const save = async () => {
    if (order.length === 0) {
      toast.error("請至少勾選一項排名依據");
      return;
    }
    setSaving(true);
    try {
      const config: TiebreakerConfig = {
        order: [...order, "final"],
        final_tiebreaker: finalTiebreaker,
        points_win: 3,
        points_draw: 1,
        points_loss: 0,
      };
      const { error } = await supabase
        .from("events")
        .update({ tiebreaker_config: config })
        .eq("id", eventId);
      if (error) throw error;
      toast.success("排名規則已儲存");
      onSaved?.();
    } catch (e: any) {
      toast.error(e?.message || "儲存失敗");
    } finally {
      setSaving(false);
    }
  };

  const label = (crit: TiebreakerCriteria) =>
    CRITERIA_LABELS.find((o) => o.value === crit)?.labelZh ?? crit;

  return (
    <section className="bg-white rounded-xl shadow-lg p-6 border-2 border-gray-200">
      <h2 className="text-xl font-semibold text-ntu-green mb-2">季後賽／排名 Tiebreaker 規則</h2>
      <p className="text-sm text-gray-600 mb-4">
        勾選要使用的排名依據，並在下方調整比較順序。同分時依序比較「已選擇」的項目。此設定會用於戰績表、填寫季後賽名單與匯出。
      </p>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">可選的排名依據（勾選要使用的項目）</label>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {ALL_TIEBREAKER_CRITERIA.map((crit) => (
              <label key={crit} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSelected(crit)}
                  onChange={() => toggle(crit)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">{label(crit)}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">已選擇的比較順序（由上到下依序比較）</label>
          {order.length === 0 ? (
            <p className="text-sm text-gray-500 italic">請在上方至少勾選一項</p>
          ) : (
            <ul className="space-y-1">
              {order.map((crit, index) => (
                <li key={crit} className="flex items-center gap-2">
                  <span className="text-gray-500 w-6">{index + 1}.</span>
                  <span className="flex-1">{label(crit)}</span>
                  <button
                    type="button"
                    onClick={() => move(index, "up")}
                    disabled={index === 0}
                    className="px-2 py-0.5 text-xs border rounded disabled:opacity-40"
                  >
                    上
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, "down")}
                    disabled={index === order.length - 1}
                    className="px-2 py-0.5 text-xs border rounded disabled:opacity-40"
                  >
                    下
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={restoreDefault}
            className="mt-2 text-sm text-ntu-green hover:underline"
          >
            還原為預設順序與選項
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">最後一關（若仍平手）</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="final_tiebreaker"
                checked={finalTiebreaker === "admin_decide"}
                onChange={() => setFinalTiebreaker("admin_decide")}
                className="rounded-full"
              />
              <span>由主辦方決定（可能加賽或抽籤）</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="final_tiebreaker"
                checked={finalTiebreaker === "alphabetical"}
                onChange={() => setFinalTiebreaker("alphabetical")}
                className="rounded-full"
              />
              <span>依姓名排序</span>
            </label>
          </div>
        </div>

        <button
          type="button"
          onClick={save}
          disabled={saving || order.length === 0}
          className="bg-ntu-green text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "儲存中…" : "儲存排名規則"}
        </button>
      </div>
    </section>
  );
}
