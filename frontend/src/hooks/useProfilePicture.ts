/**
 * Custom Hook: useProfilePicture
 *
 * Simplified hook for accessing cached profile pictures.
 * Automatically handles fetching, caching, and state management.
 *
 * Usage:
 *   const { url, loading, error, refetch } = useProfilePicture(userId);
 */

import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchProfilePicture,
  selectProfilePicture,
  selectIsLoading,
} from "@/store/slices/profilePicturesSlice";
import { cacheMonitor } from "@/services/cachePerformanceMonitor";

export interface UseProfilePictureResult {
  url: string | null;
  imageId: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  timestamp: number;
}

/**
 * Hook to fetch and cache profile pictures
 * @param userId - User ID to fetch profile picture for
 * @param autoFetch - Whether to automatically fetch if not cached (default: true)
 * @returns Profile picture state and refetch function
 */
export function useProfilePicture(
  userId: string | undefined | null,
  autoFetch = true
): UseProfilePictureResult {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  const cachedPicture = useAppSelector((state) =>
    userId ? selectProfilePicture(state, userId) : null
  );
  const loading = useAppSelector((state) => (userId ? selectIsLoading(state, userId) : false));

  // Track if this is a Redux cache hit
  const hasRecordedReduxHit = useRef(false);

  useEffect(() => {
    // Record Redux cache hit (only once per mount)
    if (cachedPicture && !loading && userId && !hasRecordedReduxHit.current) {
      cacheMonitor.recordHit(userId, "redux", 0); // Redux access is instant
      hasRecordedReduxHit.current = true;
    }

    // Only fetch if:
    // 1. userId is provided
    // 2. User is authenticated
    // 3. Not already cached
    // 4. Not currently loading
    // 5. autoFetch is enabled
    if (userId && isAuthenticated && !cachedPicture && !loading && autoFetch) {
      console.debug(`[useProfilePicture] Auto-fetching for user ${userId}`);
      dispatch(fetchProfilePicture({ userId }));
    }
  }, [userId, isAuthenticated, cachedPicture, loading, autoFetch, dispatch]);

  const refetch = () => {
    if (userId && isAuthenticated) {
      console.debug(`[useProfilePicture] Manual refetch for user ${userId}`);
      dispatch(fetchProfilePicture({ userId }));
    }
  };

  return {
    url: cachedPicture?.url || null,
    imageId: cachedPicture?.image_id || null,
    loading,
    error: cachedPicture?.error || null,
    refetch,
    timestamp: cachedPicture?.timestamp || 0,
  };
}

/**
 * Hook to prefetch multiple profile pictures (e.g., for friend lists)
 * @param userIds - Array of user IDs to prefetch
 */
export function usePrefetchProfilePictures(userIds: string[]) {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated && userIds.length > 0) {
      console.debug(`[usePrefetchProfilePictures] Prefetching ${userIds.length} pictures`);
      // This will check cache and only fetch missing ones
      userIds.forEach((userId) => {
        dispatch(fetchProfilePicture({ userId }));
      });
    }
  }, [userIds, isAuthenticated, dispatch]);
}
