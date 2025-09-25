import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'

export interface WorldStructure {
  plot_index: number
  structure_name: string
  structure_id: string
  coordinates: { x: number; y: number }
}

export interface WorldData {
  user_id: string
  structures: WorldStructure[]
}

export interface WorldState {
  worldData: WorldData | null
  isLoading: boolean
  error: string | null
  lastUpdated: number | null
  optimisticPlacements: WorldStructure[] // For immediate UI updates
  pendingVisualUpdates: Set<number> // Plot indices that need visual refresh
}

const initialState: WorldState = {
  worldData: null,
  isLoading: false,
  error: null,
  lastUpdated: null,
  optimisticPlacements: [],
  pendingVisualUpdates: new Set(),
}

// Async thunks
export const fetchWorldData = createAsyncThunk(
  'world/fetchWorldData',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/world/data/${userId}`, {
        credentials: 'include',
      })
      
      if (!response.ok) {
        return rejectWithValue('Failed to fetch world data')
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      return rejectWithValue('Network error')
    }
  }
)

export const swapStructures = createAsyncThunk(
  'world/swapStructures',
  async (
    { 
      userId, 
      plot1Index, 
      plot2Index 
    }: { 
      userId: string
      plot1Index: number
      plot2Index: number 
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch('/api/world/swap-structures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          user_id: userId,
          plot1_index: plot1Index,
          plot2_index: plot2Index,
        }),
      })
      
      if (!response.ok) {
        return rejectWithValue('Failed to swap structures')
      }
      
      const data = await response.json()
      return { plot1Index, plot2Index, data }
    } catch (error) {
      return rejectWithValue('Network error')
    }
  }
)

export const removeStructure = createAsyncThunk(
  'world/removeStructure',
  async (
    { userId, plotIndex }: { userId: string; plotIndex: number },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch('/api/world/remove-structure', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          user_id: userId,
          plot_index: plotIndex,
        }),
      })
      
      if (!response.ok) {
        return rejectWithValue('Failed to remove structure')
      }
      
      const data = await response.json()
      return { plotIndex, data }
    } catch (error) {
      return rejectWithValue('Network error')
    }
  }
)

const worldSlice = createSlice({
  name: 'world',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    // Optimistic updates for immediate visual response
    optimisticPlaceStructure: (state, action: PayloadAction<WorldStructure>) => {
      state.optimisticPlacements.push(action.payload)
      state.pendingVisualUpdates.add(action.payload.plot_index)
    },
    optimisticSwapStructures: (state, action: PayloadAction<{ plot1Index: number; plot2Index: number }>) => {
      const { plot1Index, plot2Index } = action.payload
      state.pendingVisualUpdates.add(plot1Index)
      state.pendingVisualUpdates.add(plot2Index)
    },
    optimisticRemoveStructure: (state, action: PayloadAction<{ plotIndex: number }>) => {
      const { plotIndex } = action.payload
      // Remove from optimistic placements
      state.optimisticPlacements = state.optimisticPlacements.filter(
        s => s.plot_index !== plotIndex
      )
      state.pendingVisualUpdates.add(plotIndex)
    },
    clearOptimisticPlacements: (state) => {
      state.optimisticPlacements = []
    },
    // Mark plots for visual update (used by visualWorldUpdateService)
    markForVisualUpdate: (state, action: PayloadAction<number[]>) => {
      action.payload.forEach(plotIndex => {
        state.pendingVisualUpdates.add(plotIndex)
      })
    },
    clearVisualUpdate: (state, action: PayloadAction<number>) => {
      state.pendingVisualUpdates.delete(action.payload)
    },
    clearAllVisualUpdates: (state) => {
      state.pendingVisualUpdates.clear()
    },
    // Update from external events (WebSocket, etc.)
    updateWorldStructure: (state, action: PayloadAction<WorldStructure>) => {
      if (!state.worldData) return
      
      const structure = action.payload
      const existingIndex = state.worldData.structures.findIndex(
        s => s.plot_index === structure.plot_index
      )
      
      if (existingIndex >= 0) {
        state.worldData.structures[existingIndex] = structure
      } else {
        state.worldData.structures.push(structure)
      }
      
      state.pendingVisualUpdates.add(structure.plot_index)
      state.lastUpdated = Date.now()
    },
    removeWorldStructure: (state, action: PayloadAction<number>) => {
      if (!state.worldData) return
      
      const plotIndex = action.payload
      state.worldData.structures = state.worldData.structures.filter(
        s => s.plot_index !== plotIndex
      )
      
      state.pendingVisualUpdates.add(plotIndex)
      state.lastUpdated = Date.now()
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch World Data
      .addCase(fetchWorldData.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchWorldData.fulfilled, (state, action) => {
        state.isLoading = false
        state.worldData = action.payload
        state.lastUpdated = Date.now()
        state.error = null
        // Clear optimistic updates on successful fetch
        state.optimisticPlacements = []
      })
      .addCase(fetchWorldData.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Swap Structures
      .addCase(swapStructures.fulfilled, (state, action) => {
        const { plot1Index, plot2Index } = action.payload
        
        if (!state.worldData) return
        
        // Find the structures to swap
        const structure1 = state.worldData.structures.find(s => s.plot_index === plot1Index)
        const structure2 = state.worldData.structures.find(s => s.plot_index === plot2Index)
        
        // Swap their plot indices
        if (structure1) structure1.plot_index = plot2Index
        if (structure2) structure2.plot_index = plot1Index
        
        // Mark for visual update
        state.pendingVisualUpdates.add(plot1Index)
        state.pendingVisualUpdates.add(plot2Index)
        state.lastUpdated = Date.now()
      })
      .addCase(swapStructures.rejected, (state, action) => {
        state.error = action.payload as string
      })
      // Remove Structure
      .addCase(removeStructure.fulfilled, (state, action) => {
        const { plotIndex } = action.payload
        
        if (!state.worldData) return
        
        state.worldData.structures = state.worldData.structures.filter(
          s => s.plot_index !== plotIndex
        )
        
        state.pendingVisualUpdates.add(plotIndex)
        state.lastUpdated = Date.now()
      })
      .addCase(removeStructure.rejected, (state, action) => {
        state.error = action.payload as string
      })
  },
})

export const {
  clearError,
  optimisticPlaceStructure,
  optimisticSwapStructures,
  optimisticRemoveStructure,
  clearOptimisticPlacements,
  markForVisualUpdate,
  clearVisualUpdate,
  clearAllVisualUpdates,
  updateWorldStructure,
  removeWorldStructure,
} = worldSlice.actions

export default worldSlice.reducer