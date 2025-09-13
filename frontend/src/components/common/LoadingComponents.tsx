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
    <div style={{ position: "relative" }}>
      {children}
      {isLoading && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <LoadingSpinner size="30px" />
        </div>
      )}
    </div>
  );
}
