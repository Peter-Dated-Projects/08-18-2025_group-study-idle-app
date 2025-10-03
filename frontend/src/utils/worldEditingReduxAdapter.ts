/**
 * Redux Adapter for World Editing Service
 * Provides a bridge between Redux state management and the existing worldEditingService
 * This allows gradual migration while maintaining backward compatibility
 */

import { store } from "../store/store";
import type { AppDispatch } from "../store/store";
import {
  selectWorldData,
  selectCurrentPlots,
  selectStructureInventory,
  selectIsWorldLoading,
  selectSelectedPlotIndex,
} from "../store/selectors/worldSelectors";
import {
  initializePlotsFromConfig,
  placeStructureWithInventory,
  optimisticPlaceStructure,
  selectPlot,
  fetchStructureInventory,
} from "../store/slices/worldSlice";
import { worldEditingService } from "./worldEditingService";

export class WorldEditingReduxAdapter {
  private static instance: WorldEditingReduxAdapter;
  private dispatch: AppDispatch;

  private constructor() {
    this.dispatch = store.dispatch;
  }

  static getInstance(): WorldEditingReduxAdapter {
    if (!WorldEditingReduxAdapter.instance) {
      WorldEditingReduxAdapter.instance = new WorldEditingReduxAdapter();
    }
    return WorldEditingReduxAdapter.instance;
  }

  /**
   * Initialize world state in Redux from level config
   */
  async initializeWorldState(userId: string): Promise<void> {
    try {
      // Initialize plots from level config
      await this.dispatch(initializePlotsFromConfig(userId));

      // Load structure inventory
      await this.dispatch(fetchStructureInventory(userId));

      console.log("World state initialized in Redux");
    } catch (error) {
      console.error("Failed to initialize world state:", error);
      // Fall back to singleton service
      await worldEditingService.initialize(userId);
    }
  }

  /**
   * Get current plots from Redux state
   */
  getCurrentPlots() {
    const state = store.getState();
    const plots = selectCurrentPlots(state);

    if (plots.length === 0) {
      // Fallback to singleton service
      return worldEditingService.getCurrentPlots();
    }

    return plots;
  }

  /**
   * Get available plots (empty ones) from Redux state
   */
  getAvailablePlots() {
    const plots = this.getCurrentPlots();
    return plots.filter((plot) => plot.currentStructureId === "empty");
  }

  /**
   * Place structure using Redux
   */
  async placeStructure(plotIndex: number, structureId: string): Promise<boolean> {
    const state = store.getState();
    const userId = state.auth.user?.userId;

    if (!userId) {
      console.error("No user ID available for structure placement");
      return false;
    }

    try {
      // Optimistic update
      this.dispatch(optimisticPlaceStructure({ plotIndex, structureId }));

      // Perform actual placement
      const result = await this.dispatch(
        placeStructureWithInventory({
          userId,
          plotIndex,
          structureId,
        })
      );

      return placeStructureWithInventory.fulfilled.match(result);
    } catch (error) {
      console.error("Redux structure placement failed, falling back to singleton:", error);
      // Fallback to singleton service
      return worldEditingService.placeStructure(plotIndex, structureId);
    }
  }

  /**
   * Select a plot in Redux state
   */
  selectPlot(plotIndex: number | null): void {
    this.dispatch(selectPlot(plotIndex));
  }

  /**
   * Get currently selected plot index
   */
  getSelectedPlotIndex(): number | null {
    const state = store.getState();
    return selectSelectedPlotIndex(state);
  }

  /**
   * Get structure inventory from Redux
   */
  getStructureInventory() {
    const state = store.getState();
    const inventory = selectStructureInventory(state);

    if (inventory.length === 0) {
      // Could implement fallback to singleton if needed
      return [];
    }

    return inventory;
  }

  /**
   * Check if Redux state is ready (has plots and inventory loaded)
   */
  isReduxStateReady(): boolean {
    const state = store.getState();
    const plots = selectCurrentPlots(state);
    const inventory = selectStructureInventory(state);

    return plots.length > 0 && inventory.length >= 0; // inventory can be empty array
  }

  /**
   * Sync from singleton service to Redux (for migration purposes)
   */
  async syncFromSingletonToRedux(userId: string): Promise<void> {
    try {
      const singletonPlots = worldEditingService.getCurrentPlots();

      if (singletonPlots.length > 0) {
        // Convert singleton plots to level config format
        const levelConfig = singletonPlots.map((plot) => plot.currentStructureId);

        // Initialize Redux with this data
        await this.dispatch(initializePlotsFromConfig(userId));
        await this.dispatch(fetchStructureInventory(userId));

        console.log("Synced singleton state to Redux");
      }
    } catch (error) {
      console.error("Failed to sync singleton to Redux:", error);
    }
  }
}

// Export singleton instance
export const worldEditingReduxAdapter = WorldEditingReduxAdapter.getInstance();
