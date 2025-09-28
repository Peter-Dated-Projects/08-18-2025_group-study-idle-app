/**
 * Optimized authentication hook that reduces /api/auth/session calls
 * This hook implements smart caching and shared state to minimize API requests
 */

import { useState, useEffect, useRef } from "react";

interface UserSession {
  userId: string;
  userEmail: string;
  userName: string | null;
  sessionId: string;
  hasNotionTokens: boolean;
  userPictureUrl?: string | null;
}

interface UseOptimizedAuthReturn {
  user: UserSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// Global shared state to prevent multiple API calls
class AuthManager {
  private static instance: AuthManager;
  private user: UserSession | null = null;
  private isLoading: boolean = false;
  private error: string | null = null;
  private lastValidated: number = 0;
  private subscribers: Set<() => void> = new Set();
  private currentRequest: Promise<void> | null = null;

  // Cache duration: 5 minutes
  private readonly CACHE_DURATION = 5 * 60 * 1000;
  // Revalidation interval: 10 minutes
  private readonly REVALIDATION_INTERVAL = 10 * 60 * 1000;

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notify(): void {
    this.subscribers.forEach((callback) => callback());
  }

  async validateSession(force: boolean = false): Promise<void> {
    // Check if we have recent valid data and don't force refresh
    const now = Date.now();
    const hasRecentData = now - this.lastValidated < this.CACHE_DURATION;

    if (!force && hasRecentData && !this.isLoading) {
      return;
    }

    // Prevent multiple simultaneous requests
    if (this.currentRequest) {
      return this.currentRequest;
    }

    this.isLoading = true;
    this.error = null;
    this.notify();

    this.currentRequest = this.performValidation();
    await this.currentRequest;
    this.currentRequest = null;
  }

  private async performValidation(): Promise<void> {
    try {
      const response = await fetch("/api/auth/session", {
        credentials: "include",
        // Add cache-busting only if needed
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        this.user = {
          userId: data.userId,
          userEmail: data.userEmail,
          userName: data.userName,
          sessionId: data.sessionId,
          hasNotionTokens: data.hasNotionTokens,
          userPictureUrl: data.userPictureUrl,
        };
        this.error = null;
        this.lastValidated = Date.now();
      } else {
        this.user = null;
        // Only set error for unexpected failures
        if (data.error && data.error !== "No user ID found" && data.error !== "Invalid session") {
          this.error = data.error;
        } else {
          this.error = null;
        }
      }
    } catch (err) {
      console.error("Error validating session:", err);
      this.user = null;
      this.error = "Failed to check authentication status";
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  getState(): {
    user: UserSession | null;
    isLoading: boolean;
    error: string | null;
    isAuthenticated: boolean;
  } {
    return {
      user: this.user,
      isLoading: this.isLoading,
      error: this.error,
      isAuthenticated: !!this.user,
    };
  }

  async refresh(): Promise<void> {
    await this.validateSession(true);
  }

  // Setup periodic revalidation
  startPeriodicValidation(): void {
    // Only revalidate if user is authenticated and tab is visible
    setInterval(() => {
      if (this.user && !document.hidden) {
        this.validateSession();
      }
    }, this.REVALIDATION_INTERVAL);

    // Revalidate when tab becomes visible
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && this.user) {
        // Check if data is stale when tab becomes visible
        const now = Date.now();
        const isStale = now - this.lastValidated > this.CACHE_DURATION;
        if (isStale) {
          this.validateSession();
        }
      }
    });
  }
}

// Initialize the singleton
const authManager = AuthManager.getInstance();

export function useOptimizedAuth(): UseOptimizedAuthReturn {
  const [state, setState] = useState(() => authManager.getState());
  const initializedRef = useRef(false);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = authManager.subscribe(() => {
      setState(authManager.getState());
    });

    // Initialize on first mount
    if (!initializedRef.current) {
      initializedRef.current = true;
      authManager.validateSession();
      authManager.startPeriodicValidation();
    }

    return unsubscribe;
  }, []);

  const refresh = async (): Promise<void> => {
    await authManager.refresh();
  };

  return {
    user: state.user,
    isLoading: state.isLoading,
    isAuthenticated: state.isAuthenticated,
    error: state.error,
    refresh,
  };
}

// Export a version that's compatible with existing useSessionAuth interface
export function useSessionAuth(): UseOptimizedAuthReturn {
  return useOptimizedAuth();
}
