import type { TiebreakerConfig, TiebreakerCriteria } from "@/types/database";

export const DEFAULT_TIEBREAKER_ORDER: TiebreakerCriteria[] = [
  "points",
  "head_to_head",
  "goal_difference",
  "goals_for",
  "fair_play",
  "final",
];

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
    order: raw.order.filter((c) =>
      ["points", "head_to_head", "goal_difference", "goals_for", "fair_play", "final"].includes(c)
    ),
    final_tiebreaker:
      raw.final_tiebreaker === "alphabetical" ? "alphabetical" : "admin_decide",
    points_win: raw.points_win ?? 3,
    points_draw: raw.points_draw ?? 1,
    points_loss: raw.points_loss ?? 0,
  };
}
