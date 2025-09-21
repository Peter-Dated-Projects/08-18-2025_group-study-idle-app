import { mouseHandler } from "@/engine/input/MouseHandler";
import * as PIXI from "pixi.js";

/**
 * Manual MouseHandler Test - Force activate and test the main system
 */
export function forceTestMouseHandler(): void {
  console.log("🔧 Force Testing MouseHandler");

  if (typeof window === "undefined") {
    console.log("❌ Not in browser environment");
    return;
  }

  if (!mouseHandler) {
    console.log("❌ MouseHandler not found");
    return;
  }

  console.log("✅ MouseHandler found, forcing activation...");

  // Force activate
  mouseHandler.activate();

  // Check state
  const state = mouseHandler.getState();
  console.log("📊 State after forced activation:", state);

  // Check internal properties
  const internal = mouseHandler as any;
  console.log("🔍 Internal inspection:");
  console.log("  - mouseIndicator exists:", !!internal.mouseIndicator);
  console.log("  - worldContainer:", !!internal.worldContainer);
  console.log("  - pixiApp:", !!internal.pixiApp);
  console.log("  - canvasElement:", !!internal.canvasElement);

  if (internal.mouseIndicator) {
    console.log("🎯 Mouse Indicator Details:");
    console.log("  - visible:", internal.mouseIndicator.visible);
    console.log("  - position:", internal.mouseIndicator.position);
    console.log("  - parent:", internal.mouseIndicator.parent);
    console.log("  - zIndex:", internal.mouseIndicator.zIndex);
    console.log("  - alpha:", internal.mouseIndicator.alpha);

    // Force show the indicator at a specific position
    console.log("⚡ Force showing indicator at (200, 200)...");
    internal.mouseIndicator.visible = true;
    internal.mouseIndicator.position.set(200, 200);

    // Test manual repositioning
    setTimeout(() => {
      console.log("⚡ Moving indicator to (300, 300)...");
      internal.mouseIndicator.position.set(300, 300);
    }, 2000);

    setTimeout(() => {
      console.log("⚡ Moving indicator to (400, 400)...");
      internal.mouseIndicator.position.set(400, 400);
    }, 4000);
  }

  // Test coordinate conversion directly
  console.log("🧮 Testing coordinate conversion:");
  try {
    const worldCoords1 = mouseHandler.mouseToWorldCoords(100, 100);
    console.log("  (100,100) screen -> world:", worldCoords1);

    const worldCoords2 = mouseHandler.mouseToWorldCoords(200, 200);
    console.log("  (200,200) screen -> world:", worldCoords2);
  } catch (error) {
    console.error("❌ Coordinate conversion failed:", error);
  }
}

/**
 * Test Canvas Events Directly
 */
export function testCanvasEvents(): void {
  console.log("🎯 Testing Canvas Events Directly");

  if (typeof document === "undefined") {
    console.log("❌ Not in browser environment");
    return;
  }

  const canvas = document.querySelector("canvas");
  if (!canvas) {
    console.log("❌ No canvas found");
    return;
  }

  console.log("✅ Canvas found, testing events...");
  console.log("Canvas dimensions:", canvas.width, "x", canvas.height);
  console.log("Canvas client rect:", canvas.getBoundingClientRect());

  // Add test event listeners
  let eventCount = 0;

  const testHandler = (e: MouseEvent) => {
    eventCount++;
    if (eventCount <= 10) {
      console.log(`🎯 Canvas Event ${eventCount}: ${e.type} at (${e.clientX}, ${e.clientY})`);
    }
    if (eventCount === 10) {
      console.log("🎯 (Stopping event logging to avoid spam)");
    }
  };

  canvas.addEventListener("mouseenter", testHandler);
  canvas.addEventListener("mouseleave", testHandler);
  canvas.addEventListener("mousemove", testHandler);

  console.log("🎯 Move your mouse over the canvas to see events...");

  // Clean up after 30 seconds
  setTimeout(() => {
    canvas.removeEventListener("mouseenter", testHandler);
    canvas.removeEventListener("mouseleave", testHandler);
    canvas.removeEventListener("mousemove", testHandler);
    console.log("🎯 Canvas event testing completed");
  }, 30000);
}

// Make functions available globally
if (typeof window !== "undefined") {
  (window as any).forceTestMouseHandler = forceTestMouseHandler;
  (window as any).testCanvasEvents = testCanvasEvents;
}
