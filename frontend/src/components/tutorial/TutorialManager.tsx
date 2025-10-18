"use client";

import React from "react";
import TutorialOverlay from "./TutorialOverlay";
import { useTutorial } from "./TutorialContext";

/**
 * TutorialManager Component
 * Automatically renders the active tutorial from the TutorialContext
 * Add this component to your app's root layout to enable global tutorials
 */
export default function TutorialManager() {
  const { isTutorialActive, currentTutorial, stopTutorial } = useTutorial();

  if (!currentTutorial) return null;

  return (
    <TutorialOverlay config={currentTutorial} isActive={isTutorialActive} onClose={stopTutorial} />
  );
}
