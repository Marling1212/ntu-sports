"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DateTime } from "luxon";

export interface LargeDatePickerProps {
  id: string;
  label: string;
  /** yyyy-MM-dd or empty */
  value: string;
  onChange: (yyyyMmDd: string) => void;
  /** yyyy-MM-dd — disable days before this (inclusive allowed) */
  min?: string;
  hasError?: boolean;
}

/** Leading empty cells when week row starts on Sunday (日 … 六). */
function leadingBlanksForMonth(firstOfMonth: DateTime): number {
  const dow = firstOfMonth.weekday; // Luxon: Mon=1 … Sun=7
  return dow === 7 ? 0 : dow;
}

function safeLocalDay(value: string): DateTime {
  if (!value?.trim()) return DateTime.now();
  const d = DateTime.fromISO(value, { zone: "local" });
  return d.isValid ? d : DateTime.now();
}

export default function LargeDatePicker({
  id,
  label,
  value,
  onChange,
  min,
  hasError,
}: LargeDatePickerProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const minDt = min ? DateTime.fromISO(min, { zone: "local" }).startOf("day") : null;

  const [cursor, setCursor] = useState(() => safeLocalDay(value).startOf("month"));

  useEffect(() => {
    if (!open) return;
    setCursor(safeLocalDay(value).startOf("month"));
  }, [open, value]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePanelPosition = () => {
    const el = buttonRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.min(Math.max(r.width, 300), 360);
    let left = r.left;
    if (left + width > window.innerWidth - 12) left = window.innerWidth - 12 - width;
    if (left < 12) left = 12;
    const estHeight = 380;
    let top = r.bottom + 8;
    if (top + estHeight > window.innerHeight - 12) {
      top = Math.max(12, r.top - estHeight - 8);
    }
    setPanelPos({ top, left, width });
  };

  useLayoutEffect(() => {
    if (!open) {
      setPanelPos(null);
      return;
    }
    updatePanelPosition();
    const onScroll = () => updatePanelPosition();
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, cursor]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (buttonRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const cells = useMemo(() => {
    const first = cursor.startOf("month");
    const lead = leadingBlanksForMonth(first);
    const startGrid = first.minus({ days: lead });
    const out: { dt: DateTime; inMonth: boolean }[] = [];
    let d = startGrid;
    for (let i = 0; i < 42; i++) {
      out.push({ dt: d, inMonth: d.month === cursor.month });
      d = d.plus({ days: 1 });
    }
    return out;
  }, [cursor]);

  const displayText = value?.trim()
    ? safeLocalDay(value).toFormat("yyyy / MM / dd")
    : "選擇日期…";

  const pick = (dt: DateTime) => {
    const day = dt.startOf("day");
    if (minDt && day < minDt) return;
    onChange(day.toFormat("yyyy-MM-dd"));
    setOpen(false);
  };

  const prevMonth = () => setCursor((c) => c.minus({ months: 1 }).startOf("month"));
  const nextMonth = () => setCursor((c) => c.plus({ months: 1 }).startOf("month"));

  const weekLabels = ["日", "一", "二", "三", "四", "五", "六"];

  const panel =
    open && mounted && panelPos ? (
      <div
        ref={panelRef}
        className="fixed z-[100] rounded-xl border border-gray-200 bg-white p-4 shadow-2xl"
        style={{
          top: panelPos.top,
          left: panelPos.left,
          width: panelPos.width,
        }}
        role="dialog"
        aria-label={label}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={prevMonth}
            className="rounded-lg px-3 py-2 text-lg font-semibold text-gray-700 hover:bg-gray-100"
            aria-label="上個月"
          >
            ‹
          </button>
          <span className="text-base font-semibold text-gray-900">
            {cursor.setLocale("zh-TW").toFormat("yyyy年 M月")}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            className="rounded-lg px-3 py-2 text-lg font-semibold text-gray-700 hover:bg-gray-100"
            aria-label="下個月"
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-sm font-medium text-gray-500">
          {weekLabels.map((w) => (
            <div key={w} className="py-1">
              {w}
            </div>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map(({ dt, inMonth }, idx) => {
            const day = dt.startOf("day");
            const disabled = !!(minDt && day < minDt);
            const isSelected = !!value && day.toFormat("yyyy-MM-dd") === value;
            if (!inMonth) {
              return <div key={`pad-${idx}`} className="h-11 min-h-[2.75rem]" aria-hidden />;
            }
            return (
              <button
                key={dt.toISODate() ?? idx}
                type="button"
                disabled={disabled}
                onClick={() => pick(dt)}
                className={[
                  "flex h-11 min-h-[2.75rem] w-full items-center justify-center rounded-lg text-base font-medium transition-colors",
                  !disabled ? "text-gray-900 hover:bg-ntu-green/15" : "",
                  disabled ? "cursor-not-allowed text-gray-300" : "",
                  isSelected ? "bg-ntu-green text-white hover:bg-ntu-green" : "",
                ].join(" ")}
              >
                {dt.day}
              </button>
            );
          })}
        </div>
      </div>
    ) : null;

  return (
    <div className="relative">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`w-full min-h-[3rem] px-4 py-3 text-left text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green ${
          hasError ? "border-red-400" : "border-gray-300"
        } ${value ? "text-gray-900" : "text-gray-500"}`}
      >
        {displayText}
      </button>

      {mounted && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
