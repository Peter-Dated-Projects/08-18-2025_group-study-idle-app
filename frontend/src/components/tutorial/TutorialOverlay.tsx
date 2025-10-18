import React, { useState, useEffect } from 'react';
import TutorialStep from './TutorialStep';
import { TutorialConfig } from './types';

interface TutorialOverlayProps {
  config: TutorialConfig;
  isActive: boolean;
  onClose?: () => void;
}

/**
 * TutorialOverlay Component
 * Main tutorial system that manages the tutorial flow and displays tutorial steps
 */
export default function TutorialOverlay({
  config,
  isActive,
  onClose,
}: TutorialOverlayProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(config.initialStep || 0);
  const [isVisible, setIsVisible] = useState(isActive);

  useEffect(() => {
    setIsVisible(isActive);
    if (isActive) {
      setCurrentStepIndex(config.initialStep || 0);
    }
  }, [isActive, config.initialStep]);

  if (!isVisible || !config.steps.length) return null;

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

  // Highlight target element
  useEffect(() => {
    if (!currentStep.highlightTarget) return;

    const targetElement = document.querySelector(currentStep.targetSelector);
    if (!targetElement) return;

    const htmlElement = targetElement as HTMLElement;
    const originalZIndex = htmlElement.style.zIndex;
    const originalPosition = htmlElement.style.position;
    const originalBoxShadow = htmlElement.style.boxShadow;

    // Highlight the target element
    htmlElement.style.position = originalPosition === 'static' ? 'relative' : originalPosition;
    htmlElement.style.zIndex = '10000';
    htmlElement.style.boxShadow = '0 0 0 4px rgba(212, 148, 74, 0.5), 0 0 20px rgba(212, 148, 74, 0.3)';
    htmlElement.style.transition = 'box-shadow 0.3s ease';

    return () => {
      // Restore original styles
      htmlElement.style.zIndex = originalZIndex;
      htmlElement.style.position = originalPosition;
      htmlElement.style.boxShadow = originalBoxShadow;
    };
  }, [currentStep]);

  return (
    <>
      {/* Semi-transparent overlay */}
      <div
        className="tutorial-overlay"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          zIndex: 10000,
          backdropFilter: 'blur(2px)',
        }}
        onClick={(e) => {
          // Only close if clicking on overlay, not on tutorial step
          if (e.target === e.currentTarget && config.allowSkip) {
            handleSkip();
          }
        }}
      >
        {/* Skip button */}
        {config.allowSkip && (
          <button
            onClick={handleSkip}
            className="tutorial-skip-button"
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              color: '#333',
              border: '2px solid #ccc',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              zIndex: 10002,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 1)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
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
