import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

export interface StructureInventoryItem {
  structure_name: string;
  count: number;
}

export interface LevelConfig {
  max_level: number;
  current_exp: number;
  exp_to_next_level: number;
  current_level: number;
}

export interface InventoryState {
  structures: StructureInventoryItem[];
  levelConfig: LevelConfig | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number | null;
  optimisticUpdates: Record<string, number>; // structure_name -> count delta
}

const initialState: InventoryState = {
  structures: [],
  levelConfig: null,
  isLoading: false,
  error: null,
  lastUpdated: null,
  optimisticUpdates: {},
};

// Async thunks
export const fetchInventory = createAsyncThunk(
  "inventory/fetchInventory",
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/inventory/${userId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        return rejectWithValue("Failed to fetch inventory");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue("Network error");
    }
  }
);

export const fetchLevelConfig = createAsyncThunk(
  "inventory/fetchLevelConfig",
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/level-config/${userId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        return rejectWithValue("Failed to fetch level config");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue("Network error");
    }
  }
);

export const placeStructure = createAsyncThunk(
  "inventory/placeStructure",
  async (
    {
      userId,
      structureName,
      plotIndex,
    }: { userId: string; structureName: string; plotIndex: number },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch("/api/world/place-structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          user_id: userId,
          structure_name: structureName,
          plot_index: plotIndex,
        }),
      });

      if (!response.ok) {
        return rejectWithValue("Failed to place structure");
      }

      const data = await response.json();
      return { structureName, plotIndex, data };
    } catch (error) {
      return rejectWithValue("Network error");
    }
  }
);

const inventorySlice = createSlice({
  name: "inventory",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    // Optimistic updates for immediate UI response
    optimisticStructureUse: (
      state,
      action: PayloadAction<{ structureName: string; count: number }>
    ) => {
      const { structureName, count } = action.payload;
      state.optimisticUpdates[structureName] =
        (state.optimisticUpdates[structureName] || 0) + count;
    },
    clearOptimisticUpdates: (state) => {
      state.optimisticUpdates = {};
    },
    // Update inventory from external events (WebSocket, etc.)
    updateInventoryItem: (state, action: PayloadAction<StructureInventoryItem>) => {
      const item = action.payload;
      const index = state.structures.findIndex((s) => s.structure_name === item.structure_name);
      if (index >= 0) {
        state.structures[index] = item;
      } else {
        state.structures.push(item);
      }
      state.lastUpdated = Date.now();
    },
    updateLevelConfig: (state, action: PayloadAction<LevelConfig>) => {
      state.levelConfig = action.payload;
      state.lastUpdated = Date.now();
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Inventory
      .addCase(fetchInventory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchInventory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.structures = action.payload.structures || [];
        state.lastUpdated = Date.now();
        state.error = null;
        // Clear optimistic updates on successful fetch
        state.optimisticUpdates = {};
      })
      .addCase(fetchInventory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch Level Config
      .addCase(fetchLevelConfig.fulfilled, (state, action) => {
        state.levelConfig = action.payload;
      })
      // Place Structure
      .addCase(placeStructure.fulfilled, (state, action) => {
        const { structureName } = action.payload;
        // Update inventory count
        const item = state.structures.find((s) => s.structure_name === structureName);
        if (item && item.count > 0) {
          item.count -= 1;
        }
        // Clear the optimistic update
        delete state.optimisticUpdates[structureName];
        state.lastUpdated = Date.now();
      })
      .addCase(placeStructure.rejected, (state, action) => {
        state.error = action.payload as string;
        // Revert optimistic updates on failure
        state.optimisticUpdates = {};
      });
  },
});

export const {
  clearError,
  optimisticStructureUse,
  clearOptimisticUpdates,
  updateInventoryItem,
  updateLevelConfig,
} = inventorySlice.actions;

export default inventorySlice.reducer;
