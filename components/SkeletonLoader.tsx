"use client";

interface SkeletonLoaderProps {
  className?: string;
  lines?: number;
  variant?: "text" | "card" | "button" | "circle";
}

export default function SkeletonLoader({ 
  className = "",
  lines = 1,
  variant = "text"
}: SkeletonLoaderProps) {
  if (variant === "card") {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 animate-pulse ${className}`}>
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
    );
  }

  if (variant === "button") {
    return (
      <div className={`h-10 bg-gray-200 rounded-lg animate-pulse ${className}`}></div>
    );
  }

  if (variant === "circle") {
    return (
      <div className={`rounded-full bg-gray-200 animate-pulse ${className}`}></div>
    );
  }

  // Default: text variant
  return (
    <div className={className}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-4 bg-gray-200 rounded mb-2 animate-pulse ${
            i === lines - 1 ? "w-5/6" : "w-full"
          }`}
        ></div>
      ))}
    </div>
  );
}
