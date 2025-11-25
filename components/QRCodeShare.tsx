"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { useI18n } from "@/lib/i18n/context";

// Dynamically import QRCode to avoid SSR issues
const QRCodeSVG = dynamic(
  () => import("qrcode.react").then((mod) => ({ default: mod.QRCodeSVG })),
  {
    ssr: false,
    loading: () => <div className="w-48 h-48 bg-gray-100 animate-pulse rounded" />,
  }
);

interface QRCodeShareProps {
  title?: string;
  className?: string;
}

export default function QRCodeShare({ 
  title,
  className = ""
}: QRCodeShareProps) {
  const { t } = useI18n();
  const [showModal, setShowModal] = useState(false);
  const pathname = usePathname();
  const currentUrl = typeof window !== "undefined" 
    ? `${window.location.origin}${pathname}`
    : "";
  
  const displayTitle = title || t('share.qrCodeTitle');

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`flex items-center gap-2 px-3 sm:px-4 py-2 bg-white text-ntu-green rounded-lg hover:bg-gray-50 transition-all duration-300 border-2 border-ntu-green shadow-md hover:shadow-xl hover:scale-105 text-sm sm:text-base font-medium ${className}`}
      >
        <span className="text-base sm:text-lg">📱</span>
        <span>QR Code</span>
      </button>

      {showModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
          <h3 className="text-2xl font-bold text-ntu-green mb-4 text-center">
            {displayTitle}
          </h3>
            <div className="flex justify-center mb-4">
              {typeof window !== "undefined" && currentUrl && (
                <QRCodeSVG
                  value={currentUrl}
                  size={256}
                  level="H"
                  includeMargin={true}
                />
              )}
            </div>
            <p className="text-sm text-gray-600 text-center mb-4 break-all">
              {currentUrl}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(currentUrl);
                  alert("連結已複製！");
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {t('share.copyLink')}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 bg-ntu-green text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                {t('share.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

