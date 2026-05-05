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
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-ntu-green mb-2">你要用哪一種排程方式？</h2>
        <p className="text-sm text-gray-600 mb-5">
          兩種都可用；先選一種開始，等一下也可以再切換。
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={() => pickMode("fixed-scheduling-section")}
            className="text-left rounded-xl border-2 border-ntu-green bg-ntu-green/5 p-4 hover:bg-ntu-green/10 transition-colors"
          >
            <p className="font-semibold text-ntu-green mb-1">固定時間排程（每場設定時間）</p>
            <p className="text-xs text-gray-600">適合一天場次較少、每場時間可先決定。</p>
          </button>
          <button
            onClick={() => pickMode("slot-templates")}
            className="text-left rounded-xl border-2 border-purple-300 bg-purple-50 p-4 hover:bg-purple-100 transition-colors"
          >
            <p className="font-semibold text-purple-700 mb-1">比賽日模式（依時段／前場結束接續）</p>
            <p className="text-xs text-gray-600">適合一天很多場，需動態接續安排。</p>
          </button>
        </div>
      </div>
    </div>
  );
}

