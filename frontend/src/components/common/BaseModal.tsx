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
        className={`rounded-lg flex flex-col overflow-hidden ${className}`}
        style={{
          backgroundColor: PANELFILL,
          border: `3px solid ${BORDERLINE}`,
          width: modalWidth,
          maxHeight: modalMaxHeight,
          height: constrainToCanvas ? "80%" : "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {showHeader && (
          <div
            className="px-5 py-4 flex items-center justify-between"
            style={{
              backgroundColor: BORDERFILL,
              borderBottom: `2px solid ${BORDERLINE}`,
            }}
          >
            <div className="flex items-center gap-2.5">
              {icon && (
                <div className="flex items-center text-lg" style={{ color: FONTCOLOR }}>
                  {icon}
                </div>
              )}
              {title && (
                <h2 className="m-0 text-lg font-bold" style={{ color: FONTCOLOR }}>
                  {title}
                </h2>
              )}
              {headerContent}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="bg-none border-none text-xl cursor-pointer p-1 rounded"
                style={{
                  color: FONTCOLOR,
                  backgroundColor: BORDERLINE,
                }}
              >
                ✕
              </button>
            )}
          </div>
        )}

        <div className="flex-1 overflow-auto">{children}</div>

        {footerContent && (
          <div
            className="px-5 py-4"
            style={{
              borderTop: `2px solid ${BORDERLINE}`,
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
