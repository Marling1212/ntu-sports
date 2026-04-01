"use client";

import {
  SCHEDULE_INPUT_TIMEZONE_OPTIONS,
  DEFAULT_SCHEDULE_INPUT_TIMEZONE,
} from "@/lib/utils/adminScheduleTimezone";

type Locale = "zh" | "en";

interface ScheduleInputTimezoneFieldProps {
  value: string;
  onChange: (next: string) => void;
  locale?: Locale;
  className?: string;
  id?: string;
  /** Override default label */
  labelZh?: string;
  labelEn?: string;
  /** Override default hint under the select */
  hintZh?: string;
  hintEn?: string;
}

export default function ScheduleInputTimezoneField({
  value,
  onChange,
  locale = "zh",
  className = "",
  id = "schedule-input-timezone",
  labelZh,
  labelEn,
  hintZh,
  hintEn,
}: ScheduleInputTimezoneFieldProps) {
  const v = SCHEDULE_INPUT_TIMEZONE_OPTIONS.some((o) => o.value === value)
    ? value
    : DEFAULT_SCHEDULE_INPUT_TIMEZONE;

  const label =
    locale === "zh"
      ? (labelZh ?? "上方日期時間的時區")
      : (labelEn ?? "Time zone for the date/time above");
  const hint =
    locale === "zh"
      ? (hintZh ??
        "依你選的時區解讀數字，存成單一時間點（UTC）；公開頁與台灣顯示會再換算成台灣時間。")
      : (hintEn ??
        "Numbers are interpreted in this zone and stored as one instant (UTC); the public site shows Taiwan time.");

  return (
    <div className={`space-y-1 ${className}`}>
      <label htmlFor={id} className="block text-xs font-medium text-gray-600">
        {label}
      </label>
      <select
        id={id}
        value={v}
        onChange={(e) => onChange(e.target.value)}
        className="w-full max-w-xs px-2 py-1.5 border border-gray-300 rounded-md text-sm bg-white"
      >
        {SCHEDULE_INPUT_TIMEZONE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {locale === "zh" ? o.labelZh : o.labelEn}
          </option>
        ))}
      </select>
      <p className="text-xs text-gray-500 leading-snug">{hint}</p>
    </div>
  );
}
