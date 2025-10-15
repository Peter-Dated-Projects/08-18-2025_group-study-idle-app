/**
 * World editing service for managing structure placement and updates
 * Handles the interaction between the UI and the game world
 */

import { localDataManager } from "./localDataManager";
import { fetchJSON, AuthenticationError, triggerAuthFlow } from "./authUtils";
import { updateSlotConfig } from "../services/levelConfigService";
import { getStructureConfig } from "../config/structureConfigs";
import { visualWorldUpdateService } from "./visualWorldUpdateService";

export interface StructurePlot {
  index: number; // 0-6, corresponding to the 7 plots
  currentStructureId: string;
  position: { x: number; y: number };
}

class WorldEditingService {
  private static instance: WorldEditingService;
  private currentPlots: StructurePlot[] = [];
  private userId: string | null = null;

  private constructor() {}

  static getInstance(): WorldEditingService {
    if (!WorldEditingService.instance) {
      WorldEditingService.instance = new WorldEditingService();
    }
    return WorldEditingService.instance;
  }

  /**
   * Initialize the world editing service with user data
   */
  async initialize(userId: string): Promise<void> {
    this.userId = userId;

    // Load current level config
    const levelConfig = await localDataManager.getLevelConfig(userId);

    // Initialize plots based on current config
    this.currentPlots = levelConfig.map((structureId, index) => ({
      index,
      currentStructureId: structureId,
      position: this.getPlotPosition(index),
    }));
  }

  /**
   * Get plot position based on index (matches DefaultWorld plot positioning)
   */
  private getPlotPosition(index: number): { x: number; y: number } {
    const DESIGN_WIDTH = 1920;
    const DESIGN_HEIGHT = 1080;
    const centerX = DESIGN_WIDTH / 2;
    const centerY = DESIGN_HEIGHT / 2;
    const plotDistance = 200;

    const positions = [
      { x: centerX - plotDistance * 2, y: centerY + plotDistance * 0.5 },
      { x: centerX - plotDistance * 1.5, y: centerY - plotDistance * 0.5 },
      { x: centerX - plotDistance, y: centerY - plotDistance * 1.5 },
      { x: centerX, y: centerY - plotDistance * 1.5 },
      { x: centerX + plotDistance, y: centerY - plotDistance * 1.5 },
      { x: centerX + plotDistance * 1.5, y: centerY - plotDistance * 0.5 },
      { x: centerX + plotDistance * 2, y: centerY + plotDistance * 0.5 },
    ];

    return positions[index] || { x: centerX, y: centerY };
  }

  /**
   * Get current plots data
   */
  getCurrentPlots(): StructurePlot[] {
    return [...this.currentPlots];
  }

  /**
   * Get available plots (empty ones)
   */
  getAvailablePlots(): StructurePlot[] {
    return this.currentPlots.filter((plot) => plot.currentStructureId === "empty");
  }

  /**
   * Place a structure on a specific plot
   */
  async placeStructure(plotIndex: number, structureId: string): Promise<boolean> {
    if (!this.userId) {
      console.error("World editing service not initialized with user ID");
      return false;
    }

    if (plotIndex < 0 || plotIndex >= this.currentPlots.length) {
      console.error("Invalid plot index:", plotIndex);
      return false;
    }

    const plot = this.currentPlots[plotIndex];
    const previousStructureId = plot.currentStructureId;

    try {
      // Update plot locally
      plot.currentStructureId = structureId;

      // Get current state for updates
      const currentConfig = await localDataManager.getLevelConfig(this.userId);

      // Update level config
      currentConfig[plotIndex] = structureId;

      // Batch update to backend
      const updates = [this.updateLevelConfigBulk(currentConfig)];
      await Promise.all(updates);

      // Update visual representation

      const visualUpdateSuccess = await visualWorldUpdateService.updateStructurePlot(
        plotIndex,
        structureId
      );

      if (!visualUpdateSuccess) {
        console.warn(
          `Visual update failed for plot ${plotIndex}, structure will be visible after next refresh`
        );
      }

      return true;
    } catch (error) {
      // Revert local changes on error
      plot.currentStructureId = previousStructureId;

      if (error instanceof AuthenticationError) {
        console.error("Authentication error placing structure:", error);
        // Don't show generic error - auth flow already triggered
        return false;
      }

      console.error("Failed to place structure:", error);
      return false;
    }
  }

