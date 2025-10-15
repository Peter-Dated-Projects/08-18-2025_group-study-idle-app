/**
 * Service Worker Registration and Management
 *
 * Handles registration, updates, and communication with the service worker.
 */

export interface ServiceWorkerStats {
  totalEntries: number;
  validEntries: number;
  expiredEntries: number;
  totalSizeKB: number;
  totalSizeMB: string;
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private isSupported = false;
  private updateCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.isSupported = typeof window !== "undefined" && "serviceWorker" in navigator;
  }

  /**
   * Register the service worker
   */
  async register(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn("[SW Manager] Service Workers not supported");
      return false;
    }

    try {

      this.registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });

      // Handle updates
      this.registration.addEventListener("updatefound", () => {
        const newWorker = this.registration!.installing;

        newWorker?.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {

            this.notifyUpdate();
          }
        });
      });

      // Check for updates periodically (every hour)
      this.startUpdateChecks();

      return true;
    } catch (error) {
      console.error("[SW Manager] Service worker registration failed:", error);
      return false;
    }
  }

  /**
   * Unregister the service worker
   */
  async unregister(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const success = await this.registration.unregister();

      this.stopUpdateChecks();
      return success;
    } catch (error) {
      console.error("[SW Manager] Failed to unregister service worker:", error);
      return false;
    }
  }

  /**
   * Update the service worker
   */
  async update(): Promise<void> {
    if (!this.registration) {
      console.warn("[SW Manager] No registration to update");
      return;
    }

    try {
      await this.registration.update();

    } catch (error) {
      console.error("[SW Manager] Failed to update service worker:", error);
    }
  }

  /**
   * Skip waiting and activate new service worker immediately
   */
  async skipWaiting(): Promise<void> {
    if (!this.registration?.waiting) {
      console.warn("[SW Manager] No waiting service worker");
      return;
    }

    this.registration.waiting.postMessage({ type: "SKIP_WAITING" });

    // Reload page after activation
    navigator.serviceWorker.addEventListener("controllerchange", () => {

      window.location.reload();
    });
  }

  /**
   * Clear all service worker caches
   */
  async clearCache(): Promise<boolean> {
    if (!this.registration?.active) {
      console.warn("[SW Manager] No active service worker");
      return false;
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();

      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.success || false);
      };

      this.registration!.active!.postMessage({ type: "CLEAR_CACHE" }, [messageChannel.port2]);
    });
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<ServiceWorkerStats | null> {
    if (!this.registration?.active) {
      console.warn("[SW Manager] No active service worker");
      return null;
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();

      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.stats || null);
      };

      this.registration!.active!.postMessage({ type: "GET_CACHE_STATS" }, [messageChannel.port2]);
    });
  }

  /**
   * Invalidate a specific image cache
   */
  async invalidateImage(imageUrl: string): Promise<boolean> {
    if (!this.registration?.active) {
      console.warn("[SW Manager] No active service worker");
      return false;
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();

      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.success || false);
      };

      this.registration!.active!.postMessage({ type: "INVALIDATE_IMAGE", imageUrl }, [
        messageChannel.port2,
      ]);
    });
  }

  /**
   * Request background sync
   */
  async requestBackgroundSync(): Promise<boolean> {
    if (!this.registration) {
      console.warn("[SW Manager] No registration for background sync");
      return false;
    }

    try {
      if ("sync" in this.registration) {
        // @ts-expect-error - Background Sync API types
        await this.registration.sync.register("refresh-profile-pictures");

        return true;
      } else {
        console.warn("[SW Manager] Background Sync API not supported");
        return false;
      }
    } catch (error) {
      console.error("[SW Manager] Failed to register background sync:", error);
      return false;
    }
  }

  /**
   * Check if service worker is active
   */
  isActive(): boolean {
    return !!this.registration?.active;
  }

  /**
   * Get current registration
   */
  getRegistration(): ServiceWorkerRegistration | null {
    return this.registration;
  }

  /**
   * Start periodic update checks
   */
  private startUpdateChecks(): void {
    this.stopUpdateChecks();

    // Check for updates every hour
    this.updateCheckInterval = setInterval(() => {

      this.update();
    }, 60 * 60 * 1000);
  }

  /**
   * Stop periodic update checks
   */
  private stopUpdateChecks(): void {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
      this.updateCheckInterval = null;
    }
  }

  /**
   * Notify user about available update
   */
  private notifyUpdate(): void {

    // Dispatch custom event that UI can listen to
    if (typeof window !== "undefined") {
      const event = new CustomEvent("sw-update-available", {
        detail: { registration: this.registration },
      });
      window.dispatchEvent(event);
    }
  }
}

// Export singleton instance
export const swManager = new ServiceWorkerManager();

// Auto-register on import (only in browser)
if (typeof window !== "undefined") {
  // Wait for page load
  if (document.readyState === "complete") {
    swManager.register();
  } else {
    window.addEventListener("load", () => {
      swManager.register();
    });
  }

  // Listen for service worker update events
  window.addEventListener("sw-update-available", () => {

    // Show notification to user (can be customized)
    if (window.confirm("New version available! Reload to update?")) {
      swManager.skipWaiting();
    }
  });
}

// Export helper functions
export async function clearServiceWorkerCache(): Promise<boolean> {
  return swManager.clearCache();
}

export async function getServiceWorkerStats(): Promise<ServiceWorkerStats | null> {
  return swManager.getCacheStats();
}

export async function invalidateImageCache(imageUrl: string): Promise<boolean> {
  return swManager.invalidateImage(imageUrl);
}

export async function requestBackgroundSync(): Promise<boolean> {
  return swManager.requestBackgroundSync();
}
