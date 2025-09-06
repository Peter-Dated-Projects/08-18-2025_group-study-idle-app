/**
 * Custom hook for handling session-based authentication
 * This hook checks the user's authentication status and provides user session data
 */

import { useState, useEffect } from "react";

interface UserSession {
  userId: string;
  userEmail: string;
  userName: string | null;
  sessionId: string;
  hasNotionTokens: boolean;
}

interface UseSessionAuthReturn {
  user: UserSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useSessionAuth(): UseSessionAuthReturn {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkSession = async () => {
    try {
      setError(null);
      const response = await fetch("/api/auth/session", {
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUser({
          userId: data.userId,
          userEmail: data.userEmail,
          userName: data.userName,
          sessionId: data.sessionId,
          hasNotionTokens: data.hasNotionTokens,
        });
      } else {
        setUser(null);
        if (data.error && data.error !== "No user ID found" && data.error !== "Invalid session") {
          setError(data.error);
        }
      }
    } catch (err) {
      console.error("Error checking session:", err);
      setUser(null);
      setError("Failed to check authentication status");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const refresh = async () => {
    setIsLoading(true);
    await checkSession();
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    refresh,
  };
}
