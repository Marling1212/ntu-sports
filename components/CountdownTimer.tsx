"use client";

import { useState, useEffect } from "react";

interface CountdownTimerProps {
  targetDate: Date;
  className?: string;
}

export default function CountdownTimer({
  targetDate,
  className = "",
}: CountdownTimerProps) {
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    // Set mounted after component mounts
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = targetDate.getTime();
      const difference = target - now;

      if (difference <= 0) {
        setIsExpired(true);
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
        };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
      };
    };

    // Calculate initial time immediately
    setTimeLeft(calculateTimeLeft());

    // Update every second
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, mounted]);

  // Since this component is now only rendered on client (via dynamic import with ssr: false),
  // we can simplify the logic. However, we keep the mounted check as a safety measure.
  if (!mounted) {
    // Fallback during initial mount (though this shouldn't happen with ssr: false)
    return (
      <div className={`${className}`}>
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
    );
  }

  if (isExpired) {
    return (
      <div className={`text-center ${className}`}>
        <p className="text-2xl font-semibold text-ntu-green">Tournament has started!</p>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="grid grid-cols-4 gap-4 max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-4 text-center border border-gray-100">
          <div className="text-3xl font-bold text-ntu-green">
            {String(timeLeft.days).padStart(2, "0")}
          </div>
          <div className="text-sm text-gray-600 mt-2">Days</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 text-center border border-gray-100">
          <div className="text-3xl font-bold text-ntu-green">
            {String(timeLeft.hours).padStart(2, "0")}
          </div>
          <div className="text-sm text-gray-600 mt-2">Hours</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 text-center border border-gray-100">
          <div className="text-3xl font-bold text-ntu-green">
            {String(timeLeft.minutes).padStart(2, "0")}
          </div>
          <div className="text-sm text-gray-600 mt-2">Minutes</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 text-center border border-gray-100">
          <div className="text-3xl font-bold text-ntu-green">
            {String(timeLeft.seconds).padStart(2, "0")}
          </div>
          <div className="text-sm text-gray-600 mt-2">Seconds</div>
        </div>
      </div>
    </div>
  );
}

