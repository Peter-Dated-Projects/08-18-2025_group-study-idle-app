/**
 * Redux-based subscription hook
 * Provides subscription status with Redux caching
 */
import { useEffect, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../hooks";
import { useSessionAuth } from "@/hooks/useSessionAuth";
import {
  fetchSubscriptionStatus,
  invalidateSubscriptionCache as invalidateCache,
  clearSubscription,
} from "../slices/subscriptionSlice";

interface UseReduxSubscriptionReturn {
  isPaid: boolean;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  invalidateCache: () => Promise<void>;
  subscriptionData: any | null;
}

/**
 * Hook to access subscription status from Redux store
 * Features:
 * - Fetches on first use (once per session)
 * - Caches in Redux store
 * - Persists across component re-mounts
 * - Cleared on page reload or logout
 */
export function useReduxSubscription(): UseReduxSubscriptionReturn {
  const dispatch = useAppDispatch();
  const { isAuthenticated, user, isLoading: authLoading } = useSessionAuth();

  // Get subscription data from Redux store
  const { data, isLoading, error, lastFetched } = useAppSelector((state) => state.subscription);

  // Fetch subscription status if needed
  useEffect(() => {
    if (isAuthenticated && user?.userId && !authLoading) {
      // Only fetch if we don't have cached data
      if (!data && !isLoading && !lastFetched) {
        console.log("🔒 Fetching subscription status (no cache in Redux)");
        dispatch(fetchSubscriptionStatus());
      } else if (data) {
        console.log("🔒 Using cached subscription from Redux store");
      }
    } else if (!isAuthenticated) {
      // Clear subscription data on logout
      dispatch(clearSubscription());
    }
  }, [isAuthenticated, user?.userId, authLoading, data, isLoading, lastFetched, dispatch]);

  // Manual refetch function - clears cache and fetches fresh data
  const refetch = useCallback(async () => {
    console.log("🔄 Manually refetching subscription status");
    dispatch(clearSubscription());
    await dispatch(fetchSubscriptionStatus());
  }, [dispatch]);

  // Invalidate both frontend and backend cache
  const invalidateCacheFn = useCallback(async () => {
    console.log("🗑️ Invalidating subscription cache (Redux + Backend)");
    await dispatch(invalidateCache());
    // Fetch fresh data after invalidation
    await dispatch(fetchSubscriptionStatus());
  }, [dispatch]);

  return {
    isPaid: data?.is_paid ?? false,
    isLoading,
    error,
    refetch,
    invalidateCache: invalidateCacheFn,
    subscriptionData: data,
  };
}

/**
 * Read-only hook to access subscription status from Redux store
 * Does NOT trigger any fetches - only reads existing cached data
 * Use this when you want to display subscription status without causing updates
 *
 * Perfect for modals or components that should show cached data only
 */
export function useReduxSubscriptionReadOnly(): UseReduxSubscriptionReturn {
  const dispatch = useAppDispatch();

  // Get subscription data from Redux store (read-only)
  const { data, isLoading, error } = useAppSelector((state) => state.subscription);

  // Manual refetch function - clears cache and fetches fresh data
  const refetch = useCallback(async () => {
    console.log("🔄 Manually refetching subscription status");
    dispatch(clearSubscription());
    await dispatch(fetchSubscriptionStatus());
  }, [dispatch]);

  // Invalidate both frontend and backend cache
  const invalidateCacheFn = useCallback(async () => {
    console.log("🗑️ Invalidating subscription cache (Redux + Backend)");
    await dispatch(invalidateCache());
    // Fetch fresh data after invalidation
    await dispatch(fetchSubscriptionStatus());
  }, [dispatch]);

  return {
    isPaid: data?.is_paid ?? false,
    isLoading,
    error,
    refetch,
    invalidateCache: invalidateCacheFn,
    subscriptionData: data,
  };
}
