import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'

export interface Task {
  id: string
  title: string
  completed: boolean
  created_time: string
  last_edited_time: string
  session_id: string
}

export interface TaskCreate {
  clientTempId: string
  title: string
  completed: boolean
  session_id: string
  attemptCount: number
}

export interface TaskUpdate {
  id: string
  title?: string
  completed?: boolean
  attemptCount: number
}

export interface TaskDelete {
  id: string
  attemptCount: number
}

export interface StudySession {
  id: string
  title: string
  createdTime: string
  lastEditedTime: string
  notionUrl: string
  archived: boolean
  properties?: Record<string, unknown>
}

export interface TasksState {
  tasks: Task[]
  studySessions: StudySession[]
  selectedSession: StudySession | null
  
  // Sync state
  pendingCreates: TaskCreate[]
  pendingUpdates: TaskUpdate[]
  pendingDeletes: TaskDelete[]
  hasPendingChanges: boolean
  isSyncing: boolean
  lastSyncTime: number | null
  
  // Loading states
  isLoading: boolean
  isLoadingSessions: boolean
  error: string | null
  
  // Cache management
  sessionsCache: StudySession[]
  lastFetchTime: number
  sessionsHash: string
  
  // UI state
  isEditingSessionName: boolean
  editingSessionName: string
}

const initialState: TasksState = {
  tasks: [],
  studySessions: [],
  selectedSession: null,
  
  pendingCreates: [],
  pendingUpdates: [],
  pendingDeletes: [],
  hasPendingChanges: false,
  isSyncing: false,
  lastSyncTime: null,
  
  isLoading: false,
  isLoadingSessions: false,
  error: null,
  
  sessionsCache: [],
  lastFetchTime: 0,
  sessionsHash: '',
  
  isEditingSessionName: false,
  editingSessionName: '',
}

// Async thunks
export const fetchStudySessions = createAsyncThunk(
  'tasks/fetchStudySessions',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/notion/study-sessions', {
        credentials: 'include',
      })
      
      if (!response.ok) {
        return rejectWithValue('Failed to fetch study sessions')
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      return rejectWithValue('Network error')
    }
  }
)

