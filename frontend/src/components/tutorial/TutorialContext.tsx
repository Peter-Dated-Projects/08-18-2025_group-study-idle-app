"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { TutorialConfig } from "./types";

interface TutorialContextValue {
  /**
   * Start a tutorial with the given configuration
   */
  startTutorial: (config: TutorialConfig) => void;
  /**
   * Stop the current tutorial
   */
  stopTutorial: () => void;
  /**
   * Check if a tutorial is currently active
   */
  isTutorialActive: boolean;
  /**
   * Get the current tutorial configuration
   */
  currentTutorial: TutorialConfig | null;
}

const TutorialContext = createContext<TutorialContextValue | undefined>(undefined);

interface TutorialProviderProps {
  children: ReactNode;
}

/**
 * TutorialProvider Component
 * Provides tutorial state management across the application
 */
export function TutorialProvider({ children }: TutorialProviderProps) {
  const [currentTutorial, setCurrentTutorial] = useState<TutorialConfig | null>(null);
  const [isTutorialActive, setIsTutorialActive] = useState(false);

  const startTutorial = useCallback((config: TutorialConfig) => {
    setCurrentTutorial(config);
    setIsTutorialActive(true);
  }, []);

  const stopTutorial = useCallback(() => {
    setIsTutorialActive(false);
    // Keep the config for a bit to allow for cleanup animations
    setTimeout(() => setCurrentTutorial(null), 300);
  }, []);

  const value: TutorialContextValue = {
    startTutorial,
    stopTutorial,
    isTutorialActive,
    currentTutorial,
  };

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
}

/**
 * Hook to access tutorial context
 */
export function useTutorial() {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error("useTutorial must be used within a TutorialProvider");
  }
  return context;
}
