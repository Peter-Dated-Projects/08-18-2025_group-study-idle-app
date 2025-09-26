import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name?: string | null;
  daily_pomo_duration: number;
  weekly_pomo_duration: number;
  monthly_pomo_duration: number;
  yearly_pomo_duration: number;
  updated_at: string;
}

export interface GroupLeaderboardEntry {
  rank: number;
  user_id: string;
  display_name?: string | null;
  score: number;
  stats: {
    daily_pomo_duration: number;
    weekly_pomo_duration: number;
    monthly_pomo_duration: number;
    yearly_pomo_duration: number;
  };
}

export type LeaderboardPeriod = "daily" | "weekly" | "monthly" | "yearly";

export interface LeaderboardState {
  globalLeaderboard: LeaderboardEntry[];
  groupLeaderboards: Record<string, GroupLeaderboardEntry[]>;
  selectedPeriod: LeaderboardPeriod;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

const initialState: LeaderboardState = {
  globalLeaderboard: [],
  groupLeaderboards: {},
  selectedPeriod: "yearly",
  isLoading: false,
  error: null,
  lastUpdated: null,
};

// Async thunks
export const fetchGlobalLeaderboard = createAsyncThunk(
  "leaderboard/fetchGlobalLeaderboard",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/leaderboard/global", {
        credentials: "include",
      });

      if (!response.ok) {
        return rejectWithValue("Failed to fetch leaderboard");
      }

      const data = await response.json();
      return data.entries;
    } catch (error) {
      return rejectWithValue("Network error");
    }
  }
);

export const fetchGroupLeaderboard = createAsyncThunk(
  "leaderboard/fetchGroupLeaderboard",
  async (
    { groupId, period }: { groupId: string; period: LeaderboardPeriod },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch(`/api/leaderboard/group/${groupId}?period=${period}`, {
        credentials: "include",
      });

      if (!response.ok) {
        return rejectWithValue("Failed to fetch group leaderboard");
      }

      const data = await response.json();
      return { groupId, entries: data.entries };
    } catch (error) {
      return rejectWithValue("Network error");
    }
  }
);

const leaderboardSlice = createSlice({
  name: "leaderboard",
  initialState,
  reducers: {
    setSelectedPeriod: (state, action: PayloadAction<LeaderboardPeriod>) => {
      state.selectedPeriod = action.payload;
    },
    updateUserLeaderboardEntry: (state, action: PayloadAction<Partial<LeaderboardEntry>>) => {
      const entry = state.globalLeaderboard.find((e) => e.user_id === action.payload.user_id);
      if (entry) {
        Object.assign(entry, action.payload);
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGlobalLeaderboard.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchGlobalLeaderboard.fulfilled, (state, action) => {
        state.isLoading = false;
        state.globalLeaderboard = action.payload;
        state.lastUpdated = Date.now();
      })
      .addCase(fetchGlobalLeaderboard.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchGroupLeaderboard.fulfilled, (state, action) => {
        const { groupId, entries } = action.payload;
        state.groupLeaderboards[groupId] = entries;
        state.lastUpdated = Date.now();
      });
  },
});

export const { setSelectedPeriod, updateUserLeaderboardEntry, clearError } =
  leaderboardSlice.actions;
export default leaderboardSlice.reducer;
