"use client";

import dynamic from "next/dynamic";
import { ComponentProps } from "react";

// Dynamically import CountdownTimer with SSR disabled to prevent hydration mismatches
const CountdownTimer = dynamic(() => import("@/components/CountdownTimer"), {
  ssr: false,
  loading: () => (
    <div>
      <div className="grid grid-cols-4 gap-4 max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-4 text-center border border-gray-100">
          <div className="text-3xl font-bold text-ntu-green">00</div>
          <div className="text-sm text-gray-600 mt-2">Days</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 text-center border border-gray-100">
          <div className="text-3xl font-bold text-ntu-green">00</div>
          <div className="text-sm text-gray-600 mt-2">Hours</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 text-center border border-gray-100">
          <div className="text-3xl font-bold text-ntu-green">00</div>
          <div className="text-sm text-gray-600 mt-2">Minutes</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 text-center border border-gray-100">
          <div className="text-3xl font-bold text-ntu-green">00</div>
          <div className="text-sm text-gray-600 mt-2">Seconds</div>
        </div>
      </div>
    </div>
  ),
});

interface CountdownTimerWrapperProps {
  targetDate: Date;
  className?: string;
}

export default function CountdownTimerWrapper(props: CountdownTimerWrapperProps) {
  return <CountdownTimer {...props} />;
}


