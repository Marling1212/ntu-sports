"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import toast from "react-hot-toast";
import { useI18n } from "@/lib/i18n/context";

interface ShareButtonProps {
  title?: string;
  description?: string;
  className?: string;
}

export default function ShareButton({ 
  title = "NTU Sports 賽事", 
  description = "查看最新賽事資訊",
  className = ""
}: ShareButtonProps) {
  const { t } = useI18n();
  const [showMenu, setShowMenu] = useState(false);
  const pathname = usePathname();
  const currentUrl = typeof window !== "undefined" 
    ? `${window.location.origin}${pathname}`
    : "";

  const shareToFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`;
    window.open(url, "_blank", "width=600,height=400");
    setShowMenu(false);
  };

  const shareToLine = () => {
    const url = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(currentUrl)}`;
    window.open(url, "_blank", "width=600,height=400");
    setShowMenu(false);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      toast.success(t('share.linkCopied'));
      setShowMenu(false);
    } catch (err) {
      toast.error(t('share.copyFailed'));
    }
  };

  const shareToTwitter = () => {
    const url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(title)}`;
    window.open(url, "_blank", "width=600,height=400");
    setShowMenu(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-ntu-green to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-300 shadow-md hover:shadow-xl hover:scale-105 text-sm sm:text-base font-medium"
      >
        <span className="text-base sm:text-lg">📤</span>
        <span>{t('nav.share')}</span>
      </button>

      {showMenu && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
            <button
              onClick={shareToFacebook}
              className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors flex items-center gap-3"
            >
              <span className="text-xl">📘</span>
              <span>{t('share.shareToFacebook')}</span>
            </button>
            <button
              onClick={shareToLine}
              className="w-full px-4 py-3 text-left hover:bg-green-50 transition-colors flex items-center gap-3"
            >
              <span className="text-xl">💬</span>
              <span>{t('share.shareToLine')}</span>
            </button>
            <button
              onClick={shareToTwitter}
              className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors flex items-center gap-3"
            >
              <span className="text-xl">🐦</span>
              <span>{t('share.shareToTwitter')}</span>
            </button>
            <button
              onClick={copyLink}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 border-t border-gray-200"
            >
              <span className="text-xl">🔗</span>
              <span>{t('share.copyLink')}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

