/**
 * Utility functions for fetching user information with caching
 */

import type { UserInfo } from "../types/user";

export interface UsersInfoResponse {
  success: boolean;
  users: Record<string, UserInfo>;
  cache_stats?: {
    total_requested: number;
    cache_hits: number;
    cache_misses: number;
    cache_hit_rate: number;
  };
}

/**
 * Fetch user information for multiple users using the new batch API
 * @param userIds Array of user IDs to fetch information for
 * @returns Promise resolving to users info response
 */
export async function fetchUsersInfo(userIds: string[]): Promise<UsersInfoResponse> {
  try {
    const response = await fetch("/api/users/info", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_ids: userIds,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching users info:", error);
    return {
      success: false,
      users: {},
    };
  }
}

/**
 * Fetch user information for a single user
 * @param userId User ID to fetch information for
 * @returns Promise resolving to user info or null if not found
 */
export async function fetchUserInfo(userId: string): Promise<UserInfo | null> {
  try {
    const response = await fetch(`/api/users/info/${userId}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.success ? data.user : null;
  } catch (error) {
    console.error("Error fetching user info:", error);
    return null;
  }
}

/**
 * Get display name for a user, falling back to user ID
 * @param userInfo User information object
 * @returns Display name or user ID as fallback
 */
export function getDisplayName(userInfo: UserInfo | null): string {
  if (!userInfo) return "Loading...";
  return userInfo.display_name || "Unnamed User";
}

/**
 * Create a map of user IDs to display names
 * @param usersInfo Users info response
 * @returns Map of user ID to display name
 */
export function createDisplayNameMap(usersInfo: UsersInfoResponse): Record<string, string> {
  const displayNameMap: Record<string, string> = {};

  if (usersInfo.success) {
    Object.entries(usersInfo.users).forEach(([userId, userInfo]) => {
      displayNameMap[userId] = getDisplayName(userInfo);
    });
  }

  return displayNameMap;
}

/**
 * React hook to fetch and manage user information
 */
import { useState, useEffect } from "react";

export function useUsersInfo(userIds: string[]) {
  const [usersInfo, setUsersInfo] = useState<Record<string, UserInfo>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userIds.length === 0) {
      setUsersInfo({});
      return;
    }

    setLoading(true);
    setError(null);

    fetchUsersInfo(userIds)
      .then((response) => {
        if (response.success) {
          setUsersInfo(response.users);
        } else {
          setError("Failed to fetch user information");
        }
      })
      .catch((err) => {
        setError(err.message || "Failed to fetch user information");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [userIds.join(",")]); // Use join to create stable dependency

  return {
    usersInfo,
    loading,
    error,
    getDisplayName: (userId: string) => getDisplayName(usersInfo[userId]),
  };
}
