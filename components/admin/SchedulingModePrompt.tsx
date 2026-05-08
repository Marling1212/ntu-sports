"use client";

import { useEffect, useState } from "react";

interface SchedulingModePromptProps {
  eventId: string;
}

export default function SchedulingModePrompt({ eventId }: SchedulingModePromptProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const key = `scheduling_mode_prompt_seen_${eventId}`;
    const seen = typeof window !== "undefined" ? window.localStorage.getItem(key) : "1";
    if (!seen) setOpen(true);
  }, [eventId]);

  const pickMode = (targetId: string) => {
    const key = `scheduling_mode_prompt_seen_${eventId}`;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(key, "1");
      setOpen(false);
      setTimeout(() => {
        const target = document.getElementById(targetId);
        target?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
        <h2 className="mb-2 text-2xl font-bold text-ntu-green">你要用哪一種排程方式？</h2>
        <p className="mb-5 text-sm text-gray-600">
          兩種都可用；先選一種開始，之後也可以再使用另一區塊。
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => pickMode("fixed-scheduling-section")}
            className="rounded-xl border-2 border-ntu-green bg-ntu-green/5 p-4 text-left transition-colors hover:bg-ntu-green/10"
          >
            <p className="mb-1 font-semibold text-ntu-green">固定時間排程（區塊一）</p>
            <p className="text-xs text-gray-600">適合一天場次較少、每場開賽時間可先決定。</p>
          </button>
          <button
            type="button"
            onClick={() => pickMode("schedule-items")}
            className="rounded-xl border-2 border-purple-300 bg-purple-50 p-4 text-left transition-colors hover:bg-purple-100"
          >
            <p className="mb-1 font-semibold text-purple-700">比賽日與賽程說明（區塊二）</p>
            <p className="text-xs text-gray-600">
              編輯公開頁「規則與賽程時間」的比賽日行程與文字說明。適合場次會依前一場進度接續、需在規則頁交代日程時。
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
