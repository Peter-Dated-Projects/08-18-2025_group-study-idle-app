/**
 * React hooks for cached data access
 * Provides immediate cached data display with background refresh
 */

import { useState, useEffect, useCallback } from "react";
import { cacheManager, Group, Friend, LeaderboardEntry, UserProfile } from "@/utils/cacheManager";

/**
 * Hook for user groups with caching
 */
export function useCachedUserGroups(userId: string | null) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = useCallback(
    async (forceRefresh = false) => {
      if (!userId) {
        setGroups([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await cacheManager.getUserGroups(userId, forceRefresh);
        setGroups(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load groups";
        setError(errorMessage);
        console.error("Error loading groups:", err);
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  const refresh = useCallback(() => fetchGroups(true), [fetchGroups]);

  useEffect(() => {
    if (userId) {
      fetchGroups();

      // Subscribe to cache updates
      const cacheKey = `${userId}:userGroups`;
      const unsubscribe = cacheManager.subscribe<Group[]>(cacheKey, (updatedGroups) => {
        setGroups(updatedGroups);
      });

      return unsubscribe;
    }
  }, [userId, fetchGroups]);

  return {
    groups,
    loading,
    error,
    refresh,
  };
}

/**
 * Hook for user friends with caching
 */
export function useCachedUserFriends(userId: string | null) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFriends = useCallback(
    async (forceRefresh = false) => {
      if (!userId) {
        setFriends([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await cacheManager.getUserFriends(userId, forceRefresh);
        setFriends(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load friends";
        setError(errorMessage);
        console.error("Error loading friends:", err);
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  const refresh = useCallback(() => fetchFriends(true), [fetchFriends]);

  useEffect(() => {
    if (userId) {
      fetchFriends();

      // Subscribe to cache updates
      const cacheKey = `${userId}:userFriends`;
      const unsubscribe = cacheManager.subscribe<Friend[]>(cacheKey, (updatedFriends) => {
        setFriends(updatedFriends);
      });

      return unsubscribe;
    }
  }, [userId, fetchFriends]);

  return {
    friends,
    loading,
    error,
    refresh,
  };
}

/**
 * Hook for global leaderboard with caching
 */
export function useCachedGlobalLeaderboard(period: string = "daily") {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(
    async (forceRefresh = false) => {
      setLoading(true);
      setError(null);

      try {
        const data = await cacheManager.getGlobalLeaderboard(period, forceRefresh);
        setLeaderboard(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load leaderboard";
        setError(errorMessage);
        console.error("Error loading leaderboard:", err);
      } finally {
        setLoading(false);
      }
    },
    [period]
  );

  const refresh = useCallback(() => fetchLeaderboard(true), [fetchLeaderboard]);

  useEffect(() => {
    fetchLeaderboard();

    // Subscribe to cache updates
    const cacheKey = `globalLeaderboard:${period}`;
    const unsubscribe = cacheManager.subscribe<LeaderboardEntry[]>(
      cacheKey,
      (updatedLeaderboard) => {
        setLeaderboard(updatedLeaderboard);
      }
    );

    return unsubscribe;
  }, [period, fetchLeaderboard]);

  return {
    leaderboard,
    loading,
    error,
    refresh,
  };
}

/**
 * Hook for user profile with caching
 */
export function useCachedUserProfile(userId: string | null) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(
    async (forceRefresh = false) => {
      if (!userId) {
        setProfile(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await cacheManager.getUserProfile(userId, forceRefresh);
        setProfile(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load profile";
        setError(errorMessage);
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  const refresh = useCallback(() => fetchProfile(true), [fetchProfile]);

  useEffect(() => {
    if (userId) {
      fetchProfile();

      // Subscribe to cache updates
      const cacheKey = `${userId}:userProfile`;
      const unsubscribe = cacheManager.subscribe<UserProfile>(cacheKey, (updatedProfile) => {
        setProfile(updatedProfile);
      });

      return unsubscribe;
    }
  }, [userId, fetchProfile]);

  return {
    profile,
    loading,
    error,
    refresh,
  };
}

/**
 * Hook to preload all user data
 */
export function usePreloadUserData(userId: string | null) {
  const [preloaded, setPreloaded] = useState(false);

  useEffect(() => {
    if (userId && !preloaded) {
      cacheManager.preloadUserData(userId).finally(() => {
        setPreloaded(true);
      });
    }
  }, [userId, preloaded]);

  return { preloaded };
}

/**
 * Hook to manage cache invalidation
 */
export function useCacheActions(userId: string | null) {
  const invalidateGroups = useCallback(() => {
    if (userId) {
      cacheManager.invalidate(userId, "userGroups");
    }
  }, [userId]);

  const invalidateFriends = useCallback(() => {
    if (userId) {
      cacheManager.invalidate(userId, "userFriends");
    }
  }, [userId]);

  const invalidateProfile = useCallback(() => {
    if (userId) {
      cacheManager.invalidate(userId, "userProfile");
    }
  }, [userId]);

  const invalidateAll = useCallback(() => {
    if (userId) {
      cacheManager.invalidateUser(userId);
    }
  }, [userId]);

  const clearAllCache = useCallback(() => {
    cacheManager.clearAll();
  }, []);

  return {
    invalidateGroups,
    invalidateFriends,
    invalidateProfile,
    invalidateAll,
    clearAllCache,
  };
}
