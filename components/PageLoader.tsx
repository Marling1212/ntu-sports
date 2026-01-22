"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import LoadingSpinner from "./LoadingSpinner";

export default function PageLoader() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Reset loading state when pathname changes
    setLoading(false);
  }, [pathname]);

  // This component can be enhanced with router events in the future
  // For now, it provides a foundation for page-level loading states

  if (!loading) return null;

  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-8">
        <LoadingSpinner size="lg" text="載入頁面中..." />
      </div>
    </div>
  );
}
