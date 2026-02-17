"use client";

import { useI18n } from "@/lib/i18n/context";
import toast from "react-hot-toast";
import { generateMatchICS, downloadICS } from "@/lib/utils/ics";

interface AddToCalendarButtonProps {
  title: string;
  description?: string;
  location?: string;
  startTime: string | null | undefined;
  endTime?: string | null;
  url?: string;
  className?: string;
}

export default function AddToCalendarButton({
  title,
  description,
  location,
  startTime,
  endTime,
  url,
  className = "",
}: AddToCalendarButtonProps) {
  const { t } = useI18n();

  const handleClick = () => {
    const eventUrl = url ?? (typeof window !== "undefined" ? window.location.href : undefined);
    const content = generateMatchICS({
      title,
      description,
      location,
      startTime,
      endTime,
      url: eventUrl,
    });
    const safeTitle = title.replace(/[^a-zA-Z0-9\u4e00-\u9fff\s-]/g, "").slice(0, 40) || "match";
    downloadICS(content, `${safeTitle}.ics`);
    toast.success(t("matchDetail.addToCalendarSuccess"));
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-ntu-green hover:text-ntu-green transition-colors text-sm font-medium ${className}`}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      {t("matchDetail.addToCalendar")}
    </button>
  );
}
