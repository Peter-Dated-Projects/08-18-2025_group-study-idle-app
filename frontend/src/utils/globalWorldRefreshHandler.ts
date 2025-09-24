// Global world refresh handler
// This allows components to trigger world updates from anywhere in the app

let globalWorldRefreshHandler: (() => Promise<void>) | null = null;

/**
 * Set the global world refresh handler
 */
export function setGlobalWorldRefreshHandler(handler: () => Promise<void>): void {
  globalWorldRefreshHandler = handler;
}

/**
 * Call the global world refresh handler
 */
export async function callGlobalWorldRefreshHandler(): Promise<void> {
  if (globalWorldRefreshHandler) {
    await globalWorldRefreshHandler();
  } else {
    console.warn("Global world refresh handler not set");
  }
}

/**
 * Clear the global world refresh handler
 */
export function clearGlobalWorldRefreshHandler(): void {
  globalWorldRefreshHandler = null;
}