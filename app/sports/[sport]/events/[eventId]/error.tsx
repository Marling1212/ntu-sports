"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function EventError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();

  useEffect(() => {
    console.error(error);
  }, [error]);

  // /sports/tennis/events/xxx -> sport = tennis
  const pathParts = pathname?.split("/") ?? [];
  const sportIndex = pathParts.indexOf("sports");
  const sportSlug = sportIndex >= 0 && pathParts[sportIndex + 1] ? pathParts[sportIndex + 1] : null;
  const eventListHref = sportSlug ? `/sports/${sportSlug}` : "/";

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8 max-w-md text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">賽事載入失敗</h1>
        <p className="text-gray-600 mb-6">
          無法載入此賽事資料，請稍後再試或返回賽事列表。
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 rounded-lg bg-ntu-green text-white font-medium hover:bg-green-700 transition-colors"
          >
            重試
          </button>
          <Link
            href={eventListHref}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            返回賽事列表
          </Link>
          <Link
            href="/"
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            返回首頁
          </Link>
        </div>
      </div>
    </div>
  );
}
