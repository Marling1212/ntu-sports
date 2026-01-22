"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";
import LoadingSpinner from "./LoadingSpinner";

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  variant?: "primary" | "secondary" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

export default function LoadingButton({
  isLoading = false,
  loadingText,
  variant = "primary",
  size = "md",
  children,
  className = "",
  disabled,
  ...props
}: LoadingButtonProps) {
  const baseStyles = "font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variantStyles = {
    primary: "bg-ntu-green text-white hover:bg-green-700 focus:ring-ntu-green active:scale-95",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400 active:scale-95",
    danger: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-500 active:scale-95",
    outline: "border-2 border-ntu-green text-ntu-green hover:bg-ntu-green hover:text-white focus:ring-ntu-green active:scale-95",
  };

  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  const isDisabled = disabled || isLoading;

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={isDisabled}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center justify-center gap-2">
          <LoadingSpinner size="sm" />
          {loadingText || "載入中..."}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
