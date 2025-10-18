/**
 * Tutorial System Types
 * Defines the structure and configuration for the tutorial overlay system
 */

export type TutorialPosition = 'top' | 'bottom' | 'left' | 'right';

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  /**
   * CSS selector or element ID to position the tutorial step next to
   * e.g., "#my-button" or ".my-class"
   */
  targetSelector: string;
  /**
   * Position of the tutorial step relative to the target element
   */
  position: TutorialPosition;
  /**
   * Optional custom offset from the target element in pixels
   */
  offset?: { x: number; y: number };
  /**
   * Optional flag to highlight the target element
   */
  highlightTarget?: boolean;
}

export interface TutorialConfig {
  steps: TutorialStep[];
  /**
   * Callback when the tutorial is completed
   */
  onComplete?: () => void;
  /**
   * Callback when the tutorial is skipped/cancelled
   */
  onSkip?: () => void;
  /**
   * Optional initial step index (default: 0)
   */
  initialStep?: number;
  /**
   * Optional flag to allow skipping the tutorial
   */
  allowSkip?: boolean;
}

export interface TutorialStepComponentProps {
  step: TutorialStep;
  currentIndex: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
  onFinish: () => void;
  isFirst: boolean;
  isLast: boolean;
}
