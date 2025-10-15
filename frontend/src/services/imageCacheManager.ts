/**
 * Image Cache Manager Service
 *
 * Multi-layer caching strategy for profile pictures:
 * - Layer 1: LocalStorage (fast, persistent)
 * - Layer 2: IndexedDB (blob storage, 7-day retention)
 *
 * Provides instant loading for previously viewed profile pictures
 * and offline support.
 */

import { openDB, IDBPDatabase } from "idb";
import { cacheMonitor } from "./cachePerformanceMonitor";

export interface CachedImage {
  url: string;
  image_id: string;
  timestamp: number;
  user_id?: string;
  blob?: Blob;
}

interface CacheEntry {
  data: CachedImage;
  expiresAt: number;
}

interface CacheStats {
  localStorageEntries: number;
  indexedDBEntries: number;
  totalSize: string;
}

class ImageCacheManager {
  private dbName = "profile_pictures_cache";
  private storeName = "images";
  private localStoragePrefix = "profile_pic:";
  private db: IDBPDatabase | null = null;

  // TTLs in milliseconds
  private readonly LOCALSTORAGE_TTL = 45 * 60 * 1000; // 45 minutes
  private readonly INDEXEDDB_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly MAX_ENTRIES = 100; // Limit IndexedDB entries

  /**
   * Initialize IndexedDB database
   */
  async init(): Promise<void> {
    if (this.db) return;

    try {
      this.db = await openDB(this.dbName, 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains("images")) {
            const store = db.createObjectStore("images", { keyPath: "image_id" });
            store.createIndex("timestamp", "timestamp");
            store.createIndex("user_id", "user_id");
          }
        },
      });

    } catch (error) {
      console.error("[ImageCache] Failed to initialize IndexedDB:", error);
    }
  }

  /**
   * Layer 1: Check LocalStorage
   */
  getFromLocalStorage(userId: string): CachedImage | null {
    if (typeof window === "undefined") return null;

    const startTime = performance.now();

    try {
      const key = `${this.localStoragePrefix}${userId}`;
      const cached = localStorage.getItem(key);

      if (!cached) return null;

      const entry: CacheEntry = JSON.parse(cached);

      // Check expiration
      if (Date.now() > entry.expiresAt) {
        localStorage.removeItem(key);

        return null;
      }

      // Record cache hit
      const loadTime = performance.now() - startTime;
      cacheMonitor.recordHit(userId, "localStorage", loadTime);

      return entry.data;
    } catch (error) {
      console.error("[ImageCache] LocalStorage read error:", error);
      return null;
    }
  }

  /**
   * Store in LocalStorage
   */
  setInLocalStorage(userId: string, data: CachedImage): void {
    if (typeof window === "undefined") return;

    try {
      const key = `${this.localStoragePrefix}${userId}`;
      const entry: CacheEntry = {
        data,
        expiresAt: Date.now() + this.LOCALSTORAGE_TTL,
      };
      localStorage.setItem(key, JSON.stringify(entry));

    } catch (error) {
      console.error("[ImageCache] LocalStorage write error:", error);
      // Handle quota exceeded
      if (error instanceof DOMException && error.name === "QuotaExceededError") {
        console.warn("[ImageCache] LocalStorage quota exceeded, clearing old entries");
        this.clearOldLocalStorageEntries();
      }
    }
  }

  /**
   * Layer 2: Check IndexedDB (with blob storage)
   */
  async getFromIndexedDB(imageId: string): Promise<CachedImage | null> {
    if (typeof window === "undefined") return null;

    const startTime = performance.now();

    if (!this.db) await this.init();
    if (!this.db) return null;

    try {
      const cached = await this.db.get(this.storeName, imageId);

      if (!cached) return null;

      // Check expiration
      if (Date.now() - cached.timestamp > this.INDEXEDDB_TTL) {
        await this.db.delete(this.storeName, imageId);

        return null;
      }

      // Record cache hit
      const loadTime = performance.now() - startTime;
      cacheMonitor.recordHit(cached.user_id || imageId, "indexedDB", loadTime);

      // Create blob URL from stored blob if available
      if (cached.blob) {
        const blobUrl = URL.createObjectURL(cached.blob);
        return {
          ...cached,
          url: blobUrl,
        };
      }

      return cached;
    } catch (error) {
      console.error("[ImageCache] IndexedDB read error:", error);
      return null;
    }
  }

  /**
   * Store in IndexedDB with blob
   */
  async setInIndexedDB(imageId: string, data: CachedImage, blob?: Blob): Promise<void> {
    if (typeof window === "undefined") return;

    if (!this.db) await this.init();
    if (!this.db) return;

    try {
      await this.db.put(this.storeName, {
        ...data,
        image_id: imageId, // Override to ensure consistency
        blob: blob || null,
        timestamp: Date.now(),
      });

      // Cleanup old entries if needed
      await this.cleanupOldEntries();
    } catch (error) {
      console.error("[ImageCache] IndexedDB write error:", error);
    }
  }

  /**
   * Download and cache image blob
   */
  async cacheImageBlob(imageId: string, url: string): Promise<Blob | null> {
    if (typeof window === "undefined") return null;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`[ImageCache] Failed to fetch blob for ${imageId}: ${response.status}`);
        return null;
      }

      const blob = await response.blob();

      // Store blob in IndexedDB
      const cachedData: CachedImage = {
        url,
        image_id: imageId,
        timestamp: Date.now(),
      };
      await this.setInIndexedDB(imageId, cachedData, blob);

      return blob;
    } catch (error) {
      console.error("[ImageCache] Error caching image blob:", error);
      return null;
    }
  }

  /**
   * Smart get: Check all cache layers
   */
  async get(userId: string, imageId?: string): Promise<CachedImage | null> {
    // Layer 1: LocalStorage (fastest)
    const localCache = this.getFromLocalStorage(userId);
    if (localCache) return localCache;

    // Layer 2: IndexedDB (has actual image)
    if (imageId) {
      const idbCache = await this.getFromIndexedDB(imageId);
      if (idbCache) {
        // Also cache in LocalStorage for faster next access
        this.setInLocalStorage(userId, idbCache);
        return idbCache;
      }
    }

    return null;
  }

  /**
   * Smart set: Store in all appropriate layers
   */
  async set(userId: string, data: CachedImage, downloadBlob = true): Promise<void> {
    // Always cache in LocalStorage for fast access
    this.setInLocalStorage(userId, data);

    // Optionally download and cache blob in IndexedDB
    if (downloadBlob && data.image_id !== "default_pfp.png") {
      // Download in background (don't await)
      this.cacheImageBlob(data.image_id, data.url).catch((error) => {
        console.warn("[ImageCache] Background blob caching failed:", error);
      });
    } else {
      // Still save the URL in IndexedDB even if not downloading blob
      await this.setInIndexedDB(data.image_id, data);
    }
  }

  /**
   * Invalidate all caches for a user
   */
  async invalidate(userId: string, imageId?: string): Promise<void> {
    // Remove from LocalStorage
    if (typeof window !== "undefined") {
      const key = `${this.localStoragePrefix}${userId}`;
      localStorage.removeItem(key);
    }

    // Remove from IndexedDB
    if (imageId && this.db) {
      await this.db.delete(this.storeName, imageId);
    }

  }

  /**
   * Cleanup old entries to prevent storage overflow
   */
  private async cleanupOldEntries(): Promise<void> {
    if (!this.db) return;

    try {
      // Get all entries sorted by timestamp
      const tx = this.db.transaction(this.storeName, "readonly");
      const index = tx.store.index("timestamp");
      const entries = await index.getAll();

      // If we have more than MAX_ENTRIES, delete oldest
      if (entries.length > this.MAX_ENTRIES) {
        const toDelete = entries.slice(0, entries.length - this.MAX_ENTRIES);
        const deleteTx = this.db.transaction(this.storeName, "readwrite");

        for (const entry of toDelete) {
          await deleteTx.store.delete(entry.image_id);
        }

      }
    } catch (error) {
      console.error("[ImageCache] Error cleaning up cache:", error);
    }
  }

  /**
   * Clear old LocalStorage entries
   */
  private clearOldLocalStorageEntries(): void {
    if (typeof window === "undefined") return;

    try {
      const keys = Object.keys(localStorage).filter((key) =>
        key.startsWith(this.localStoragePrefix)
      );

      // Sort by age and remove oldest half
      const entries = keys
        .map((key) => {
          const data = localStorage.getItem(key);
          if (!data) return null;
          try {
            const entry: CacheEntry = JSON.parse(data);
            return { key, expiresAt: entry.expiresAt };
          } catch {
            return null;
          }
        })
        .filter(Boolean) as { key: string; expiresAt: number }[];

      entries.sort((a, b) => a.expiresAt - b.expiresAt);

      const toRemove = entries.slice(0, Math.floor(entries.length / 2));
      toRemove.forEach(({ key }) => localStorage.removeItem(key));

    } catch (error) {
      console.error("[ImageCache] Error clearing old LocalStorage entries:", error);
    }
  }

  /**
   * Clear all caches
   */
  async clearAll(): Promise<void> {
    // Clear LocalStorage
    if (typeof window !== "undefined") {
      Object.keys(localStorage)
        .filter((key) => key.startsWith(this.localStoragePrefix))
        .forEach((key) => localStorage.removeItem(key));
    }

    // Clear IndexedDB
    if (this.db) {
      await this.db.clear(this.storeName);
    }

  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    let localStorageEntries = 0;
    let indexedDBEntries = 0;
    let totalSize = 0;

    if (typeof window !== "undefined") {
      // Count LocalStorage entries
      localStorageEntries = Object.keys(localStorage).filter((key) =>
        key.startsWith(this.localStoragePrefix)
      ).length;

      // Estimate size
      Object.keys(localStorage)
        .filter((key) => key.startsWith(this.localStoragePrefix))
        .forEach((key) => {
          const value = localStorage.getItem(key);
          if (value) {
            totalSize += value.length * 2; // Approximate bytes (2 bytes per char)
          }
        });
    }

    // Count IndexedDB entries
    if (this.db) {
      try {
        const all = await this.db.getAll(this.storeName);
        indexedDBEntries = all.length;
      } catch (error) {
        console.error("[ImageCache] Error getting IndexedDB stats:", error);
      }
    }

    return {
      localStorageEntries,
      indexedDBEntries,
      totalSize: `${(totalSize / 1024).toFixed(2)} KB`,
    };
  }
}

// Export singleton instance
export const imageCacheManager = new ImageCacheManager();

// Initialize on first import
if (typeof window !== "undefined") {
  imageCacheManager.init().catch(console.error);
}
