import React, { ReactNode } from "react";
import { FONTCOLOR, BORDERLINE, PANELFILL, BORDERFILL } from "../constants";

interface BaseModalProps {
  isVisible: boolean;
  onClose: () => void;
  title?: string;
  icon?: ReactNode;
  children: ReactNode;
  width?: string;
  maxHeight?: string;
  showCloseButton?: boolean;
  showHeader?: boolean;
  headerContent?: ReactNode;
  footerContent?: ReactNode;
  className?: string;
  zIndex?: number;
  constrainToCanvas?: boolean;
}

export default function BaseModal({
  isVisible,
  onClose,
  title,
  icon,
  children,
  width = "500px",
  maxHeight = "600px",
  showCloseButton = true,
  showHeader = true,
  headerContent,
  footerContent,
  className = "",
  zIndex = 1000,
  constrainToCanvas = false,
}: BaseModalProps) {
  if (!isVisible) return null;

  // Determine positioning based on constrainToCanvas prop
  const overlayStyle = constrainToCanvas
    ? {
        position: "absolute" as const,
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex,
      }
    : {
        position: "fixed" as const,
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0, 0, 0, 0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex,
      };

  // Set default dimensions for canvas-constrained modals
  const modalWidth = constrainToCanvas ? "50%" : width;
  const modalMaxHeight = constrainToCanvas ? "80%" : maxHeight;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div
        style={{
          backgroundColor: PANELFILL,
          border: `3px solid ${BORDERLINE}`,
          borderRadius: "8px",
          width: modalWidth,
          maxHeight: modalMaxHeight,
          height: constrainToCanvas ? "80%" : "auto",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        className={className}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {showHeader && (
          <div
            style={{
              backgroundColor: BORDERFILL,
              borderBottom: `2px solid ${BORDERLINE}`,
              padding: "15px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {icon && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    fontSize: "18px",
                    color: FONTCOLOR,
                  }}
                >
                  {icon}
                </div>
              )}
              {title && (
                <h2 style={{ color: FONTCOLOR, margin: 0, fontSize: "18px", fontWeight: "bold" }}>
                  {title}
                </h2>
              )}
              {headerContent}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                style={{
                  background: "none",
                  border: "none",
                  color: FONTCOLOR,
                  fontSize: "20px",
                  cursor: "pointer",
                  padding: "5px",
                  borderRadius: "4px",
                  backgroundColor: BORDERLINE,
                }}
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflow: "auto",
          }}
        >
          {children}
        </div>

        {/* Footer */}
        {footerContent && (
          <div
            style={{
              borderTop: `2px solid ${BORDERLINE}`,
              padding: "15px 20px",
              backgroundColor: BORDERFILL,
            }}
          >
            {footerContent}
          </div>
        )}
      </div>
    </div>
  );
}
