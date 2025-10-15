import type { RootState } from "../store";
import type { WorldState } from "../slices/worldSlice";
import { getAllStructureConfigs } from "../../config/structureConfigs";
import type { StructureConfig } from "../../config/structureConfigs";

// Enhanced structure inventory item with usage tracking
export interface AvailableStructureItem {
  structure_name: string;
  count: number; // Total owned
  available_count: number; // Available to use (not currently placed)
  placed_count: number; // Currently placed in level config
}

// World selectors
export const selectWorldData = (state: RootState) => (state.world as WorldState).worldData;
export const selectIsWorldLoading = (state: RootState) => (state.world as WorldState).isLoading;
export const selectWorldError = (state: RootState) => (state.world as WorldState).error;
export const selectCurrentPlots = (state: RootState) => (state.world as WorldState).currentPlots;
export const selectSelectedPlotIndex = (state: RootState) =>
  (state.world as WorldState).selectedPlotIndex;
export const selectIsStructuresModalOpen = (state: RootState) =>
  (state.world as WorldState).isStructuresModalOpen;
export const selectHoveredSlot = (state: RootState) => (state.world as WorldState).hoveredSlot;
export const selectPendingPlacements = (state: RootState) =>
  (state.world as WorldState).pendingPlacements;
export const selectPendingRemovals = (state: RootState) =>
  (state.world as WorldState).pendingRemovals;
export const selectPendingVisualUpdates = (state: RootState) =>
  (state.world as WorldState).pendingVisualUpdates;
export const selectIsWorldSaving = (state: RootState) => (state.world as WorldState).isSaving;
export const selectStructureInventory = (state: RootState) =>
  (state.world as WorldState).structureInventory;

// Debug selector to check the current state
export const selectWorldDebugInfo = (state: RootState) => {
  const worldState = state.world as WorldState;
  return {
    isLoading: worldState.isLoading,
    plotsCount: worldState.currentPlots.length,
    inventoryCount: worldState.structureInventory.length,
    plots: worldState.currentPlots.map(p => ({ index: p.index, structure: p.currentStructureId })),
    inventory: worldState.structureInventory.map(i => ({ name: i.structure_name, count: i.count }))
  };
};

// Computed selectors
export const selectPlotByIndex = (index: number) => (state: RootState) =>
  (state.world as WorldState).currentPlots.find((plot) => plot.index === index);

export const selectHasSelectedPlot = (state: RootState) =>
  (state.world as WorldState).selectedPlotIndex !== null;

export const selectSelectedPlot = (state: RootState) => {
  const worldState = state.world as WorldState;
  return worldState.selectedPlotIndex !== null
    ? worldState.currentPlots.find((plot) => plot.index === worldState.selectedPlotIndex)
    : undefined;
};

export const selectHasPendingUpdates = (state: RootState) =>
  (state.world as WorldState).pendingVisualUpdates.length > 0;

// Computed selector for available (unused) structures
export const selectAvailableStructureCounts = (state: RootState): AvailableStructureItem[] => {
  const worldState = state.world as WorldState;
  const { structureInventory, currentPlots, isLoading } = worldState;

  // Handle case where data hasn't loaded yet
  // We expect exactly 7 plots after initialization and at least some inventory data
  // (even if inventory is empty, the array should exist)
  if (isLoading || currentPlots.length !== 7 || structureInventory === undefined) {

    return [];
  }

  // Count how many of each structure type are currently placed in level config
  const placedCounts: Record<string, number> = {};
  
  currentPlots.forEach((plot) => {
    if (plot.currentStructureId && plot.currentStructureId !== "empty") {
      const structureId = plot.currentStructureId;
      placedCounts[structureId] = (placedCounts[structureId] || 0) + 1;
    }
  });

  // Calculate available counts by subtracting placed from inventory
  const result = structureInventory.map((inventoryItem): AvailableStructureItem => {
    // Try to find the structure config by matching either ID or name
    // This handles both cases: inventory storing IDs vs display names
    const structureConfig = getAllStructureConfigs().find(
      (config: StructureConfig) => 
        config.id === inventoryItem.structure_name || // ID match (preferred)
        config.name === inventoryItem.structure_name   // Name match (fallback)
    );
    
    if (!structureConfig) {
      // If we can't find the structure config, return the inventory item as-is

      return {
        structure_name: inventoryItem.structure_name,
        count: inventoryItem.count,
        available_count: inventoryItem.count,
        placed_count: 0,
      };
    }

    // For placed count calculation, always use the structure ID
    const placedCount = placedCounts[structureConfig.id] || 0;
    const availableCount = Math.max(0, inventoryItem.count - placedCount);

    return {
      structure_name: inventoryItem.structure_name,
      count: inventoryItem.count, // Total owned
      available_count: availableCount, // Available to use
      placed_count: placedCount, // Currently placed
    };
  });

  return result;
};

// Helper function to get available count for a specific structure name
export const selectAvailableCountForStructure = (structureName: string) => (state: RootState) => {
  const availableCounts = selectAvailableStructureCounts(state);
  const item = availableCounts.find((item) => item.structure_name === structureName);
  return item ? item.available_count : 0;
};

// Helper to get placed count for a specific structure name
export const selectPlacedCountForStructure = (structureName: string) => (state: RootState) => {
  const availableCounts = selectAvailableStructureCounts(state);
  const item = availableCounts.find((item) => item.structure_name === structureName);
  return item ? item.placed_count : 0;
};
