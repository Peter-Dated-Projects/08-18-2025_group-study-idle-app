import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

export interface WorldStructure {
  plot_index: number;
  structure_name: string;
  structure_id: string;
  coordinates: { x: number; y: number };
}

export interface WorldData {
  user_id: string;
  structures: WorldStructure[];
}

export interface StructureInventoryItem {
  structure_name: string;
  count: number;
}

export interface StructurePlot {
  index: number; // 0-6, corresponding to the 7 plots
  currentStructureId: string;
  position: { x: number; y: number };
}

export interface WorldState {
  // Core world data
  worldData: WorldData | null;
  currentPlots: StructurePlot[];

  // Inventory data
  structureInventory: StructureInventoryItem[];

  // UI state
  selectedPlotIndex: number | null;
  isStructuresModalOpen: boolean;
  hoveredSlot: number | null;

  // Optimistic updates for immediate UI feedback
  optimisticPlacements: WorldStructure[];
  pendingPlacements: { plotIndex: number; structureId: string }[];
  pendingRemovals: number[];

  // Visual update queue (converted from Set to Array for Redux serialization)
  pendingVisualUpdates: number[]; // Plot indices that need visual refresh
  lastVisualUpdate: number | null;

  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  lastUpdated: number | null;
}

const initialState: WorldState = {
  // Core world data
  worldData: null,
  currentPlots: [],

  // Inventory data
  structureInventory: [],

  // UI state
  selectedPlotIndex: null,
  isStructuresModalOpen: false,
  hoveredSlot: null,

  // Optimistic updates
  optimisticPlacements: [],
  pendingPlacements: [],
  pendingRemovals: [],

  // Visual updates
  pendingVisualUpdates: [],
  lastVisualUpdate: null,

  // Loading states
  isLoading: false,
  isSaving: false,
  error: null,
  lastUpdated: null,
};

// Helper functions for array-based set operations
const addToArray = (arr: number[], value: number) => {
  if (!arr.includes(value)) {
    arr.push(value);
  }
};

const removeFromArray = (arr: number[], value: number) => {
  return arr.filter((v) => v !== value);
};

// Helper function for plot positions (matches worldEditingService)
const getPlotPosition = (index: number): { x: number; y: number } => {
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
};

// Async thunks
export const fetchWorldData = createAsyncThunk(
  "world/fetchWorldData",
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/world/data/${userId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        return rejectWithValue("Failed to fetch world data");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue("Network error");
    }
  }
);

export const initializePlotsFromConfig = createAsyncThunk(
  "world/initializePlotsFromConfig",
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/level-config/${userId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        return rejectWithValue("Failed to fetch level config");
      }

      const data = await response.json();
      return data.level_config || [];
    } catch (error) {
      return rejectWithValue("Network error");
    }
  }
);

export const placeStructureOnPlot = createAsyncThunk(
  "world/placeStructureOnPlot",
  async (
    { userId, plotIndex, structureId }: { userId: string; plotIndex: number; structureId: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch("/api/world/place-structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          user_id: userId,
          plot_index: plotIndex,
          structure_id: structureId,
        }),
      });

      if (!response.ok) {
        return rejectWithValue("Failed to place structure");
      }

      const data = await response.json();
      return { plotIndex, structureId, ...data };
    } catch (error) {
      return rejectWithValue("Network error");
    }
  }
);

export const swapStructures = createAsyncThunk(
  "world/swapStructures",
  async (
    {
      userId,
      plot1Index,
      plot2Index,
    }: {
      userId: string;
      plot1Index: number;
      plot2Index: number;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch("/api/world/swap-structures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          user_id: userId,
          plot1_index: plot1Index,
          plot2_index: plot2Index,
        }),
      });

      if (!response.ok) {
        return rejectWithValue("Failed to swap structures");
      }

      const data = await response.json();
      return { plot1Index, plot2Index, data };
    } catch (error) {
      return rejectWithValue("Network error");
    }
  }
);

export const removeStructure = createAsyncThunk(
  "world/removeStructure",
  async ({ userId, plotIndex }: { userId: string; plotIndex: number }, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/world/remove-structure", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          user_id: userId,
          plot_index: plotIndex,
        }),
      });

      if (!response.ok) {
        return rejectWithValue("Failed to remove structure");
      }

      const data = await response.json();
      return { plotIndex, data };
    } catch (error) {
      return rejectWithValue("Network error");
    }
  }
);

