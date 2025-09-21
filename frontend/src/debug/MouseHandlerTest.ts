/**
 * Mouse Handler Test Script
 * Use this in the browser console to test mouse handler functionality
 */

// Test if the mouse handler is properly initialized
function testMouseHandlerSetup() {
  console.log("🧪 Testing Mouse Handler Setup");

  // Check if global mouseHandler exists (browser only)
  if (typeof window === "undefined") {
    console.log("❌ Not in browser environment");
    return { mouseHandler: false, canvas: false, canvasDimensions: null };
  }

  const mouseHandler = (window as any).mouseHandler || (globalThis as any).mouseHandler;
  console.log("1. Global mouseHandler exists:", !!mouseHandler);

  // Check canvas element
  const canvas = typeof document !== "undefined" ? document.querySelector("canvas") : null;
  console.log("2. Canvas element found:", !!canvas);

  if (canvas) {
    console.log("   Canvas dimensions:", canvas.width, "x", canvas.height);
    console.log("   Canvas position:", canvas.getBoundingClientRect());
  }

  // Test direct mouse event on canvas
  if (canvas) {
    console.log("3. Testing direct mouse events on canvas...");

    let moveCount = 0;
    const testHandler = (e: MouseEvent) => {
      moveCount++;
      if (moveCount <= 5) {
        console.log(`   Direct mousemove ${moveCount}: (${e.clientX}, ${e.clientY})`);
      }
      if (moveCount === 5) {
        console.log("   ... (stopping direct event logging)");
        canvas.removeEventListener("mousemove", testHandler);
      }
    };

    canvas.addEventListener("mousemove", testHandler);
    console.log("   Move your mouse over the canvas now...");
  }

  return {
    mouseHandler: !!mouseHandler,
    canvas: !!canvas,
    canvasDimensions: canvas ? { width: canvas.width, height: canvas.height } : null,
  };
}

// Test mouse coordinate conversion
function testCoordinateConversion(x: number = 100, y: number = 100) {
  console.log(`🧪 Testing Coordinate Conversion at (${x}, ${y})`);

  if (typeof window === "undefined") {
    console.error("❌ Not in browser environment");
    return null;
  }

  const mouseHandler = (window as any).mouseHandler || (globalThis as any).mouseHandler;
  if (!mouseHandler) {
    console.error("❌ MouseHandler not found");
    return null;
  }

  try {
    const worldCoords = mouseHandler.mouseToWorldCoords(x, y);
    console.log(
      `✅ Conversion successful: (${x}, ${y}) -> (${worldCoords.x.toFixed(
        2
      )}, ${worldCoords.y.toFixed(2)})`
    );
    return worldCoords;
  } catch (error) {
    console.error("❌ Conversion failed:", error);
    return null;
  }
}

// Test visual indicator
function testVisualIndicator() {
  console.log("🧪 Testing Visual Indicator");

  if (typeof window === "undefined") {
    console.error("❌ Not in browser environment");
    return;
  }

  const mouseHandler = (window as any).mouseHandler || (globalThis as any).mouseHandler;
  if (!mouseHandler) {
    console.error("❌ MouseHandler not found");
    return;
  }

  const state = mouseHandler.getState();
  console.log("State:", state);

  // Check if indicator exists
  const indicator = (mouseHandler as any).mouseIndicator;
  console.log("Indicator exists:", !!indicator);

  if (indicator) {
    console.log("Indicator visible:", indicator.visible);
    console.log("Indicator position:", indicator.position);
    console.log("Indicator parent:", indicator.parent ? "has parent" : "no parent");
    console.log("Indicator zIndex:", indicator.zIndex);

    // Try to manually show/position the indicator
    console.log("⚡ Manually showing indicator at (100, 100)...");
    indicator.visible = true;
    indicator.position.set(100, 100);

    setTimeout(() => {
      console.log("⚡ Hiding indicator...");
      indicator.visible = false;
    }, 2000);
  }
}

// Run all tests
function runAllMouseTests() {
  console.log("🚀 Running All Mouse Handler Tests");
  console.log("=====================================");

  const setup = testMouseHandlerSetup();

  setTimeout(() => {
    testCoordinateConversion(100, 100);
  }, 1000);

  setTimeout(() => {
    testVisualIndicator();
  }, 2000);

  return setup;
}

// Make functions available globally (browser only)
if (typeof window !== "undefined") {
  (window as any).testMouseHandlerSetup = testMouseHandlerSetup;
  (window as any).testCoordinateConversion = testCoordinateConversion;
  (window as any).testVisualIndicator = testVisualIndicator;
  (window as any).runAllMouseTests = runAllMouseTests;
}

// Export for use in modules
export { testMouseHandlerSetup, testCoordinateConversion, testVisualIndicator, runAllMouseTests };
