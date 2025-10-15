import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

interface SubscriptionStatus {
  success: boolean;
  user_id: string;
  is_paid: boolean;
  provider?: string;
  last_updated?: string;
  source: "cache" | "database" | "default";
  cached_at?: string;
  error?: string;
}

interface SubscriptionState {
  data: SubscriptionStatus | null;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null; // Timestamp of last fetch
}

const initialState: SubscriptionState = {
  data: null,
  isLoading: false,
  error: null,
  lastFetched: null,
};

/**
 * Async thunk to fetch subscription status from the backend
 */
export const fetchSubscriptionStatus = createAsyncThunk(
  "subscription/fetchStatus",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/subscription/status", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Authentication required");
        } else if (response.status === 503) {
          throw new Error("Subscription service temporarily unavailable");
        } else {
          throw new Error(`Failed to fetch subscription status: ${response.status}`);
        }
      }

      const data: SubscriptionStatus = await response.json();

      console.log("🔒 Subscription Status (fetched and cached in Redux):", {
        userId: data.user_id,
        isPaid: data.is_paid,
        source: data.source,
        provider: data.provider,
      });

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error("❌ Subscription check failed:", errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Async thunk to invalidate subscription cache
 */
export const invalidateSubscriptionCache = createAsyncThunk(
  "subscription/invalidateCache",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/subscription/cache", {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to invalidate cache: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ Subscription cache invalidated (backend):", data.message);
      return data.success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error("❌ Failed to invalidate subscription cache:", errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

const subscriptionSlice = createSlice({
  name: "subscription",
  initialState,
  reducers: {
    /**
     * Clear subscription data (e.g., on logout)
     */
    clearSubscription: (state) => {
      state.data = null;
      state.error = null;
      state.lastFetched = null;
      console.log("🗑️ Subscription data cleared from Redux");
    },

    /**
     * Set subscription data manually (for testing or direct updates)
     */
    setSubscription: (state, action: PayloadAction<SubscriptionStatus>) => {
      state.data = action.payload;
      state.lastFetched = Date.now();
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch subscription status
    builder.addCase(fetchSubscriptionStatus.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchSubscriptionStatus.fulfilled, (state, action) => {
      state.isLoading = false;
      state.data = action.payload;
      state.lastFetched = Date.now();
      state.error = null;
    });
    builder.addCase(fetchSubscriptionStatus.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
      // Set default data on error (free tier)
      state.data = {
        success: false,
        user_id: "",
        is_paid: false,
        source: "default",
        error: action.payload as string,
      };
    });

    // Invalidate cache
    builder.addCase(invalidateSubscriptionCache.fulfilled, (state) => {
      // Clear cached data after invalidation
      state.data = null;
      state.lastFetched = null;
      console.log("✅ Subscription cache cleared from Redux after invalidation");
    });
  },
});

export const { clearSubscription, setSubscription } = subscriptionSlice.actions;
export default subscriptionSlice.reducer;
