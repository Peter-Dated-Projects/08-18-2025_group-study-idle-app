import React from "react";

interface MessageDisplayProps {
  message: string;
  messageType: "success" | "error" | "";
}

export function MessageDisplay({ message, messageType }: MessageDisplayProps) {
  if (!message || !messageType) return null;

  const baseClasses = "px-4 py-3 rounded font-bold text-sm mb-4";
  const variantClasses = {
    success: "bg-[#5cb370] text-white",
    error: "bg-[#c85a54] text-white",
  };

  return (
    <div className={`${baseClasses} ${variantClasses[messageType]}`}>
      {message}
    </div>
  );
}

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
}

export function LoadingSpinner({ size = "md" }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5", 
    lg: "w-8 h-8",
  };

  return (
    <div
      className={`${sizeClasses[size]} border-3 border-[#a0622d] border-t-transparent rounded-full animate-spin`}
    />
  );
}

interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
}

export function LoadingOverlay({ isLoading, children }: LoadingOverlayProps) {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-10 flex items-center justify-center z-[1000]">
          <LoadingSpinner size="lg" />
        </div>
      )}
    </div>
  );
}
