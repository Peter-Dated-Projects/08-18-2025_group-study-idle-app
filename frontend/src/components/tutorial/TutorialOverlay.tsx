"use client";

import React, { useState, useEffect } from "react";
import TutorialStep from "./TutorialStep";
import { TutorialConfig } from "./types";

interface TutorialOverlayProps {
  config: TutorialConfig;
  isActive: boolean;
  onClose?: () => void;
}

/**
 * TutorialOverlay Component
 * Main tutorial system that manages the tutorial flow and displays tutorial steps
 */
export default function TutorialOverlay({ config, isActive, onClose }: TutorialOverlayProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(config.initialStep || 0);
  const [isVisible, setIsVisible] = useState(isActive);

  useEffect(() => {
    setIsVisible(isActive);
    if (isActive) {
      setCurrentStepIndex(config.initialStep || 0);
    }
  }, [isActive, config.initialStep]);

  // Get current step data (needed for hooks below)
  const currentStep = config.steps[currentStepIndex];
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === config.steps.length - 1;

  const handleNext = () => {
    if (!isLast) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (!isFirst) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleFinish = () => {
    setIsVisible(false);
    if (config.onComplete) {
      config.onComplete();
    }
    if (onClose) {
      onClose();
    }
  };

  const handleSkip = () => {
    setIsVisible(false);
    if (config.onSkip) {
      config.onSkip();
    }
    if (onClose) {
      onClose();
    }
  };

  // Highlight target element with subtle effect - don't change z-index to avoid hiding other elements
  useEffect(() => {
    if (!isVisible || !currentStep?.highlightTarget) return;

    const targetElement = document.querySelector(currentStep.targetSelector);
    if (!targetElement) return;

    const htmlElement = targetElement as HTMLElement;
    const originalBoxShadow = htmlElement.style.boxShadow;

    // Subtle highlight without modifying z-index or position
    htmlElement.style.boxShadow = "0 0 0 3px rgba(212, 148, 74, 0.4)"; // Subtle orange glow
    htmlElement.style.transition = "box-shadow 0.3s ease";

    return () => {
      // Restore original styles
      htmlElement.style.boxShadow = originalBoxShadow;
    };
  }, [currentStep, isVisible]);

  // Early return AFTER all hooks
  if (!isVisible || !config.steps.length) return null;

  return (
    <>
      {/* Invisible overlay - no background, no blur, just for click detection */}
      <div
        className="tutorial-overlay"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "transparent",
          zIndex: 10000,
          pointerEvents: "none", // Let clicks pass through to underlying elements
        }}
      >
        {/* Skip button */}
        {config.allowSkip && (
          <button
            onClick={handleSkip}
            className="tutorial-skip-button"
            style={{
              position: "fixed",
              top: "20px",
              right: "20px",
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              color: "#333",
              border: "2px solid #ccc",
              borderRadius: "8px",
              padding: "10px 20px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              zIndex: 10002,
              transition: "all 0.2s ease",
              pointerEvents: "auto", // Re-enable pointer events for the button
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 1)";
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.9)";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            Skip Tutorial ✕
          </button>
        )}
      </div>

      {/* Tutorial Step */}
      <TutorialStep
        step={currentStep}
        currentIndex={currentStepIndex}
        totalSteps={config.steps.length}
        onNext={handleNext}
        onBack={handleBack}
        onFinish={handleFinish}
        isFirst={isFirst}
        isLast={isLast}
      />
    </>
  );
}