// Fetch Structure Inventory Thunk
export const fetchStructureInventory = createAsyncThunk(
  "world/fetchStructureInventory",
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/inventory/${userId}`);
      if (!response.ok) {
        return rejectWithValue(`Failed to fetch inventory: ${response.status}`);
      }
      const data = await response.json();
      if (data.success && data.data) {
        return data.data.structure_inventory;
      } else {
        return [];
      }
    } catch (error) {
      return rejectWithValue("Network error");
    }
  }
);

// Place Structure and Update Inventory
export const placeStructureWithInventory = createAsyncThunk(
  "world/placeStructureWithInventory",
  async (
    { userId, plotIndex, structureId }: { userId: string; plotIndex: number; structureId: string },
    { rejectWithValue, dispatch }
  ) => {
    try {
      // Place structure
      const result = await dispatch(placeStructureOnPlot({ userId, plotIndex, structureId }));

      if (placeStructureOnPlot.fulfilled.match(result)) {
        // Refresh inventory after successful placement
        await dispatch(fetchStructureInventory(userId));
        return result.payload;
      } else {
        return rejectWithValue(result.payload);
      }
    } catch (error) {
      return rejectWithValue("Network error");
    }
  }
);

const worldSlice = createSlice({
  name: "world",
  initialState,
  reducers: {
    // UI State Management
    selectPlot: (state, action: PayloadAction<number | null>) => {
      state.selectedPlotIndex = action.payload;
    },
    setHoveredSlot: (state, action: PayloadAction<number | null>) => {
      state.hoveredSlot = action.payload;
    },
    openStructuresModal: (state) => {
      state.isStructuresModalOpen = true;
    },
    closeStructuresModal: (state) => {
      state.isStructuresModalOpen = false;
    },
    toggleStructuresModal: (state) => {
      state.isStructuresModalOpen = !state.isStructuresModalOpen;
    },

    // Initialize plots from level config
    initializePlots: (state, action: PayloadAction<string[]>) => {
      const levelConfig = action.payload;
      state.currentPlots = levelConfig.map((structureId, index) => ({
        index,
        currentStructureId: structureId,
        position: getPlotPosition(index),
      }));
    },

    // Optimistic Updates for Immediate UI Feedback
    optimisticPlaceStructure: (
      state,
      action: PayloadAction<{ plotIndex: number; structureId: string }>
    ) => {
      const { plotIndex, structureId } = action.payload;

      // Update current plots
      if (state.currentPlots[plotIndex]) {
        state.currentPlots[plotIndex].currentStructureId = structureId;
      }

      // Add to pending placements
      const existingIndex = state.pendingPlacements.findIndex((p) => p.plotIndex === plotIndex);
      if (existingIndex >= 0) {
        state.pendingPlacements[existingIndex].structureId = structureId;
      } else {
        state.pendingPlacements.push({ plotIndex, structureId });
      }

      // Mark for visual update
      addToArray(state.pendingVisualUpdates, plotIndex);
      state.lastVisualUpdate = Date.now();
    },

    // Optimistic inventory update when placing structure
    optimisticUpdateInventory: (
      state,
      action: PayloadAction<{ structureName: string; delta: number }>
    ) => {
      const { structureName, delta } = action.payload;
      const inventoryItem = state.structureInventory.find(
        (item) => item.structure_name === structureName
      );

      if (inventoryItem) {
        inventoryItem.count = Math.max(0, inventoryItem.count + delta);
      }
    },

    optimisticSwapStructures: (
      state,
      action: PayloadAction<{ plot1Index: number; plot2Index: number }>
    ) => {
      const { plot1Index, plot2Index } = action.payload;

      if (state.currentPlots[plot1Index] && state.currentPlots[plot2Index]) {
        const temp = state.currentPlots[plot1Index].currentStructureId;
        state.currentPlots[plot1Index].currentStructureId =
          state.currentPlots[plot2Index].currentStructureId;
        state.currentPlots[plot2Index].currentStructureId = temp;

        // Mark both for visual update
        addToArray(state.pendingVisualUpdates, plot1Index);
        addToArray(state.pendingVisualUpdates, plot2Index);
        state.lastVisualUpdate = Date.now();
      }
    },

    optimisticRemoveStructure: (state, action: PayloadAction<number>) => {
      const plotIndex = action.payload;

      // Update current plots
      if (state.currentPlots[plotIndex]) {
        state.currentPlots[plotIndex].currentStructureId = "empty";
      }

      // Add to pending removals
      addToArray(state.pendingRemovals, plotIndex);

      // Mark for visual update
      addToArray(state.pendingVisualUpdates, plotIndex);
      state.lastVisualUpdate = Date.now();
    },

    // Clear optimistic updates when confirmed
    clearOptimisticPlacements: (state) => {
      state.optimisticPlacements = [];
      state.pendingPlacements = [];
      state.pendingRemovals = [];
    },

    // Visual Update Queue Management
    markForVisualUpdate: (state, action: PayloadAction<number[]>) => {
      action.payload.forEach((plotIndex) => {
        addToArray(state.pendingVisualUpdates, plotIndex);
      });
      state.lastVisualUpdate = Date.now();
    },
    clearVisualUpdate: (state, action: PayloadAction<number>) => {
      state.pendingVisualUpdates = removeFromArray(state.pendingVisualUpdates, action.payload);
    },
    clearAllVisualUpdates: (state) => {
      state.pendingVisualUpdates = [];
    },

    // Update from external events (WebSocket, etc.)
    updateWorldStructure: (state, action: PayloadAction<WorldStructure>) => {
      if (!state.worldData) return;

      const structure = action.payload;
      const existingIndex = state.worldData.structures.findIndex(
        (s) => s.plot_index === structure.plot_index
      );

      if (existingIndex >= 0) {
        state.worldData.structures[existingIndex] = structure;
      } else {
        state.worldData.structures.push(structure);
      }

      addToArray(state.pendingVisualUpdates, structure.plot_index);
      state.lastUpdated = Date.now();
    },
    removeWorldStructure: (state, action: PayloadAction<number>) => {
      if (!state.worldData) return;

      const plotIndex = action.payload;
      state.worldData.structures = state.worldData.structures.filter(
        (s) => s.plot_index !== plotIndex
      );

      addToArray(state.pendingVisualUpdates, plotIndex);
      state.lastUpdated = Date.now();
    },

    // Error handling
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch World Data
      .addCase(fetchWorldData.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchWorldData.fulfilled, (state, action) => {
        state.isLoading = false;
        state.worldData = action.payload;
        state.lastUpdated = Date.now();
        state.error = null;
        // Clear optimistic updates on successful fetch
        state.optimisticPlacements = [];
      })
      .addCase(fetchWorldData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Initialize Plots From Config
      .addCase(initializePlotsFromConfig.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(initializePlotsFromConfig.fulfilled, (state, action) => {
        state.isLoading = false;
        const levelConfig = action.payload;
        state.currentPlots = levelConfig.map((structureId: string, index: number) => ({
          index,
          currentStructureId: structureId,
          position: getPlotPosition(index),
        }));
      })
      .addCase(initializePlotsFromConfig.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Place Structure On Plot
      .addCase(placeStructureOnPlot.pending, (state) => {
        state.isSaving = true;
      })
      .addCase(placeStructureOnPlot.fulfilled, (state, action) => {
        state.isSaving = false;
        const { plotIndex, structureId } = action.payload;

        // Update current plots
        if (state.currentPlots[plotIndex]) {
          state.currentPlots[plotIndex].currentStructureId = structureId;
        }

        // Remove from pending placements
        state.pendingPlacements = state.pendingPlacements.filter((p) => p.plotIndex !== plotIndex);

        // Clear visual updates for this plot
        state.pendingVisualUpdates = removeFromArray(state.pendingVisualUpdates, plotIndex);
        state.lastUpdated = Date.now();
      })
      .addCase(placeStructureOnPlot.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload as string;
      })
      // Fetch Structure Inventory
      .addCase(fetchStructureInventory.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchStructureInventory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.structureInventory = action.payload;
      })
      .addCase(fetchStructureInventory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Swap Structures
      .addCase(swapStructures.fulfilled, (state, action) => {
        const { plot1Index, plot2Index } = action.payload;

        if (!state.worldData) return;

        // Find the structures to swap
        const structure1 = state.worldData.structures.find((s) => s.plot_index === plot1Index);
        const structure2 = state.worldData.structures.find((s) => s.plot_index === plot2Index);

        // Swap their plot indices
        if (structure1) structure1.plot_index = plot2Index;
        if (structure2) structure2.plot_index = plot1Index;

        // Mark for visual update
        addToArray(state.pendingVisualUpdates, plot1Index);
        addToArray(state.pendingVisualUpdates, plot2Index);
        state.lastUpdated = Date.now();
      })
      .addCase(swapStructures.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Remove Structure
      .addCase(removeStructure.fulfilled, (state, action) => {
        const { plotIndex } = action.payload;

        if (!state.worldData) return;

        state.worldData.structures = state.worldData.structures.filter(
          (s) => s.plot_index !== plotIndex
        );

        addToArray(state.pendingVisualUpdates, plotIndex);
        state.lastUpdated = Date.now();
      })
      .addCase(removeStructure.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

// Export all actions
export const {
  clearError,
  optimisticPlaceStructure,
  optimisticUpdateInventory,
  optimisticSwapStructures,
  optimisticRemoveStructure,
  clearOptimisticPlacements,
  markForVisualUpdate,
  clearVisualUpdate,
  clearAllVisualUpdates,
  updateWorldStructure,
  removeWorldStructure,
  selectPlot,
  setHoveredSlot,
  openStructuresModal,
  closeStructuresModal,
  toggleStructuresModal,
  initializePlots,
} = worldSlice.actions;

export default worldSlice.reducer;
