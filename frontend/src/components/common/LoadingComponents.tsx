import React from "react";
import { commonStyles } from "./styles";

interface MessageDisplayProps {
  message: string;
  messageType: "success" | "error" | "";
}

export function MessageDisplay({ message, messageType }: MessageDisplayProps) {
  if (!message || !messageType) return null;

  const style = messageType === "success" ? commonStyles.successMessage : commonStyles.errorMessage;

  return <div style={style}>{message}</div>;
}

interface LoadingSpinnerProps {
  size?: string;
}

export function LoadingSpinner({ size = "20px" }: LoadingSpinnerProps) {
  return (
    <div
      style={{
        ...commonStyles.loadingSpinner,
        width: size,
        height: size,
      }}
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
        <div className="absolute inset-0 bg-black/10 flex items-center justify-center z-[1000]">
          <LoadingSpinner size="30px" />
        </div>
      )}
    </div>
  );
}
