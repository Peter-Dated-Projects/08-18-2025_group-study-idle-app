/**
 * Profile Pictures Redux Slice
 *
 * Layer 0: In-memory Redux cache for instant access
 *
 * Stores profile picture URLs with metadata to enable:
 * - Instant rendering without API calls
 * - Prefetching for friend lists
 * - Cache invalidation tracking
 */

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { imageCacheManager, CachedImage } from "@/services/imageCacheManager";
import { cacheMonitor } from "@/services/cachePerformanceMonitor";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export interface ProfilePictureState {
  url: string;
  image_id: string;
  timestamp: number;
  loading: boolean;
  error: string | null;
}

interface ProfilePicturesState {
  pictures: Record<string, ProfilePictureState>;
  loading: Record<string, boolean>;
  prefetching: boolean;
}

const initialState: ProfilePicturesState = {
  pictures: {},
  loading: {},
  prefetching: false,
};

/**
 * Fetch profile picture with multi-layer cache check
 * @param forceRefresh - If true, bypasses cache and fetches fresh from backend
 */
export const fetchProfilePicture = createAsyncThunk(
  "profilePictures/fetch",
  async (
    { userId, forceRefresh = false }: { userId: string; forceRefresh?: boolean },
    { rejectWithValue }
  ) => {
    console.log(
      `[fetchProfilePicture] 🚀 CALLED for user: ${userId}, forceRefresh: ${forceRefresh}`
    );
    const startTime = performance.now();

    try {
      // Skip cache check if force refresh is requested
      if (!forceRefresh) {
        // First, check cache manager (LocalStorage + IndexedDB)
        const cached = await imageCacheManager.get(userId);
        if (cached) {
          console.debug(`[ProfilePictures] Cache hit for user ${userId}`);
          return {
            userId,
            data: cached,
            fromCache: true,
          };
        }
      } else {
        console.debug(
          `[ProfilePictures] Force refresh requested for user ${userId}, skipping cache`
        );
      }

      // Cache miss or force refresh - fetch from backend
      console.debug(`[ProfilePictures] Fetching from backend for user ${userId}`);
      const response = await fetch(`${BACKEND_URL}/images/user/${userId}/info`, {
        method: "GET",
        credentials: "include", // Use session-based auth
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache", // Ensure fresh data from backend
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();

      const data: CachedImage = {
        url: responseData.url,
        image_id: responseData.image_id,
        user_id: userId,
        timestamp: Date.now(),
      };

      // Cache the result in all layers
      await imageCacheManager.set(userId, data);

      // Record network fetch
      const loadTime = performance.now() - startTime;
      cacheMonitor.recordHit(userId, "network", loadTime);

      return {
        userId,
        data,
        fromCache: false,
      };
    } catch (error: any) {
      console.error(`[ProfilePictures] Error fetching picture for user ${userId}:`, error);
      return rejectWithValue({
        userId,
        error: error.message || "Failed to fetch profile picture",
      });
    }
  }
);

/**
 * Prefetch profile pictures for multiple users (friend list, etc.)
 */
export const prefetchProfilePictures = createAsyncThunk(
  "profilePictures/prefetch",
  async ({ userIds }: { userIds: string[] }, { dispatch }) => {
    console.debug(`[ProfilePictures] Prefetching ${userIds.length} profile pictures`);

    const promises = userIds.map((userId) => dispatch(fetchProfilePicture({ userId })));

    await Promise.allSettled(promises);

    return { count: userIds.length };
  }
);

/**
 * Invalidate cache for a specific user (after profile picture upload)
 */
export const invalidateProfilePicture = createAsyncThunk(
  "profilePictures/invalidate",
  async ({ userId, imageId }: { userId: string; imageId?: string }) => {
    await imageCacheManager.invalidate(userId, imageId);
    return { userId };
  }
);

/**
 * Clear all profile picture caches
 */
export const clearAllProfilePictures = createAsyncThunk("profilePictures/clearAll", async () => {
  await imageCacheManager.clearAll();
  return {};
});

const profilePicturesSlice = createSlice({
  name: "profilePictures",
  initialState,
  reducers: {
    /**
     * Manually set a profile picture (e.g., after upload)
     */
    setProfilePicture: (
      state,
      action: PayloadAction<{ userId: string; url: string; image_id: string }>
    ) => {
      const { userId, url, image_id } = action.payload;
      state.pictures[userId] = {
        url,
        image_id,
        timestamp: Date.now(),
        loading: false,
        error: null,
      };

      // Also cache in persistent storage
      imageCacheManager
        .set(userId, {
          url,
          image_id,
          user_id: userId,
          timestamp: Date.now(),
        })
        .catch(console.error);
    },

    /**
     * Remove a profile picture from Redux store
     */
    removeProfilePicture: (state, action: PayloadAction<string>) => {
      delete state.pictures[action.payload];
      delete state.loading[action.payload];
    },
  },
  extraReducers: (builder) => {
    // Fetch Profile Picture
    builder
      .addCase(fetchProfilePicture.pending, (state, action) => {
        const userId = action.meta.arg.userId;
        state.loading[userId] = true;

        // Initialize if doesn't exist
        if (!state.pictures[userId]) {
          state.pictures[userId] = {
            url: "",
            image_id: "",
            timestamp: 0,
            loading: true,
            error: null,
          };
        } else {
          state.pictures[userId].loading = true;
          state.pictures[userId].error = null;
        }
      })
      .addCase(fetchProfilePicture.fulfilled, (state, action) => {
        const { userId, data, fromCache } = action.payload;
        state.loading[userId] = false;
        state.pictures[userId] = {
          url: data.url,
          image_id: data.image_id,
          timestamp: data.timestamp,
          loading: false,
          error: null,
        };

        // Record Redux cache hit (for subsequent accesses)
        if (fromCache) {
          console.debug(`[ProfilePictures] Loaded from cache for user ${userId}`);
        } else {
          // This is initial load - next access will be Redux cache hit
          console.debug(`[ProfilePictures] Cached in Redux for user ${userId}`);
        }
      })
      .addCase(fetchProfilePicture.rejected, (state, action) => {
        const payload = action.payload as { userId: string; error: string };
        const userId = payload?.userId || action.meta.arg.userId;

        state.loading[userId] = false;
        if (state.pictures[userId]) {
          state.pictures[userId].loading = false;
          state.pictures[userId].error = payload?.error || "Failed to load profile picture";
        }
      });

    // Prefetch Profile Pictures
    builder
      .addCase(prefetchProfilePictures.pending, (state) => {
        state.prefetching = true;
      })
      .addCase(prefetchProfilePictures.fulfilled, (state, action) => {
        state.prefetching = false;
        console.debug(`[ProfilePictures] Prefetched ${action.payload.count} pictures`);
      })
      .addCase(prefetchProfilePictures.rejected, (state) => {
        state.prefetching = false;
      });

    // Invalidate Profile Picture
    builder.addCase(invalidateProfilePicture.fulfilled, (state, action) => {
      const { userId } = action.payload;
      delete state.pictures[userId];
      delete state.loading[userId];
      console.debug(`[ProfilePictures] Invalidated cache for user ${userId}`);
    });

    // Clear All
    builder.addCase(clearAllProfilePictures.fulfilled, (state) => {
      state.pictures = {};
      state.loading = {};
      console.debug("[ProfilePictures] Cleared all cached pictures");
    });
  },
});

// Actions
export const { setProfilePicture, removeProfilePicture } = profilePicturesSlice.actions;

// Selectors
export const selectProfilePicture = (
  state: { profilePictures: ProfilePicturesState },
  userId: string
) => state.profilePictures.pictures[userId];

export const selectIsLoading = (state: { profilePictures: ProfilePicturesState }, userId: string) =>
  state.profilePictures.loading[userId] || false;

export const selectIsPrefetching = (state: { profilePictures: ProfilePicturesState }) =>
  state.profilePictures.prefetching;

export const selectAllProfilePictures = (state: { profilePictures: ProfilePicturesState }) =>
  state.profilePictures.pictures;

// Reducer
export default profilePicturesSlice.reducer;
