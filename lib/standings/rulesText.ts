import type { TiebreakerConfig } from "@/types/database";
import { normalizeTiebreakerConfig } from "./config";

const CRITERIA_LABELS_ZH: Record<string, string> = {
  points: "積分",
  head_to_head: "對戰成績（含對戰積分、得失差、得分）",
  goal_difference: "得失差",
  goals_for: "得分",
  fair_play: "公平競賽（算法：黃牌每張 -1 分、紅牌每張 -3 分，總分愈高即牌愈少者排名愈前）",
  final: "最後一關",
};

const CRITERIA_LABELS_EN: Record<string, string> = {
  points: "Points",
  head_to_head: "Head-to-head (points, goal diff, goals for)",
  goal_difference: "Goal difference",
  goals_for: "Goals for",
  fair_play: "Fair play: yellow card -1 pt each, red card -3 pts each; higher total (fewer cards) ranks higher",
  final: "Final tiebreaker",
};

export function getTiebreakerRulesText(
  config: TiebreakerConfig | null | undefined,
  locale: "zh" | "en" = "zh"
): string[] {
  const cfg = normalizeTiebreakerConfig(config);
  const labels = locale === "zh" ? CRITERIA_LABELS_ZH : CRITERIA_LABELS_EN;
  const lines: string[] = [];
  const order = [...cfg.order];
  const hasFinal = order.includes("final");
  const orderWithoutFinal = order.filter((c) => c !== "final");
  for (let i = 0; i < orderWithoutFinal.length; i++) {
    const label = labels[orderWithoutFinal[i]] ?? orderWithoutFinal[i];
    lines.push(`${i + 1}. ${label}`);
  }
  if (hasFinal || cfg.final_tiebreaker) {
    const finalText =
      cfg.final_tiebreaker === "admin_decide"
        ? locale === "zh"
          ? "由主辦方決定（可能加賽或抽籤）"
          : "Decided by organizer (e.g. play-in or draw)"
        : locale === "zh"
          ? "依姓名排序"
          : "Alphabetical by name";
    lines.push(`${orderWithoutFinal.length + 1}. ${finalText}`);
  }
  return lines;
}
