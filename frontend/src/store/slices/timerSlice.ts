import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'

export interface PomoBlockSettings {
  workDuration: number // minutes
  shortBreakDuration: number
  longBreakDuration: number
  sessionsUntilLongBreak: number
  autoStartBreaks: boolean
  autoStartPomodoros: boolean
  sound: boolean
}

export type PomoBlockPhase = 'idle' | 'work' | 'shortBreak' | 'longBreak'

export interface TimerState {
  // Timer state
  currentPhase: PomoBlockPhase
  timeLeft: number // seconds
  isRunning: boolean
  completedSessions: number
  hasProcessedCompletion: boolean
  
  // Settings
  settings: PomoBlockSettings
  isEditingTime: boolean
  editHours: string
  editMinutes: string
  
  // Bank/earnings state
  bankBalance: number
  pendingEarnings: number
  isUpdatingBank: boolean
  
  // API state
  isLoading: boolean
  error: string | null
  lastUpdated: number | null
}

const defaultSettings: PomoBlockSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsUntilLongBreak: 4,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  sound: true,
}

const initialState: TimerState = {
  currentPhase: 'idle',
  timeLeft: defaultSettings.workDuration * 60,
  isRunning: false,
  completedSessions: 0,
  hasProcessedCompletion: false,
  
  settings: defaultSettings,
  isEditingTime: false,
  editHours: '0',
  editMinutes: defaultSettings.workDuration.toString(),
  
  bankBalance: 0,
  pendingEarnings: 0,
  isUpdatingBank: false,
  
  isLoading: false,
  error: null,
  lastUpdated: null,
}

// Async thunks
export const updatePomoBank = createAsyncThunk(
  'timer/updatePomoBank',
  async (
    { userId, minutes }: { userId: string; minutes: number },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch('/api/pomo-bank/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          user_id: userId,
          minutes: minutes,
        }),
      })
      
      if (!response.ok) {
        return rejectWithValue('Failed to update pomo bank')
      }
      
      const data = await response.json()
      return { minutes, balance: data.balance }
    } catch (error) {
      return rejectWithValue('Network error')
    }
  }
)

export const updateLeaderboard = createAsyncThunk(
  'timer/updateLeaderboard',
  async (
    { userId, minutes }: { userId: string; minutes: number },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch('/api/leaderboard/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          user_id: userId,
          minutes: minutes,
        }),
      })
      
      if (!response.ok) {
        return rejectWithValue('Failed to update leaderboard')
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      return rejectWithValue('Network error')
    }
  }
)

export const fetchBankBalance = createAsyncThunk(
  'timer/fetchBankBalance',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/pomo-bank/${userId}`, {
        credentials: 'include',
      })
      
      if (!response.ok) {
        return rejectWithValue('Failed to fetch bank balance')
      }
      
      const data = await response.json()
      return data.balance
    } catch (error) {
      return rejectWithValue('Network error')
    }
  }
)

const timerSlice = createSlice({
  name: 'timer',
  initialState,
  reducers: {
    // Timer controls
    startTimer: (state) => {
      state.isRunning = true
      state.hasProcessedCompletion = false
    },
    pauseTimer: (state) => {
      state.isRunning = false
    },
    resetTimer: (state) => {
      state.isRunning = false
      state.currentPhase = 'idle'
      state.timeLeft = state.settings.workDuration * 60
      state.completedSessions = 0
      state.hasProcessedCompletion = false
      state.pendingEarnings = 0
    },
    tick: (state) => {
      if (state.isRunning && state.timeLeft > 0) {
        state.timeLeft -= 1
      }
    },
    completePhase: (state) => {
      state.hasProcessedCompletion = true
      
      if (state.currentPhase === 'work') {
        state.completedSessions += 1
        state.pendingEarnings += state.settings.workDuration
        
        // Determine next phase
        if (state.completedSessions % state.settings.sessionsUntilLongBreak === 0) {
          state.currentPhase = 'longBreak'
          state.timeLeft = state.settings.longBreakDuration * 60
        } else {
          state.currentPhase = 'shortBreak'
          state.timeLeft = state.settings.shortBreakDuration * 60
        }
        
        state.isRunning = state.settings.autoStartBreaks
      } else {
        // End of break - go back to work
        state.currentPhase = 'work'
        state.timeLeft = state.settings.workDuration * 60
        state.isRunning = state.settings.autoStartPomodoros
      }
    },
    
    // Settings
    updateSettings: (state, action: PayloadAction<Partial<PomoBlockSettings>>) => {
      state.settings = { ...state.settings, ...action.payload }
      
      // Update timeLeft if we're idle and work duration changed
      if (state.currentPhase === 'idle' && action.payload.workDuration) {
        state.timeLeft = action.payload.workDuration * 60
      }
    },
    setEditingTime: (state, action: PayloadAction<boolean>) => {
      state.isEditingTime = action.payload
    },
    setEditHours: (state, action: PayloadAction<string>) => {
      state.editHours = action.payload
    },
    setEditMinutes: (state, action: PayloadAction<string>) => {
      state.editMinutes = action.payload
    },
    applyTimeEdit: (state) => {
      const totalMinutes = parseInt(state.editHours) * 60 + parseInt(state.editMinutes)
      state.settings.workDuration = totalMinutes
      state.timeLeft = totalMinutes * 60
      state.isEditingTime = false
    },
    
    // Bank balance updates (from WebSocket or external events)
    updateBankBalance: (state, action: PayloadAction<number>) => {
      state.bankBalance = action.payload
      state.lastUpdated = Date.now()
    },
    addPendingEarnings: (state, action: PayloadAction<number>) => {
      state.pendingEarnings += action.payload
    },
    clearPendingEarnings: (state) => {
      state.pendingEarnings = 0
    },
    
    // Error handling
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Update Pomo Bank
      .addCase(updatePomoBank.pending, (state) => {
        state.isUpdatingBank = true
        state.error = null
      })
      .addCase(updatePomoBank.fulfilled, (state, action) => {
        state.isUpdatingBank = false
        state.bankBalance = action.payload.balance
        state.pendingEarnings = Math.max(0, state.pendingEarnings - action.payload.minutes)
        state.lastUpdated = Date.now()
      })
      .addCase(updatePomoBank.rejected, (state, action) => {
        state.isUpdatingBank = false
        state.error = action.payload as string
      })
      // Update Leaderboard
      .addCase(updateLeaderboard.rejected, (state, action) => {
        state.error = action.payload as string
      })
      // Fetch Bank Balance
      .addCase(fetchBankBalance.fulfilled, (state, action) => {
        state.bankBalance = action.payload
        state.lastUpdated = Date.now()
      })
      .addCase(fetchBankBalance.rejected, (state, action) => {
        state.error = action.payload as string
      })
  },
})

export const {
  startTimer,
  pauseTimer,
  resetTimer,
  tick,
  completePhase,
  updateSettings,
  setEditingTime,
  setEditHours,
  setEditMinutes,
  applyTimeEdit,
  updateBankBalance,
  addPendingEarnings,
  clearPendingEarnings,
  clearError,
} = timerSlice.actions

export default timerSlice.reducer