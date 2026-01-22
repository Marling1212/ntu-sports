"use client";

import { useState, useEffect, ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import LoadingSpinner from "./LoadingSpinner";

interface LoadingLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  prefetch?: boolean;
}

export default function LoadingLink({
  href,
  children,
  className = "",
  onClick,
  prefetch = true,
}: LoadingLinkProps) {
  const [isNavigating, setIsNavigating] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Reset loading state when pathname changes (navigation completed)
    if (pathname === href) {
      setIsNavigating(false);
    }
  }, [pathname, href]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Only show loading if navigating to a different page
    if (pathname !== href) {
      setIsNavigating(true);
    }
    
    if (onClick) {
      onClick();
    }
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      prefetch={prefetch}
      className={`relative inline-flex items-center ${className} ${isNavigating ? "opacity-70 cursor-wait" : ""} transition-opacity`}
    >
      {isNavigating && (
        <span className="ml-2">
          <LoadingSpinner size="sm" />
        </span>
      )}
      {children}
    </Link>
  );
}
