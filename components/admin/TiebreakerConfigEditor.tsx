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
import { useI18n } from "@/lib/i18n/context";

const CRITERIA_KEYS: Record<TiebreakerCriteria, string> = {
  points: "admin.tiebreakerPoints",
  wins: "admin.tiebreakerWins",
  losses: "admin.tiebreakerLosses",
  draws: "admin.tiebreakerDraws",
  head_to_head: "admin.tiebreakerH2H",
  goal_difference: "admin.tiebreakerGD",
  goals_for: "admin.tiebreakerGF",
  goals_against: "admin.tiebreakerGA",
  fair_play: "admin.tiebreakerFairPlay",
  final: "admin.tiebreakerFinalStep",
};

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
  const { t } = useI18n();

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
    toast.success(t("admin.tiebreakerRestoreSuccess"));
  };

  const save = async () => {
    if (order.length === 0) {
      toast.error(t("admin.tiebreakerErrorMinOne"));
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
      toast.success(t("admin.tiebreakerSaveSuccess"));
      onSaved?.();
    } catch (e: any) {
      toast.error(e?.message || t("admin.tiebreakerSaveFail"));
    } finally {
      setSaving(false);
    }
  };

  const label = (crit: TiebreakerCriteria) => t(CRITERIA_KEYS[crit] as any);

  return (
    <section className="bg-white rounded-xl shadow-lg p-6 border-2 border-gray-200">
      <h2 className="text-xl font-semibold text-ntu-green mb-2">{t("admin.tiebreakerTitle")}</h2>
      <p className="text-sm text-gray-600 mb-4">
        {t("admin.tiebreakerDesc")}
      </p>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t("admin.tiebreakerAvailable")}</label>
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
          <label className="block text-sm font-medium text-gray-700 mb-2">{t("admin.tiebreakerSelected")}</label>
          {order.length === 0 ? (
            <p className="text-sm text-gray-500 italic">{t("admin.tiebreakerSelectOne")}</p>
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
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, "down")}
                    disabled={index === order.length - 1}
                    className="px-2 py-0.5 text-xs border rounded disabled:opacity-40"
                  >
                    ▼
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
            {t("admin.tiebreakerRestore")}
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t("admin.tiebreakerFinalStep")}</label>
          <div className="flex gap-4 flex-wrap">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="final_tiebreaker"
                checked={finalTiebreaker === "admin_decide"}
                onChange={() => setFinalTiebreaker("admin_decide")}
                className="rounded-full"
              />
              <span>{t("admin.tiebreakerAdminDecide")}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="final_tiebreaker"
                checked={finalTiebreaker === "alphabetical"}
                onChange={() => setFinalTiebreaker("alphabetical")}
                className="rounded-full"
              />
              <span>{t("admin.tiebreakerAlphabetical")}</span>
            </label>
          </div>
        </div>

        <button
          type="button"
          onClick={save}
          disabled={saving || order.length === 0}
          className="bg-ntu-green text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {saving ? t("admin.tiebreakerSaving") : t("admin.tiebreakerSaveRules")}
        </button>
      </div>
    </section>
  );
}
