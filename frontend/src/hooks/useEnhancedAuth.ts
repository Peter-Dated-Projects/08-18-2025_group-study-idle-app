/**
 * Enhanced Redux-based authentication with intelligent caching
 * This approach uses Redux as the single source of truth and reduces API calls
 */

import { useEffect, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { validateAuth } from "@/store/slices/authSlice";

/**
 * Redux-based auth hook with smart caching and reduced API calls
 * This provides the same interface as useSessionAuth but uses shared Redux state
 */
export function useReduxAuth() {
  const dispatch = useAppDispatch();
  const auth = useAppSelector((state) => state.auth);

  // Smart validation logic
  useEffect(() => {
    const now = Date.now();
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    const shouldValidate = 
      !auth.lastValidated || 
      now - auth.lastValidated > CACHE_DURATION ||
      (!auth.isAuthenticated && !auth.isLoading && !auth.error);

    // Only validate if we need to and aren't already loading
    if (shouldValidate && !auth.isLoading) {
      dispatch(validateAuth()).catch((error) => {
        console.error("Auth validation failed:", error);
      });
    }
  }, [dispatch, auth.lastValidated, auth.isLoading, auth.isAuthenticated, auth.error]);

  // Periodic revalidation only if authenticated and tab is active
  useEffect(() => {
    if (auth.isAuthenticated) {
      const REVALIDATION_INTERVAL = 10 * 60 * 1000; // 10 minutes

      const interval = setInterval(() => {
        // Only revalidate if document is visible
        if (!document.hidden) {
          dispatch(validateAuth()).catch((error) => {
            console.error("Periodic auth validation failed:", error);
          });
        }
      }, REVALIDATION_INTERVAL);

      return () => clearInterval(interval);
    }
  }, [dispatch, auth.isAuthenticated]);

  // Revalidate when tab becomes visible (if data is stale)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && auth.isAuthenticated && auth.lastValidated) {
        const now = Date.now();
        const STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes
        const isStale = now - auth.lastValidated > STALE_THRESHOLD;

        if (isStale && !auth.isLoading) {
          dispatch(validateAuth()).catch((error) => {
            console.error("Visibility change auth validation failed:", error);
          });
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [dispatch, auth.isAuthenticated, auth.lastValidated, auth.isLoading]);

  // Memoized refresh function
  const refresh = useCallback(async () => {
    try {
      await dispatch(validateAuth()).unwrap();
    } catch (error) {
      console.error("Manual refresh failed:", error);
    }
  }, [dispatch]);

  // Return the same interface as useSessionAuth
  return {
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    error: auth.error,
    refresh,
  };
}

/**
 * Migration helper: Drop-in replacement for useSessionAuth
 * Use this to gradually migrate components to Redux auth
 */
export function useEnhancedSessionAuth() {
  return useReduxAuth();
}
