import React, { ReactNode } from "react";

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
  const overlayClasses = constrainToCanvas
    ? "absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center"
    : "fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center";

  // Set default dimensions for canvas-constrained modals
  const modalWidth = constrainToCanvas ? "50%" : width;
  const modalMaxHeight = constrainToCanvas ? "50%" : maxHeight;

  return (
    <div 
      className={overlayClasses}
      style={{ zIndex }}
      onClick={onClose}
    >
      <div
        className={`bg-[#fdf4e8] border-3 border-[#a0622d] rounded-lg flex flex-col overflow-hidden ${className}`}
        style={{
          width: modalWidth,
          maxHeight: modalMaxHeight,
          height: constrainToCanvas ? "50%" : "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {showHeader && (
          <div className="bg-[#e4be93ff] border-b-2 border-[#a0622d] px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {icon && (
                <div className="flex items-center text-lg text-[#2c1810]">
                  {icon}
                </div>
              )}
              {title && (
                <h2 className="text-[#2c1810] m-0 text-lg font-bold">
                  {title}
                </h2>
              )}
              {headerContent}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="bg-none border-none text-[#2c1810] text-xl cursor-pointer p-1 rounded bg-[#a0622d] hover:bg-[#8a5425] transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>

        {/* Footer */}
        {footerContent && (
          <div className="border-t-2 border-[#a0622d] px-5 py-4 bg-[#e4be93ff]">
            {footerContent}
          </div>
        )}
      </div>
    </div>
  );
}
