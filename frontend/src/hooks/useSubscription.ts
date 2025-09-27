/**
 * Hook for checking user subscription status with caching
 * Integrates with the backend subscription service
 */
import { useState, useEffect, useCallback } from 'react';
import { useSessionAuth } from './useSessionAuth';

interface SubscriptionStatus {
  success: boolean;
  user_id: string;
  is_paid: boolean;
  provider?: string;
  last_updated?: string;
  source: 'cache' | 'database' | 'default';
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

/**
 * Hook to check user subscription status
 * 
 * Features:
 * - Automatic fetching when user is authenticated
 * - Caching via backend Redis cache
 * - Error handling with fallback to free tier
 * - Manual refetch capability
 * - Loading states
 * 
 * @returns {UseSubscriptionReturn} Subscription status and controls
 */
export function useSubscription(): UseSubscriptionReturn {
  const { isAuthenticated, user, isLoading: authLoading } = useSessionAuth();
  
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptionStatus = useCallback(async () => {
    // Don't fetch if not authenticated or still loading auth
    if (!isAuthenticated || authLoading || !user?.userId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use the authenticated endpoint to get subscription status
      const response = await fetch('/api/subscription/status', {
        method: 'GET',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required');
        } else if (response.status === 503) {
          throw new Error('Subscription service temporarily unavailable');
        } else {
          throw new Error(`Failed to fetch subscription status: ${response.status}`);
        }
      }

      const data: SubscriptionStatus = await response.json();
      
      setSubscriptionData(data);
      
      // Log subscription check for debugging
      console.log('🔒 Subscription Status:', {
        userId: data.user_id,
        isPaid: data.is_paid,
        source: data.source,
        provider: data.provider
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      
      // Set safe defaults on error - assume free tier
      setSubscriptionData({
        success: false,
        user_id: user.userId,
        is_paid: false,
        source: 'default',
        error: errorMessage
      });
      
      console.error('❌ Subscription check failed:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, authLoading, user?.userId]);

  // Auto-fetch subscription status when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user?.userId && !authLoading) {
      fetchSubscriptionStatus();
    } else if (!isAuthenticated) {
      // Clear subscription data when not authenticated
      setSubscriptionData(null);
      setError(null);
    }
  }, [isAuthenticated, user?.userId, authLoading, fetchSubscriptionStatus]);

  // Manual refetch function
  const refetch = useCallback(async () => {
    await fetchSubscriptionStatus();
  }, [fetchSubscriptionStatus]);

  return {
    isPaid: subscriptionData?.is_paid ?? false, // Default to false (free tier)
    isLoading,
    error,
    refetch,
    subscriptionData,
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
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 503) {
          throw new Error('Subscription service temporarily unavailable');
        } else {
          throw new Error(`Failed to fetch subscription status: ${response.status}`);
        }
      }

      const data: SubscriptionStatus = await response.json();
      setSubscriptionData(data);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      
      // Set safe defaults on error
      setSubscriptionData({
        success: false,
        user_id: userId,
        is_paid: false,
        source: 'default',
        error: errorMessage
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
 * 
 * @returns Function to invalidate cache
 */
export function useInvalidateSubscriptionCache() {
  const { user } = useSessionAuth();

  const invalidateCache = useCallback(async (): Promise<boolean> => {
    if (!user?.userId) {
      console.warn('Cannot invalidate subscription cache: user not authenticated');
      return false;
    }

    try {
      const response = await fetch('/api/subscription/cache', {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to invalidate cache: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Subscription cache invalidated:', data.message);
      return data.success;

    } catch (err) {
      console.error('❌ Failed to invalidate subscription cache:', err);
      return false;
    }
  }, [user?.userId]);

  return invalidateCache;
}