export const fetchTasksFromSession = createAsyncThunk(
  'tasks/fetchTasksFromSession',
  async (sessionId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/notion/tasks/${sessionId}`, {
        credentials: 'include',
      })
      
      if (!response.ok) {
        return rejectWithValue('Failed to fetch tasks')
      }
      
      const data = await response.json()
      return { sessionId, tasks: data.tasks || [] }
    } catch (error) {
      return rejectWithValue('Network error')
    }
  }
)

export const syncTasksToServer = createAsyncThunk(
  'tasks/syncTasksToServer',
  async (
    { 
      sessionId,
      creates,
      updates,
      deletes
    }: {
      sessionId: string
      creates: TaskCreate[]
      updates: TaskUpdate[]
      deletes: TaskDelete[]
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch('/api/notion/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          session_id: sessionId,
          creates,
          updates,
          deletes,
        }),
      })
      
      if (!response.ok) {
        return rejectWithValue('Failed to sync tasks')
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      return rejectWithValue('Network error')
    }
  }
)

export const createStudySession = createAsyncThunk(
  'tasks/createStudySession',
  async (title: string, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/notion/study-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title }),
      })
      
      if (!response.ok) {
        return rejectWithValue('Failed to create study session')
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      return rejectWithValue('Network error')
    }
  }
)

export const updateStudySessionName = createAsyncThunk(
  'tasks/updateStudySessionName',
  async (
    { sessionId, newName }: { sessionId: string; newName: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch(`/api/notion/study-sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: newName }),
      })
      
      if (!response.ok) {
        return rejectWithValue('Failed to update session name')
      }
      
      const data = await response.json()
      return { sessionId, newName, data }
    } catch (error) {
      return rejectWithValue('Network error')
    }
  }
)

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    // Session management
    setSelectedSession: (state, action: PayloadAction<StudySession | null>) => {
      state.selectedSession = action.payload
      // Clear tasks when changing sessions
      state.tasks = []
      // Clear pending changes when switching sessions
      state.pendingCreates = []
      state.pendingUpdates = []
      state.pendingDeletes = []
      state.hasPendingChanges = false
    },
    
    // Task management with optimistic updates
    addTaskOptimistic: (state, action: PayloadAction<{ title: string; sessionId: string }>) => {
      const { title, sessionId } = action.payload
      const clientTempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      // Add to local tasks immediately
      const newTask: Task = {
        id: clientTempId,
        title,
        completed: false,
        created_time: new Date().toISOString(),
        last_edited_time: new Date().toISOString(),
        session_id: sessionId,
      }
      state.tasks.push(newTask)
      
      // Queue for server sync
      const taskCreate: TaskCreate = {
        clientTempId,
        title,
        completed: false,
        session_id: sessionId,
        attemptCount: 0,
      }
      state.pendingCreates.push(taskCreate)
      state.hasPendingChanges = true
    },
    
    updateTaskOptimistic: (state, action: PayloadAction<{ id: string; updates: Partial<Task> }>) => {
      const { id, updates } = action.payload
      
      // Update local task immediately
      const taskIndex = state.tasks.findIndex(t => t.id === id)
      if (taskIndex >= 0) {
        state.tasks[taskIndex] = {
          ...state.tasks[taskIndex],
          ...updates,
          last_edited_time: new Date().toISOString(),
        }
        
        // Don't queue temp IDs for updates
        if (!id.startsWith('temp-')) {
          // Queue for server sync
          const existingUpdate = state.pendingUpdates.find(u => u.id === id)
          if (existingUpdate) {
            Object.assign(existingUpdate, updates)
          } else {
            state.pendingUpdates.push({
              id,
              ...updates,
              attemptCount: 0,
            })
          }
          state.hasPendingChanges = true
        }
      }
    },
    
    deleteTaskOptimistic: (state, action: PayloadAction<string>) => {
      const taskId = action.payload
      
      // Remove from local tasks immediately
      state.tasks = state.tasks.filter(t => t.id !== taskId)
      
      // Don't queue temp IDs for deletion
      if (!taskId.startsWith('temp-')) {
        // Queue for server sync
        state.pendingDeletes.push({
          id: taskId,
          attemptCount: 0,
        })
        state.hasPendingChanges = true
      } else {
        // Remove from pending creates if it's a temp task
        state.pendingCreates = state.pendingCreates.filter(c => c.clientTempId !== taskId)
      }
      
      // Remove from pending updates
      state.pendingUpdates = state.pendingUpdates.filter(u => u.id !== taskId)
    },
    
    // Sync management
    markAsChanged: (state) => {
      state.hasPendingChanges = true
    },
    
    // Clear pending changes
    clearPendingCreates: (state) => {
      state.pendingCreates = []
    },
    clearPendingUpdates: (state) => {
      state.pendingUpdates = []
    },
    clearPendingDeletes: (state) => {
      state.pendingDeletes = []
    },
    
    // UI state
    setEditingSessionName: (state, action: PayloadAction<boolean>) => {
      state.isEditingSessionName = action.payload
    },
    setEditingSessionNameValue: (state, action: PayloadAction<string>) => {
      state.editingSessionName = action.payload
    },
    
    // Error handling
    clearError: (state) => {
      state.error = null
    },
    
    // Cache management
    updateSessionsCache: (state, action: PayloadAction<StudySession[]>) => {
      state.sessionsCache = action.payload
      state.lastFetchTime = Date.now()
      state.sessionsHash = JSON.stringify(action.payload.map(s => s.id + s.lastEditedTime))
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Study Sessions
      .addCase(fetchStudySessions.pending, (state) => {
        state.isLoadingSessions = true
        state.error = null
      })
      .addCase(fetchStudySessions.fulfilled, (state, action) => {
        state.isLoadingSessions = false
        state.studySessions = action.payload.studySessions || []
        state.sessionsCache = action.payload.studySessions || []
        state.lastFetchTime = Date.now()
        state.sessionsHash = JSON.stringify(
          (action.payload.studySessions || []).map((s: StudySession) => s.id + s.lastEditedTime)
        )
      })
      .addCase(fetchStudySessions.rejected, (state, action) => {
        state.isLoadingSessions = false
        state.error = action.payload as string
      })
      // Fetch Tasks from Session
      .addCase(fetchTasksFromSession.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchTasksFromSession.fulfilled, (state, action) => {
        state.isLoading = false
        state.tasks = action.payload.tasks
        // Clear pending changes after successful fetch
        state.pendingCreates = []
        state.pendingUpdates = []
        state.pendingDeletes = []
        state.hasPendingChanges = false
      })
      .addCase(fetchTasksFromSession.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Sync Tasks to Server
      .addCase(syncTasksToServer.pending, (state) => {
        state.isSyncing = true
        state.error = null
      })
      .addCase(syncTasksToServer.fulfilled, (state, action) => {
        state.isSyncing = false
        state.lastSyncTime = Date.now()
        
        const response = action.payload
        
        // Handle created tasks - update temp IDs with real IDs
        if (response.created) {
          response.created.forEach((created: { clientTempId: string; id: string }) => {
            const taskIndex = state.tasks.findIndex(t => t.id === created.clientTempId)
            if (taskIndex >= 0) {
              state.tasks[taskIndex].id = created.id
            }
          })
        }
        
        // Clear synced pending changes
        state.pendingCreates = []
        state.pendingUpdates = []
        state.pendingDeletes = []
        state.hasPendingChanges = false
      })
      .addCase(syncTasksToServer.rejected, (state, action) => {
        state.isSyncing = false
        state.error = action.payload as string
      })
      // Create Study Session
      .addCase(createStudySession.fulfilled, (state, action) => {
        const newSession = action.payload
        state.studySessions.push(newSession)
        state.sessionsCache.push(newSession)
      })
      // Update Study Session Name
      .addCase(updateStudySessionName.fulfilled, (state, action) => {
        const { sessionId, newName } = action.payload
        
        // Update in sessions array
        const sessionIndex = state.studySessions.findIndex(s => s.id === sessionId)
        if (sessionIndex >= 0) {
          state.studySessions[sessionIndex].title = newName
        }
        
        // Update in cache
        const cacheIndex = state.sessionsCache.findIndex(s => s.id === sessionId)
        if (cacheIndex >= 0) {
          state.sessionsCache[cacheIndex].title = newName
        }
        
        // Update selected session if it's the one being edited
        if (state.selectedSession?.id === sessionId) {
          state.selectedSession.title = newName
        }
        
        state.isEditingSessionName = false
        state.editingSessionName = ''
      })
  },
})

export const {
  setSelectedSession,
  addTaskOptimistic,
  updateTaskOptimistic,
  deleteTaskOptimistic,
  markAsChanged,
  clearPendingCreates,
  clearPendingUpdates,
  clearPendingDeletes,
  setEditingSessionName,
  setEditingSessionNameValue,
  clearError,
  updateSessionsCache,
} = tasksSlice.actions

export default tasksSlice.reducer