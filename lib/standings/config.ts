import type { TiebreakerConfig, TiebreakerCriteria } from "@/types/database";

/** 預設使用的順序（未設定時） */
export const DEFAULT_TIEBREAKER_ORDER: TiebreakerCriteria[] = [
  "points",
  "head_to_head",
  "goal_difference",
  "goals_for",
  "fair_play",
  "final",
];

/** 所有可選的排名依據（不含 final）。Admin 從中勾選要使用的項目並排順序。 */
export const ALL_TIEBREAKER_CRITERIA: TiebreakerCriteria[] = [
  "points",
  "wins",
  "losses",
  "draws",
  "head_to_head",
  "goal_difference",
  "goals_for",
  "goals_against",
  "fair_play",
];

const VALID_CRITERIA_SET = new Set<TiebreakerCriteria>([
  ...ALL_TIEBREAKER_CRITERIA,
  "final",
]);

export function getDefaultTiebreakerConfig(): TiebreakerConfig {
  return {
    order: [...DEFAULT_TIEBREAKER_ORDER],
    final_tiebreaker: "admin_decide",
    points_win: 3,
    points_draw: 1,
    points_loss: 0,
  };
}

export function normalizeTiebreakerConfig(
  raw: TiebreakerConfig | null | undefined
): TiebreakerConfig {
  if (!raw || !Array.isArray(raw.order) || raw.order.length === 0) {
    return getDefaultTiebreakerConfig();
  }
  return {
    order: raw.order.filter((c) => VALID_CRITERIA_SET.has(c as TiebreakerCriteria)),
    final_tiebreaker:
      raw.final_tiebreaker === "alphabetical" ? "alphabetical" : "admin_decide",
    points_win: raw.points_win ?? 3,
    points_draw: raw.points_draw ?? 1,
    points_loss: raw.points_loss ?? 0,
  };
}
