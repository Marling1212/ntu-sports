"use client";

import { useI18n } from "@/lib/i18n/context";
import type { AdminUiScale } from "@/lib/adminUiScale";
import { useAdminUiScaleOptional } from "@/components/admin/AdminUiScaleProvider";

type Variant = "navbar" | "light";

const SCALE_ORDER: AdminUiScale[] = ["standard", "comfortable", "large"];

function optionLabel(t: (key: string) => string, s: AdminUiScale): string {
  if (s === "standard") return t("admin.uiScaleOption_standard");
  if (s === "comfortable") return t("admin.uiScaleOption_comfortable");
  return t("admin.uiScaleOption_large");
}

/**
 * Lets organizers pick admin text density. Persists via AdminUiScaleProvider / localStorage.
 */
export default function AdminFontSizeControl({ variant = "light" }: { variant?: Variant }) {
  const { t } = useI18n();
  const ctx = useAdminUiScaleOptional();
  if (!ctx) return null;

  const { scale, setScale } = ctx;

  const baseSelect =
    variant === "navbar"
      ? "rounded-lg border border-white/50 bg-white px-2 py-2 text-sm font-medium text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-white/80 min-h-[44px] max-w-[11rem] sm:max-w-[13rem]"
      : "rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-ntu-green min-h-[44px] max-w-[11rem] sm:max-w-[13rem]";

  return (
    <div className="flex flex-col gap-0.5">
      <label htmlFor="admin-ui-scale-select" className={variant === "navbar" ? "sr-only" : "text-xs text-gray-600"}>
        {t("admin.uiScaleLabel")}
      </label>
      <select
        id="admin-ui-scale-select"
        value={scale}
        onChange={(e) => setScale(e.target.value as AdminUiScale)}
        className={baseSelect}
        title={t("admin.uiScaleHint")}
        aria-describedby="admin-ui-scale-hint"
      >
        {SCALE_ORDER.map((s) => (
          <option key={s} value={s}>
            {optionLabel(t, s)}
          </option>
        ))}
      </select>
      {variant === "light" && (
        <p id="admin-ui-scale-hint" className="text-xs text-gray-500 max-w-[14rem]">
          {t("admin.uiScaleHint")}
        </p>
      )}
    </div>
  );
}
