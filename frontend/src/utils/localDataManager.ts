/**
 * Local data manager for caching level config and inventory data
 * Provides local storage with expiration and invalidation capabilities
 */

import { StructureInventoryItem } from "../services/inventoryService";
import { getUserInventory } from "../services/inventoryService";
import { getUserLevelConfig } from "../services/levelConfigService";

interface CachedLevelConfig {
  userId: string;
  levelConfig: string[];
  timestamp: number;
}

interface CachedInventory {
  userId: string;
  inventory: StructureInventoryItem[];
  timestamp: number;
}

// Cache expiry time (5 minutes)
const CACHE_EXPIRY_MS = 5 * 60 * 1000;

// Storage keys
const LEVEL_CONFIG_KEY = "cached_level_config";
const INVENTORY_KEY = "cached_inventory";

class LocalDataManager {
  private static instance: LocalDataManager;

  // In-memory caches for faster access
  private levelConfigCache: CachedLevelConfig | null = null;
  private inventoryCache: CachedInventory | null = null;

  private constructor() {}

  static getInstance(): LocalDataManager {
    if (!LocalDataManager.instance) {
      LocalDataManager.instance = new LocalDataManager();
    }
    return LocalDataManager.instance;
  }

  /**
   * Check if cached data is still valid
   */
  private isValidCache(timestamp: number): boolean {
    return Date.now() - timestamp < CACHE_EXPIRY_MS;
  }

  /**
   * Get level config from cache or fetch from backend
   */
  async getLevelConfig(userId: string): Promise<string[]> {
    // Check in-memory cache first
    if (
      this.levelConfigCache &&
      this.levelConfigCache.userId === userId &&
      this.isValidCache(this.levelConfigCache.timestamp)
    ) {
      console.log("Using in-memory level config cache for user:", userId);
      return this.levelConfigCache.levelConfig;
    }

    // Check localStorage cache
    try {
      const cached = localStorage.getItem(LEVEL_CONFIG_KEY);
      if (cached) {
        const parsedCache: CachedLevelConfig = JSON.parse(cached);
        if (parsedCache.userId === userId && this.isValidCache(parsedCache.timestamp)) {
          console.log("Using localStorage level config cache for user:", userId);
          this.levelConfigCache = parsedCache;
          return parsedCache.levelConfig;
        }
      }
    } catch (error) {
      console.warn("Failed to parse level config cache:", error);
    }

    // Fetch from backend
    console.log("Fetching level config from backend for user:", userId);
    try {
      const response = await getUserLevelConfig(userId);
      if (response.success && response.data) {
        const levelConfig = response.data.level_config;

        // Update caches
        this.updateLevelConfigCache(userId, levelConfig);

        return levelConfig;
      } else {
        console.warn("Failed to load level config, using default empty config");
        const defaultConfig = ["empty", "empty", "empty", "empty", "empty", "empty", "empty"];
        this.updateLevelConfigCache(userId, defaultConfig);
        return defaultConfig;
      }
    } catch (error) {
      console.error("Error loading level config:", error);
      const defaultConfig = ["empty", "empty", "empty", "empty", "empty", "empty", "empty"];
      this.updateLevelConfigCache(userId, defaultConfig);
      return defaultConfig;
    }
  }

  /**
   * Get inventory data from cache or fetch from backend
   */
  async getInventory(userId: string): Promise<StructureInventoryItem[]> {
    // Check in-memory cache first
    if (
      this.inventoryCache &&
      this.inventoryCache.userId === userId &&
      this.isValidCache(this.inventoryCache.timestamp)
    ) {
      console.log("Using in-memory inventory cache for user:", userId);
      return this.inventoryCache.inventory;
    }

    // Check localStorage cache
    try {
      const cached = localStorage.getItem(INVENTORY_KEY);
      if (cached) {
        const parsedCache: CachedInventory = JSON.parse(cached);
        if (parsedCache.userId === userId && this.isValidCache(parsedCache.timestamp)) {
          console.log("Using localStorage inventory cache for user:", userId);
          this.inventoryCache = parsedCache;
          return parsedCache.inventory;
        }
      }
    } catch (error) {
      console.warn("Failed to parse inventory cache:", error);
    }

    // Fetch from backend
    console.log("Fetching inventory from backend for user:", userId);
    try {
      const response = await getUserInventory(userId);
      if (response.success && response.data) {
        const inventory = response.data.structure_inventory;

        // Update caches
        this.updateInventoryCache(userId, inventory);

        return inventory;
      } else {
        console.warn("Failed to load inventory, using empty inventory");
        const emptyInventory: StructureInventoryItem[] = [];
        this.updateInventoryCache(userId, emptyInventory);
        return emptyInventory;
      }
    } catch (error) {
      console.error("Error loading inventory:", error);
      const emptyInventory: StructureInventoryItem[] = [];
      this.updateInventoryCache(userId, emptyInventory);
      return emptyInventory;
    }
  }

  /**
   * Update level config cache
   */
  updateLevelConfigCache(userId: string, levelConfig: string[]): void {
    const cacheData: CachedLevelConfig = {
      userId,
      levelConfig,
      timestamp: Date.now(),
    };

    // Update in-memory cache
    this.levelConfigCache = cacheData;

    // Update localStorage cache
    try {
      localStorage.setItem(LEVEL_CONFIG_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.warn("Failed to save level config to localStorage:", error);
    }
  }

  /**
   * Update inventory cache
   */
  updateInventoryCache(userId: string, inventory: StructureInventoryItem[]): void {
    const cacheData: CachedInventory = {
      userId,
      inventory,
      timestamp: Date.now(),
    };

    // Update in-memory cache
    this.inventoryCache = cacheData;

    // Update localStorage cache
    try {
      localStorage.setItem(INVENTORY_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.warn("Failed to save inventory to localStorage:", error);
    }
  }

  /**
   * Invalidate level config cache for a user
   */
  invalidateLevelConfig(userId?: string): void {
    if (!userId || (this.levelConfigCache && this.levelConfigCache.userId === userId)) {
      this.levelConfigCache = null;
      localStorage.removeItem(LEVEL_CONFIG_KEY);
      console.log("Invalidated level config cache");
    }
  }

  /**
   * Invalidate inventory cache for a user
   */
  invalidateInventory(userId?: string): void {
    if (!userId || (this.inventoryCache && this.inventoryCache.userId === userId)) {
      this.inventoryCache = null;
      localStorage.removeItem(INVENTORY_KEY);
      console.log("Invalidated inventory cache");
    }
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.levelConfigCache = null;
    this.inventoryCache = null;
    localStorage.removeItem(LEVEL_CONFIG_KEY);
    localStorage.removeItem(INVENTORY_KEY);
    console.log("Cleared all local data caches");
  }
}

// Export singleton instance
export const localDataManager = LocalDataManager.getInstance();
