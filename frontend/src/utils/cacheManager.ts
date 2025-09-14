/**
 * Centralized cache manager for user data
 * Provides immediate data access and background refresh capabilities
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  version: number;
}

interface UserProfile {
  userId: string;
  email?: string;
  displayName?: string;
  [key: string]: any;
}

interface Group {
  group_id: string;
  creator_id: string;
  member_ids: string[];
  group_name: string;
  created_at: string;
  updated_at: string;
}

interface Friend {
  friend_id: string;
  display_name?: string;
  email?: string;
  photo_url?: string;
  created_at?: string;
  last_login?: string;
  provider?: string;
  [key: string]: any;
}

interface LeaderboardEntry {
  user_id: string;
  daily_pomo_duration: number;
  weekly_pomo_duration: number;
  monthly_pomo_duration: number;
  yearly_pomo_duration: number;
  rank?: number;
  display_name?: string;
}

type CacheKey = "userGroups" | "userFriends" | "globalLeaderboard" | "userProfile";

class CacheManager {
  private static instance: CacheManager;
  private cache = new Map<string, CacheEntry<any>>();
  private callbacks = new Map<string, Set<(data: any) => void>>();
  private refreshPromises = new Map<string, Promise<any>>();

  private constructor() {}

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Generate cache key for user-specific data
   */
  private getUserCacheKey(userId: string, dataType: CacheKey): string {
    return `${userId}:${dataType}`;
  }

  /**
   * Store data in cache with timestamp
   */
  private setCache<T>(key: string, data: T): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      version: (this.cache.get(key)?.version || 0) + 1,
    };
    this.cache.set(key, entry);

    // Persist to localStorage
    try {
      localStorage.setItem(`cache:${key}`, JSON.stringify(entry));
    } catch (error) {
      console.warn("Failed to persist cache to localStorage:", error);
    }

    // Notify subscribers
    this.notifyCallbacks(key, data);
  }

  /**
   * Get cached data
   */
  private getCache<T>(key: string): T | null {
    // First try memory cache
    const memoryEntry = this.cache.get(key);
    if (memoryEntry) {
      return memoryEntry.data;
    }

    // Fall back to localStorage
    try {
      const stored = localStorage.getItem(`cache:${key}`);
      if (stored) {
        const entry: CacheEntry<T> = JSON.parse(stored);
        // Restore to memory cache
        this.cache.set(key, entry);
        return entry.data;
      }
    } catch (error) {
      console.warn("Failed to load cache from localStorage:", error);
    }

    return null;
  }

  /**
   * Check if cached data is considered fresh (less than 5 minutes old)
   */
  private isCacheFresh(key: string, maxAgeMs: number = 5 * 60 * 1000): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    return Date.now() - entry.timestamp < maxAgeMs;
  }

  /**
   * Subscribe to cache updates
   */
  subscribe<T>(key: string, callback: (data: T) => void): () => void {
    if (!this.callbacks.has(key)) {
      this.callbacks.set(key, new Set());
    }
    this.callbacks.get(key)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.callbacks.get(key);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.callbacks.delete(key);
        }
      }
    };
  }

  /**
   * Notify all subscribers of cache updates
   */
  private notifyCallbacks(key: string, data: any): void {
    const callbacks = this.callbacks.get(key);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  /**
   * Generic method to get cached data immediately and refresh in background
   */
  async getCachedWithRefresh<T>(
    cacheKey: string,
    fetchFunction: () => Promise<T>,
    options: {
      maxAge?: number;
      forceRefresh?: boolean;
    } = {}
  ): Promise<T> {
    const { maxAge = 5 * 60 * 1000, forceRefresh = false } = options;

    // Get cached data first
    const cached = this.getCache<T>(cacheKey);
    const isFresh = this.isCacheFresh(cacheKey, maxAge);

    // Return cached data immediately if available and fresh (unless forced refresh)
    if (cached && isFresh && !forceRefresh) {
      return cached;
    }

    // If we have cached data but it's stale, return it immediately
    // but start background refresh
    if (cached && !forceRefresh) {
      // Start background refresh without waiting
      this.backgroundRefresh(cacheKey, fetchFunction);
      return cached;
    }

    // No cached data or forced refresh - fetch immediately
    try {
      const data = await fetchFunction();
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error(`Failed to fetch data for ${cacheKey}:`, error);
      // Return cached data as fallback if available
      if (cached) {
        return cached;
      }
      throw error;
    }
  }

  /**
   * Background refresh without blocking
   */
  private async backgroundRefresh<T>(
    cacheKey: string,
    fetchFunction: () => Promise<T>
  ): Promise<void> {
    // Prevent multiple concurrent refreshes for the same key
    if (this.refreshPromises.has(cacheKey)) {
      return;
    }

    const refreshPromise = fetchFunction()
      .then((data) => {
        this.setCache(cacheKey, data);
        return data;
      })
      .catch((error) => {
        console.error(`Background refresh failed for ${cacheKey}:`, error);
      })
      .finally(() => {
        this.refreshPromises.delete(cacheKey);
      });

    this.refreshPromises.set(cacheKey, refreshPromise);
  }

  /**
   * User Groups API
   */
  async getUserGroups(userId: string, forceRefresh = false): Promise<Group[]> {
    const key = this.getUserCacheKey(userId, "userGroups");
    return this.getCachedWithRefresh(
      key,
      async () => {
        const response = await fetch(`/api/groups/user/${userId}`);
        if (!response.ok) throw new Error("Failed to fetch groups");
        const data = await response.json();
        return data.success ? data.groups : [];
      },
      { forceRefresh }
    );
  }

  /**
   * User Friends API
   */
  async getUserFriends(userId: string, forceRefresh = false): Promise<Friend[]> {
    const key = this.getUserCacheKey(userId, "userFriends");
    return this.getCachedWithRefresh(
      key,
      async () => {
        const response = await fetch(`/api/friends/list/${userId}`);
        if (!response.ok) throw new Error("Failed to fetch friends");
        const data = await response.json();
        return data.success ? data.friends : [];
      },
      { forceRefresh }
    );
  }

  /**
   * Global Leaderboard API
   */
  async getGlobalLeaderboard(
    period: string = "daily",
    forceRefresh = false
  ): Promise<LeaderboardEntry[]> {
    const key = `globalLeaderboard:${period}`;
    return this.getCachedWithRefresh(
      key,
      async () => {
        const response = await fetch(`/api/leaderboard/${period}?limit=10`);
        if (!response.ok) throw new Error("Failed to fetch leaderboard");
        const data = await response.json();
        return data.success ? data.leaderboard : [];
      },
      { forceRefresh }
    );
  }

  /**
   * User Profile API
   */
  async getUserProfile(userId: string, forceRefresh = false): Promise<UserProfile | null> {
    const key = this.getUserCacheKey(userId, "userProfile");
    return this.getCachedWithRefresh(
      key,
      async () => {
        // This would be implemented when you have a user profile endpoint
        // For now, return basic profile info
        return {
          userId,
          displayName: `User ${userId}`,
          email: `${userId}@example.com`,
        };
      },
      { forceRefresh }
    );
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(userId: string, dataType: CacheKey): void {
    const key = this.getUserCacheKey(userId, dataType);
    this.cache.delete(key);
    try {
      localStorage.removeItem(`cache:${key}`);
    } catch (error) {
      console.warn("Failed to remove cache from localStorage:", error);
    }
  }

  /**
   * Invalidate all cache for a user
   */
  invalidateUser(userId: string): void {
    const types: CacheKey[] = ["userGroups", "userFriends", "globalLeaderboard", "userProfile"];
    types.forEach((type) => this.invalidate(userId, type));
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    this.cache.clear();
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith("cache:")) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn("Failed to clear localStorage cache:", error);
    }
  }

  /**
   * Preload user data for faster access
   */
  async preloadUserData(userId: string): Promise<void> {
    const promises = [
      this.getUserGroups(userId),
      this.getUserFriends(userId),
      this.getGlobalLeaderboard("daily"),
      this.getUserProfile(userId),
    ];

    try {
      await Promise.allSettled(promises);
    } catch (error) {
      console.error("Failed to preload user data:", error);
    }
  }
}

export const cacheManager = CacheManager.getInstance();
export type { Group, Friend, LeaderboardEntry, UserProfile };
