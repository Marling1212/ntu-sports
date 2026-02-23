"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function SportError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8 max-w-md text-center">
        <div className="text-5xl mb-4">&#x26A0;&#xFE0F;</div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">Failed to load</h1>
        <p className="text-gray-600 mb-6">
          Could not load event info. Please try again.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 rounded-lg bg-ntu-green text-white font-medium hover:bg-green-700 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
