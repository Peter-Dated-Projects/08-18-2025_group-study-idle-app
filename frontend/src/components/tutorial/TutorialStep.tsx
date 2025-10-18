"use client";

import React, { useEffect, useState, useRef } from "react";
import { TutorialStepComponentProps } from "./types";
import { FONTCOLOR, BORDERLINE, PANELFILL, BORDERFILL } from "../constants";

/**
 * TutorialStep Component
 * Displays a single tutorial step with positioning relative to a target element
 */
export default function TutorialStep({
  step,
  currentIndex,
  totalSteps,
  onNext,
  onBack,
  onFinish,
  isFirst,
  isLast,
}: TutorialStepComponentProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const stepRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const calculatePosition = () => {
      const targetElement = document.querySelector(step.targetSelector);

      if (!targetElement || !stepRef.current) {
        // Fallback to center of screen if target not found
        setPosition({
          top: window.innerHeight / 2 - 150,
          left: window.innerWidth / 2 - 175,
        });
        return;
      }

      const targetRect = targetElement.getBoundingClientRect();
      const stepRect = stepRef.current.getBoundingClientRect();

      let top = 0;
      let left = 0;

      const offset = step.offset || { x: 0, y: 0 };
      const gap = 20; // Gap between target and tutorial step

      switch (step.position) {
        case "top":
          top = targetRect.top - stepRect.height - gap + offset.y;
          left = targetRect.left + targetRect.width / 2 - stepRect.width / 2 + offset.x;
          break;
        case "bottom":
          top = targetRect.bottom + gap + offset.y;
          left = targetRect.left + targetRect.width / 2 - stepRect.width / 2 + offset.x;
          break;
        case "left":
          top = targetRect.top + targetRect.height / 2 - stepRect.height / 2 + offset.y;
          left = targetRect.left - stepRect.width - gap + offset.x;
          break;
        case "right":
          top = targetRect.top + targetRect.height / 2 - stepRect.height / 2 + offset.y;
          left = targetRect.right + gap + offset.x;
          break;
      }

      // Ensure the tutorial step stays within viewport bounds
      const padding = 10;
      top = Math.max(padding, Math.min(top, window.innerHeight - stepRect.height - padding));
      left = Math.max(padding, Math.min(left, window.innerWidth - stepRect.width - padding));

      setPosition({ top, left });
    };

    // Calculate position on mount and when step changes
    calculatePosition();

    // Recalculate on window resize or scroll
    const handleUpdate = () => {
      requestAnimationFrame(calculatePosition);
    };

    window.addEventListener("resize", handleUpdate);
    window.addEventListener("scroll", handleUpdate, true);

    return () => {
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("scroll", handleUpdate, true);
    };
  }, [step]);

  // Add arrow/pointer based on position
  const getArrowStyles = () => {
    const arrowSize = 12;
    const baseStyle = {
      position: "absolute" as const,
      width: 0,
      height: 0,
    };

    switch (step.position) {
      case "top":
        return {
          ...baseStyle,
          bottom: -arrowSize * 2,
          left: "50%",
          transform: "translateX(-50%)",
          borderLeft: `${arrowSize}px solid transparent`,
          borderRight: `${arrowSize}px solid transparent`,
          borderTop: `${arrowSize}px solid ${BORDERLINE}`,
          borderBottom: "none",
        };
      case "bottom":
        return {
          ...baseStyle,
          top: -arrowSize * 2,
          left: "50%",
          transform: "translateX(-50%)",
          borderLeft: `${arrowSize}px solid transparent`,
          borderRight: `${arrowSize}px solid transparent`,
          borderBottom: `${arrowSize}px solid ${BORDERLINE}`,
          borderTop: "none",
        };
      case "left":
        return {
          ...baseStyle,
          right: -arrowSize * 2,
          top: "50%",
          transform: "translateY(-50%)",
          borderTop: `${arrowSize}px solid transparent`,
          borderBottom: `${arrowSize}px solid transparent`,
          borderLeft: `${arrowSize}px solid ${BORDERLINE}`,
          borderRight: "none",
        };
      case "right":
        return {
          ...baseStyle,
          left: -arrowSize * 2,
          top: "50%",
          transform: "translateY(-50%)",
          borderTop: `${arrowSize}px solid transparent`,
          borderBottom: `${arrowSize}px solid transparent`,
          borderRight: `${arrowSize}px solid ${BORDERLINE}`,
          borderLeft: "none",
        };
    }
  };

  if (!position) return null;

  return (
    <div
      ref={stepRef}
      className="tutorial-step"
      style={{
        position: "fixed",
        top: `${position.top}px`,
        left: `${position.left}px`,
        backgroundColor: PANELFILL,
        border: `3px solid ${BORDERLINE}`,
        borderRadius: "12px",
        width: "350px",
        maxWidth: "90vw",
        zIndex: 10001,
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
        animation: "tutorialFadeIn 0.3s ease-out",
      }}
    >
      {/* Arrow/Pointer */}
      <div style={getArrowStyles()} />

      {/* Header with step counter */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{
          backgroundColor: BORDERFILL,
          borderBottom: `2px solid ${BORDERLINE}`,
          borderTopLeftRadius: "9px",
          borderTopRightRadius: "9px",
        }}
      >
        <h3 className="m-0 text-base font-bold" style={{ color: FONTCOLOR }}>
          {step.title}
        </h3>
        <span
          className="text-sm font-semibold px-2 py-1 rounded"
          style={{
            backgroundColor: BORDERLINE,
            color: PANELFILL,
          }}
        >
          {currentIndex + 1} / {totalSteps}
        </span>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        <p className="m-0 text-sm leading-relaxed" style={{ color: FONTCOLOR }}>
          {step.description}
        </p>
      </div>

      {/* Footer with navigation buttons */}
      <div
        className="px-4 py-3 flex items-center justify-between gap-2"
        style={{
          borderTop: `2px solid ${BORDERLINE}`,
          backgroundColor: BORDERFILL,
          borderBottomLeftRadius: "9px",
          borderBottomRightRadius: "9px",
        }}
      >
        <button
          onClick={onBack}
          disabled={isFirst}
          className="px-4 py-2 rounded font-semibold text-sm transition-all"
          style={{
            backgroundColor: isFirst ? "#ccc" : BORDERLINE,
            color: isFirst ? "#888" : PANELFILL,
            border: "none",
            cursor: isFirst ? "not-allowed" : "pointer",
            opacity: isFirst ? 0.5 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isFirst) {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.2)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          ← Back
        </button>

        <button
          onClick={isLast ? onFinish : onNext}
          className="px-4 py-2 rounded font-semibold text-sm transition-all"
          style={{
            backgroundColor: BORDERLINE,
            color: PANELFILL,
            border: "none",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          {isLast ? "Finish ✓" : "Next →"}
        </button>
      </div>

      <style jsx>{`
        @keyframes tutorialFadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
