import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

// Match your existing UserSession interface
export interface UserSession {
  userId: string;
  userEmail: string;
  userName: string | null;
  sessionId: string;
  hasNotionTokens: boolean;
  userPictureUrl?: string | null; // Add profile picture URL
}

export interface AuthState {
  user: UserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  lastValidated: number | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  lastValidated: null,
};

// Async thunks
export const validateAuth = createAsyncThunk(
  "auth/validateAuth",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/auth/session", {
        method: "GET",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return rejectWithValue(data.error || "Authentication failed");
      }

      return {
        userId: data.userId,
        userEmail: data.userEmail,
        userName: data.userName,
        sessionId: data.sessionId,
        hasNotionTokens: data.hasNotionTokens,
      };
    } catch (error) {
      return rejectWithValue("Network error");
    }
  }
);

export const logout = createAsyncThunk("auth/logout", async (_, { rejectWithValue }) => {
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    await fetch("/api/notion/logout", { method: "POST", credentials: "include" });
    return null;
  } catch (error) {
    return rejectWithValue("Logout failed");
  }
});

// Async thunk to fetch user profile picture URL
export const fetchUserProfilePicture = createAsyncThunk(
  "auth/fetchUserProfilePicture",
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/users/info`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_ids: [userId] }),
      });

      if (!response.ok) {
        return rejectWithValue("Failed to fetch user profile");
      }

      const data = await response.json();

      if (data.success && data.users && data.users[userId]) {
        return data.users[userId].user_picture_url || null;
      }

      return null;
    } catch (error) {
      return rejectWithValue("Network error while fetching profile picture");
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateUser: (state, action: PayloadAction<Partial<UserSession>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    updateProfilePicture: (state, action: PayloadAction<string | null>) => {
      if (state.user) {
        state.user.userPictureUrl = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Validate Auth
      .addCase(validateAuth.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(validateAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.lastValidated = Date.now();
        state.error = null;
      })
      .addCase(validateAuth.rejected, (state, action) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = action.payload as string;
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.lastValidated = null;
        state.error = null;
      })
      // Fetch profile picture
      .addCase(fetchUserProfilePicture.fulfilled, (state, action) => {
        if (state.user) {
          state.user.userPictureUrl = action.payload;
        }
      });
  },
});

export const { clearError, updateUser, updateProfilePicture } = authSlice.actions;
export default authSlice.reducer;