  /**
   * Swap structures between two plots
   */
  async swapStructures(fromPlotIndex: number, toPlotIndex: number): Promise<boolean> {
    if (!this.userId) {
      console.error("World editing service not initialized with user ID");
      return false;
    }

    if (fromPlotIndex === toPlotIndex) {
      return true; // No change needed
    }

    const fromPlot = this.currentPlots[fromPlotIndex];
    const toPlot = this.currentPlots[toPlotIndex];

    if (!fromPlot || !toPlot) {
      console.error("Invalid plot indices for swap:", fromPlotIndex, toPlotIndex);
      return false;
    }

    const fromStructureId = fromPlot.currentStructureId;
    const toStructureId = toPlot.currentStructureId;

    try {
      // Update plots locally
      fromPlot.currentStructureId = toStructureId;
      toPlot.currentStructureId = fromStructureId;

      // Get current level config and update both slots
      const currentConfig = await localDataManager.getLevelConfig(this.userId);
      currentConfig[fromPlotIndex] = toStructureId;
      currentConfig[toPlotIndex] = fromStructureId;

      // Batch update to backend
      await this.updateLevelConfigBulk(currentConfig);

      // Update visual representations

      const visualUpdates = await Promise.all([
        visualWorldUpdateService.updateStructurePlot(fromPlotIndex, toStructureId),
        visualWorldUpdateService.updateStructurePlot(toPlotIndex, fromStructureId),
      ]);

      if (!visualUpdates.every((success) => success)) {
        console.warn(
          `Some visual updates failed during swap, structures will be visible after next refresh`
        );
      }

      return true;
    } catch (error) {
      // Revert local changes on error
      fromPlot.currentStructureId = fromStructureId;
      toPlot.currentStructureId = toStructureId;
      console.error("Failed to swap structures:", error);
      return false;
    }
  }

  /**
   * Update level config slot in backend and cache
   */
  private async updateLevelConfigSlot(slotIndex: number, structureId: string): Promise<void> {
    if (!this.userId) throw new Error("User ID not set");

    // Update backend
    const response = await updateSlotConfig(this.userId, slotIndex, structureId);
    if (!response.success) {
      throw new Error(`Failed to update slot ${slotIndex}: ${response.message}`);
    }

    // Update local cache
    const currentConfig = await localDataManager.getLevelConfig(this.userId);
    currentConfig[slotIndex] = structureId;
    localDataManager.updateLevelConfigCache(this.userId, currentConfig);
  }

  /**
   * Bulk update level config in backend and cache
   */
  private async updateLevelConfigBulk(levelConfig: string[]): Promise<void> {
    if (!this.userId) throw new Error("User ID not set");

    try {
      const response = await fetch(`/api/level-config/${this.userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ level_config: levelConfig }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to bulk update level config`);
      }

      // Update local cache
      localDataManager.updateLevelConfigCache(this.userId, levelConfig);
    } catch (error) {
      console.error("Error in bulk level config update:", error);
      throw error;
    }
  }

  /**
   * Bulk update inventory in backend and cache
   */
  private async updateInventoryBulk(
    inventory: Array<{ structure_name: string; count: number }>
  ): Promise<void> {
    if (!this.userId) throw new Error("User ID not set");

    try {
      const response = await fetchJSON("/api/inventory/bulk-update", {
        method: "PUT",
        body: { inventory_updates: inventory },
      });

      // Update local cache on success
      localDataManager.updateInventoryCache(this.userId, inventory);
    } catch (error) {
      if (error instanceof AuthenticationError) {
        console.error("Authentication error in bulk inventory update:", error);
        // Trigger login flow instead of throwing generic error
        triggerAuthFlow();
        throw new Error("Authentication required. Redirecting to login...");
      }

      console.error("Error in bulk inventory update:", error);
      throw error;
    }
  }

  /**
   * Synchronize all local changes to backend efficiently
   */
  async syncAllChanges(): Promise<void> {
    if (!this.userId) throw new Error("User ID not set");

    try {
      // Get current cached data
      const [levelConfig, inventory] = await Promise.all([
        localDataManager.getLevelConfig(this.userId),
        localDataManager.getInventory(this.userId),
      ]);

      // Perform bulk updates
      await Promise.all([
        this.updateLevelConfigBulk(levelConfig),
        this.updateInventoryBulk(inventory),
      ]);

    } catch (error) {
      console.error("Error syncing changes:", error);
      throw error;
    }
  }

  /**
   * Check if user has available structures of a given type
   */
  async hasAvailableStructure(structureId: string): Promise<boolean> {
    if (!this.userId || structureId === "empty") {
      return true;
    }

    const inventory = await localDataManager.getInventory(this.userId);
    const structureConfig = getStructureConfig(structureId);

    if (!structureConfig) {
      return false;
    }

    const inventoryItem = inventory.find((item) => item.structure_name === structureConfig.name);
    if (!inventoryItem) {
      return false;
    }

    return inventoryItem.count > 0;
  }

  /**
   * Clear all data when user changes
   */
  clear(): void {
    this.currentPlots = [];
    this.userId = null;
  }
}

// Export singleton instance
export const worldEditingService = WorldEditingService.getInstance();
