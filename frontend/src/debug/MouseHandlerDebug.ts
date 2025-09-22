/**
 * Debug utilities for MouseHandler
 */

import { mouseHandler } from "@/engine/input/MouseHandler";

/**
 * Add debug information to the console for mouse handler state
 */
export function debugMouseHandler(): void {
  if (!mouseHandler) {
    console.log("🔍 MouseHandler Debug: Handler not initialized");
    return;
  }

  const state = mouseHandler.getState();
  if (!state) {
    console.log("🔍 MouseHandler Debug: No state available");
    return;
  }

  // Try to access internal state for current position
  const internalState = (mouseHandler as any).state;
  if (internalState && internalState.currentWorldPosition) {
    console.log("  currentWorldPosition:", internalState.currentWorldPosition);
  }

  // Check if indicator exists and is visible
  const indicator = (mouseHandler as any).mouseIndicator;
  if (indicator) {
    console.log("  indicator exists:", true);
    console.log("  indicator visible:", indicator.visible);
    console.log("  indicator position:", indicator.position);
    console.log("  indicator parent:", indicator.parent ? "has parent" : "no parent");
  } else {
    console.log("  indicator exists:", false);
  }
}

/**
 * Enable enhanced debugging for mouse events
 */
export function enableMouseEventDebugging(): void {
  if (typeof document === "undefined") {
    return;
  }

  // Add event listeners to track mouse events at the document level
  document.addEventListener("mousemove", (e) => {
    console.log(`📍 Document mousemove: (${e.clientX}, ${e.clientY})`);
  });

  // Check if canvas element has proper event listeners
  const canvas = document.querySelector("canvas");
  if (canvas) {
    // Test if canvas receives mouse events
    canvas.addEventListener("mousemove", (e) => {
      console.log(`🎯 Canvas mousemove: (${e.clientX}, ${e.clientY})`);
    });

    canvas.addEventListener("mouseenter", () => {
      console.log("🎯 Canvas mouseenter");
    });

    canvas.addEventListener("mouseleave", () => {
      console.log("🎯 Canvas mouseleave");
    });
  } else {
    console.log("❌ No canvas element found");
  }
}

/**
 * Test mouse handler functionality
 */
export function testMouseHandler(): void {
  console.log("🧪 Testing MouseHandler...");
  debugMouseHandler();

  if (mouseHandler) {
    // Check state again
    setTimeout(() => {
      console.log("🧪 State after activation:");
      debugMouseHandler();
    }, 100);
  }
}

// Make functions available globally for console debugging (browser only)
if (typeof window !== "undefined") {
  (window as any).debugMouseHandler = debugMouseHandler;
  (window as any).enableMouseEventDebugging = enableMouseEventDebugging;
  (window as any).testMouseHandler = testMouseHandler;
}
