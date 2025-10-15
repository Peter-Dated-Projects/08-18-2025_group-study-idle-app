/**
 * Hook for checking user subscription status with caching
 * Integrates with the backend subscription service
 *
 * NOTE: This hook now uses Redux for caching internally.
 * For direct Redux access, use useReduxSubscription from @/store/hooks/useReduxSubscription
 */
import { useState, useEffect, useCallback } from "react";
import { useSessionAuth } from "./useSessionAuth";
import { useReduxSubscription } from "@/store/hooks/useReduxSubscription";

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

interface UseSubscriptionReturn {
  isPaid: boolean;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  subscriptionData: SubscriptionStatus | null;
}

// Module-level cache that persists across component re-mounts
// This cache is cleared on page reload
// NOTE: Now using Redux for actual caching, these are kept for backward compatibility
let subscriptionCache: SubscriptionStatus | null = null;
let subscriptionCacheUserId: string | null = null;
let isFetchingSubscription = false;

/**
 * Hook to check user subscription status
 *
 * Features:
 * - Automatic fetching when user is authenticated (only once per session)
 * - Redux store caching that persists across component re-mounts
 * - Cache is cleared on page reload
 * - Error handling with fallback to free tier
 * - Manual refetch capability
 * - Loading states
 *
 * @returns {UseSubscriptionReturn} Subscription status and controls
 */
export function useSubscription(): UseSubscriptionReturn {
  // Delegate to Redux-based hook for actual implementation
  const reduxSubscription = useReduxSubscription();

  return {
    isPaid: reduxSubscription.isPaid,
    isLoading: reduxSubscription.isLoading,
    error: reduxSubscription.error,
    refetch: reduxSubscription.refetch,
    subscriptionData: reduxSubscription.subscriptionData,
  };
}

/**
 * Hook to check subscription status for a specific user ID
 * Useful for checking other users' subscription status
 *
 * @param userId - The user ID to check subscription for
 * @returns {UseSubscriptionReturn} Subscription status and controls
 */
export function useUserSubscription(userId: string | null): UseSubscriptionReturn {
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserSubscriptionStatus = useCallback(async () => {
    if (!userId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/subscription/status/${encodeURIComponent(userId)}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 503) {
          throw new Error("Subscription service temporarily unavailable");
        } else {
          throw new Error(`Failed to fetch subscription status: ${response.status}`);
        }
      }

      const data: SubscriptionStatus = await response.json();
      setSubscriptionData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);

      // Set safe defaults on error
      setSubscriptionData({
        success: false,
        user_id: userId,
        is_paid: false,
        source: "default",
        error: errorMessage,
      });

      console.error(`❌ Subscription check failed for user ${userId}:`, errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchUserSubscriptionStatus();
    } else {
      setSubscriptionData(null);
      setError(null);
    }
  }, [userId, fetchUserSubscriptionStatus]);

  const refetch = useCallback(async () => {
    await fetchUserSubscriptionStatus();
  }, [fetchUserSubscriptionStatus]);

  return {
    isPaid: subscriptionData?.is_paid ?? false,
    isLoading,
    error,
    refetch,
    subscriptionData,
  };
}

/**
 * Hook to invalidate subscription cache
 * Useful when subscription status changes (e.g., after payment)
 * Clears both backend cache and Redux store cache
 *
 * @returns Function to invalidate cache
 */
export function useInvalidateSubscriptionCache() {
  const reduxSubscription = useReduxSubscription();

  const invalidateCache = useCallback(async (): Promise<boolean> => {
    try {
      await reduxSubscription.invalidateCache();
      return true;
    } catch (err) {
      console.error("❌ Failed to invalidate subscription cache:", err);
      return false;
    }
  }, [reduxSubscription]);

  return invalidateCache;
}

/**
 * Utility function to manually clear the subscription cache
 * Useful for testing or when you need to force a fresh fetch
 * NOTE: This now only clears the legacy module-level cache.
 * Use the Redux-based invalidateCache for full cache clearing.
 */
export function clearSubscriptionCache(): void {
  subscriptionCache = null;
  subscriptionCacheUserId = null;
  console.log("🗑️ Legacy subscription cache cleared (use Redux invalidateCache for full clearing)");
}
