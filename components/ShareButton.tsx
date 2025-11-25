"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import toast from "react-hot-toast";

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
      toast.success("連結已複製到剪貼簿！");
      setShowMenu(false);
    } catch (err) {
      toast.error("複製失敗，請手動複製");
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
        className="flex items-center gap-2 px-4 py-2 bg-ntu-green text-white rounded-lg hover:bg-green-700 transition-colors shadow-md hover:shadow-lg"
      >
        <span>📤</span>
        <span>分享</span>
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
              <span>分享到 Facebook</span>
            </button>
            <button
              onClick={shareToLine}
              className="w-full px-4 py-3 text-left hover:bg-green-50 transition-colors flex items-center gap-3"
            >
              <span className="text-xl">💬</span>
              <span>分享到 Line</span>
            </button>
            <button
              onClick={shareToTwitter}
              className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors flex items-center gap-3"
            >
              <span className="text-xl">🐦</span>
              <span>分享到 Twitter</span>
            </button>
            <button
              onClick={copyLink}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 border-t border-gray-200"
            >
              <span className="text-xl">🔗</span>
              <span>複製連結</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

