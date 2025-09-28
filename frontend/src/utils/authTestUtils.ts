/**
 * Test script to verify auth optimization effectiveness
 *
 * Run this in the browser console to monitor /api/auth/session calls:
 *
 * 1. Open Network tab in Chrome DevTools
 * 2. Filter by "session"
 * 3. Navigate to garden page
 * 4. Count the number of /api/auth/session requests
 *
 * Expected Results:
 * - Before optimization: 12+ requests on page load
 * - After optimization: 1-2 requests on page load
 *
 * Additional tests:
 * 1. Tab switching (should trigger revalidation on stale data)
 * 2. Component unmount/remount (should use cached data)
 * 3. Multiple modals opening (should share auth state)
 */

// Network monitoring script
const monitorAuthCalls = () => {
  let callCount = 0;
  const startTime = Date.now();

  // Intercept fetch calls
  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    const url = args[0];
    if (typeof url === "string" && url.includes("/api/auth/session")) {
      callCount++;
      console.log(`🔍 Auth call #${callCount} at ${Date.now() - startTime}ms:`, url);
    }
    return originalFetch.apply(this, args);
  };

  // Reset counter
  setTimeout(() => {
    console.log(`📊 Total auth calls in 10 seconds: ${callCount}`);
    console.log(`✅ Expected: 1-2 calls, Actual: ${callCount}`);
    if (callCount <= 2) {
      console.log("🎉 Optimization successful!");
    } else {
      console.log("⚠️ More optimization needed");
    }
  }, 10000);

  console.log("🚀 Monitoring auth calls for 10 seconds...");
};

// Browser console test
if (typeof window !== "undefined") {
  console.log("To test auth optimization, run: monitorAuthCalls()");
  (window as any).monitorAuthCalls = monitorAuthCalls;
}

export { monitorAuthCalls };
