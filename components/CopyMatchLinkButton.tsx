"use client";

import { useI18n } from "@/lib/i18n/context";
import toast from "react-hot-toast";

interface CopyMatchLinkButtonProps {
  /** If not provided, uses current page URL (for match detail page). */
  matchUrl?: string;
  className?: string;
}

export default function CopyMatchLinkButton({ matchUrl, className = "" }: CopyMatchLinkButtonProps) {
  const { t } = useI18n();

  const handleCopy = async () => {
    const url = matchUrl ?? (typeof window !== "undefined" ? window.location.href : "");
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("share.linkCopied"));
    } catch {
      toast.error(t("share.copyFailed"));
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-ntu-green hover:text-ntu-green transition-colors text-sm font-medium ${className}`}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h2m8 0v2m0 8v2a2 2 0 01-2 2h-8a2 2 0 01-2-2v-8a2 2 0 012-2h2m0 8V6m0 8h8" />
      </svg>
      {t("matchDetail.copyMatchLink")}
    </button>
  );
}
