import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'

export interface User {
  id: string
  userId: string
  email: string
  given_name?: string
  family_name?: string
  user_picture_url?: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  lastValidated: number | null
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  lastValidated: null,
}

// Async thunks
export const validateAuth = createAsyncThunk(
  'auth/validateAuth',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/auth/validate', {
        method: 'GET',
        credentials: 'include',
      })
      
      if (!response.ok) {
        return rejectWithValue('Authentication failed')
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      return rejectWithValue('Network error')
    }
  }
)

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
      await fetch('/api/notion/logout', { method: 'POST', credentials: 'include' })
      return null
    } catch (error) {
      return rejectWithValue('Logout failed')
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Validate Auth
      .addCase(validateAuth.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(validateAuth.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload
        state.isAuthenticated = true
        state.lastValidated = Date.now()
        state.error = null
      })
      .addCase(validateAuth.rejected, (state, action) => {
        state.isLoading = false
        state.user = null
        state.isAuthenticated = false
        state.error = action.payload as string
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null
        state.isAuthenticated = false
        state.lastValidated = null
        state.error = null
      })
  },
})

export const { clearError, updateUser } = authSlice.actions
export default authSlice.reducer