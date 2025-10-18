import React, { useState, useEffect } from "react";
import {
  FONTCOLOR,
  SECONDARY_TEXT,
  ACCENT_COLOR,
  PANELFILL,
  BORDERLINE,
  HeaderFont,
  BodyFont,
} from "../../constants";
import { useSessionAuth } from "../../../hooks/useSessionAuth";
import { useWebSocket } from "../../../hooks/useWebSocket";
import { fetchUsersInfo, getDisplayName } from "../../../utils/userInfo";
import type { UserInfo } from "../../../types/user";

interface LobbyData {
  code: string;
  host: string;
  users: string[]; // Array of user IDs, not User objects
  createdAt: string;
}

type LobbyState = "empty" | "hosting" | "joined" | "join";

interface LobbyProps {
  lobbyState?: LobbyState;
  lobbyData?: LobbyData | null;
  onLobbyStateChange?: (state: LobbyState) => void;
  onLobbyDataChange?: (data: LobbyData | null) => void;
}

// Local storage keys for persistence
const LOBBY_STORAGE_KEY = "garden_lobby_data";
const LOBBY_STATE_STORAGE_KEY = "garden_lobby_state";

export default function Lobby({
  lobbyState: propLobbyState = "empty",
  lobbyData: propLobbyData = null,
  onLobbyStateChange,
  onLobbyDataChange,
}: LobbyProps) {
  // Use props if provided, fallback to local state for backward compatibility
  const [localLobbyState, setLocalLobbyState] = useState<LobbyState>(() => {
    if (typeof window !== "undefined") {
      const savedState = localStorage.getItem(LOBBY_STATE_STORAGE_KEY);
      return (savedState as LobbyState) || "empty";
    }
    return "empty";
  });

  const [localLobbyData, setLocalLobbyData] = useState<LobbyData | null>(() => {
    if (typeof window !== "undefined") {
      const savedData = localStorage.getItem(LOBBY_STORAGE_KEY);
      return savedData ? JSON.parse(savedData) : null;
    }
    return null;
  });

  // Use prop values when provided, otherwise use local state
  const lobbyState = onLobbyStateChange ? propLobbyState : localLobbyState;
  const lobbyData = onLobbyDataChange ? propLobbyData : localLobbyData;

  // State change handlers that work with both prop-driven and local state
  const setLobbyState = (newState: LobbyState) => {
    if (onLobbyStateChange) {
      onLobbyStateChange(newState);
    } else {
      setLocalLobbyState(newState);
    }
  };

  const setLobbyData = (
    newData: LobbyData | null | ((prev: LobbyData | null) => LobbyData | null)
  ) => {
    if (onLobbyDataChange) {
      if (typeof newData === "function") {
        const updatedData = newData(propLobbyData);
        onLobbyDataChange(updatedData);
      } else {
        onLobbyDataChange(newData);
      }
    } else {
      if (typeof newData === "function") {
        setLocalLobbyData(newData);
      } else {
        setLocalLobbyData(newData);
      }
    }
  };

  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // User information mapping
  const [usersInfo, setUsersInfo] = useState<Record<string, UserInfo>>({});

  // Authentication
  const { user, isLoading: authLoading, isAuthenticated } = useSessionAuth();

  // WebSocket connection for real-time updates
  const { isConnected, connectionCount, connectionError, onLobbyEvent, clearConnectionError } =
    useWebSocket();

  // Helper function to get display name for a user
  const getDisplayNameForUser = (userId: string): string => {
    // If this is the current user, use session data directly
    if (user && userId === user.userId) {
      return user.userName || user.userEmail.split("@")[0];
    }

    // For other users, try API data first, then fall back to user ID
    const userInfo = usersInfo[userId];
    if (userInfo) {
      if (userInfo.display_name) {
        return userInfo.display_name;
      } else if (userInfo.email) {
        return userInfo.email.split("@")[0];
      }
    }

    // Final fallback: create a readable name from user ID
    // If userId looks like an email, use the part before @
    if (userId.includes("@")) {
      return userId.split("@")[0];
    }

    // Otherwise, show a truncated version of the user ID
    return userId.length > 12 ? `User ${userId.slice(-8)}` : `User ${userId}`;
  };

  // Initialize connection in background without blocking UI
  useEffect(() => {
    // Connection happens automatically via useWebSocket hook
    // No need to show connection status to user unless there's an issue
  }, []);

  // Log WebSocket connection status changes (for debugging only)
  useEffect(() => {}, [isConnected, connectionCount, user?.userId]);

  // Helper functions to manage localStorage persistence
  const saveLobbyData = (state: LobbyState, data: LobbyData | null) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(LOBBY_STATE_STORAGE_KEY, state);
      if (data) {
        localStorage.setItem(LOBBY_STORAGE_KEY, JSON.stringify(data));
      } else {
        localStorage.removeItem(LOBBY_STORAGE_KEY);
      }
    }
  };

  const clearLobbyData = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(LOBBY_STATE_STORAGE_KEY);
      localStorage.removeItem(LOBBY_STORAGE_KEY);
    }
  };

  // Update localStorage whenever lobbyState or lobbyData changes
  useEffect(() => {
    saveLobbyData(lobbyState, lobbyData);
  }, [lobbyState, lobbyData]);

  // Fetch user information when lobby users change (non-critical)
  useEffect(() => {
    if (lobbyData?.users && lobbyData.users.length > 0) {
      fetchUsersInfo(lobbyData.users)
        .then((response) => {
          if (response.success) {
            setUsersInfo(response.users);
          } else {
          }
        })
        .catch((error) => {
          // Don't show error to user - we have fallbacks
        });
    }
  }, [lobbyData?.users]);

  // Handle real-time lobby events from WebSocket
  useEffect(() => {
    if (!lobbyData || !user?.userId) return;

    const cleanup = onLobbyEvent((event) => {
      // Only process events for our current lobby
      if (event.lobby_code !== lobbyData.code) {
        return;
      }

      switch (event.action) {
        case "join":
          if (event.user_id !== user.userId) {
            // Another user joined
            setLobbyData((prevData) => {
              if (!prevData) return prevData;
              return {
                ...prevData,
                users: event.users,
              };
            });
          } else {
          }
          break;

        case "leave":
          if (event.user_id !== user.userId) {
            // Another user left
            setLobbyData((prevData) => {
              if (!prevData) return prevData;
              return {
                ...prevData,
                users: event.users,
              };
            });
          } else {
          }
          break;

        case "disband":
          // Lobby was disbanded by host
          if (event.user_id !== user.userId) {
            // Show notification that lobby was disbanded
            setError("Lobby was disbanded by the host");
          } else {
          }
          setLobbyData(null);
          setLobbyState("empty");
          clearLobbyData();
          break;

        default:
          console.warn("🏠 Lobby: Unknown event action", event.action);
      }
    });

    return cleanup;
  }, [lobbyData, user?.userId, onLobbyEvent]);

  // Validate lobby on component mount/refresh (for non-hosts)
  // This runs in background without blocking UI
  useEffect(() => {
    const validateLobby = async () => {
      if (!lobbyData || !user?.userId || !isAuthenticated) return;

      // Only validate for non-hosts
      if (lobbyState === "hosting" || lobbyData.host === user.userId) return;

      try {
        const response = await fetch(`/api/hosting/status?lobby_id=${lobbyData.code}`, {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          // Network error or server error - show error but don't immediately clear data

          setError("Unable to verify lobby status. Please check your connection.");
          return;
        }

        const statusData = await response.json();

        // Check if lobby exists and user is still a member
        if (!statusData.lobby_exists || !statusData.is_member) {
          setError("The lobby you were in is no longer available");
          setLobbyData(null);
          setLobbyState("empty");
          clearLobbyData();
          return;
        }

        // Update lobby data with current state from server
        if (statusData.success) {
          setLobbyData({
            code: statusData.code,
            host: statusData.host,
            users: statusData.users,
            createdAt: statusData.createdAt,
          });

          // Update lobby state based on current role
          if (statusData.is_host) {
            setLobbyState("hosting");
          } else {
            setLobbyState("joined");
          }

          // Clear any previous errors
          setError("");
        }
      } catch (err) {
        console.error("🔍 Lobby: Error during background validation:", err);
        setError("Unable to verify lobby status. Some features may not work properly.");
        // Don't clear data on network errors, user can retry
      }
    };

    // Run validation in background after a short delay to let UI render first
    if (!authLoading && lobbyData) {
      const timeoutId = setTimeout(() => {
        validateLobby();
      }, 100); // 100ms delay to ensure UI renders first

      return () => clearTimeout(timeoutId);
    }
  }, [authLoading, isAuthenticated, user?.userId]); // Only depend on auth state, not lobbyData to avoid loops

  // Cleanup on component unmount or when user leaves
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (lobbyState === "hosting" && lobbyData) {
        closeLobby();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Don't close lobby on component unmount - only on actual page/browser close
    };
  }, [lobbyState, lobbyData]);

  // Lobby health check system - detect dead/killed lobbies
  useEffect(() => {
    if (!lobbyData || lobbyState === "empty") return;

    let healthCheckInterval: NodeJS.Timeout;
    let consecutiveFailures = 0;
    const maxFailures = 3; // Allow 3 consecutive failures before considering lobby dead
    const healthCheckDelay = 30000; // Check every 30 seconds

    const checkLobbyHealth = async () => {
      try {
        const response = await fetch(`/api/hosting/lobby/${lobbyData.code}/health`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });

        if (response.ok) {
          consecutiveFailures = 0;
        } else if (response.status === 404 || response.status === 410) {
          setError("Lobby has been closed or no longer exists");
          setLobbyData(null);
          setLobbyState("empty");
          clearLobbyData();
          return; // Stop health checks
        } else {
          consecutiveFailures++;
          console.warn(`🩺 Lobby: Health check failed (${consecutiveFailures}/${maxFailures})`);
        }
      } catch (err) {
        consecutiveFailures++;
        console.warn(`🩺 Lobby: Health check error (${consecutiveFailures}/${maxFailures}):`, err);
      }

      // If too many consecutive failures, assume lobby is dead
      if (consecutiveFailures >= maxFailures) {
        setError("Lobby connection lost - returning to main page");
        setLobbyData(null);
        setLobbyState("empty");
        clearLobbyData();
      }
    };

    // Start health checks after initial delay
    const initialDelay = setTimeout(() => {
      healthCheckInterval = setInterval(checkLobbyHealth, healthCheckDelay);
    }, healthCheckDelay);

    return () => {
      clearTimeout(initialDelay);
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
      }
    };
  }, [lobbyData, lobbyState]);

  const createLobby = async () => {
    if (!isAuthenticated || !user) {
      setError("Please log in to create a lobby");
      // Redirect to login
      window.location.href = "/login";
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/hosting/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies for session
        body: JSON.stringify({
          user_id: user.userId, // Include user_id in request body
        }),
      });

      if (response.status === 200) {
        const data = await response.json();

        setLobbyData(data);
        setLobbyState("hosting");
      } else {
        // Extract error message from backend response
        try {
          const errorData = await response.json();

          setError(
            errorData.detail || errorData.message || "Failed to create lobby. Please try again."
          );
        } catch {
          setError("Failed to create lobby. Please try again.");
        }
      }
    } catch (err) {
      console.error("🏗️ Lobby: Network error creating lobby", err);
      setError(
        `Network error: ${err instanceof Error ? err.message : "Please check your connection."}`
      );
    } finally {
      setLoading(false);
    }
  };

  const joinLobby = async () => {
    if (!joinCode.trim()) {
      setError("Please enter a lobby code");
      return;
    }

    if (!isAuthenticated || !user) {
      setError("Please log in to join a lobby");
      // Redirect to login
      window.location.href = "/login";
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/hosting/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies for session
        body: JSON.stringify({
          user_id: user.userId,
          lobby_id: joinCode.trim(),
        }),
      });

      if (response.status === 200) {
        const data = await response.json();

        setLobbyData(data);
        setLobbyState("joined");
      } else {
        // Extract error message from backend response
        try {
          const errorData = await response.json();

          setError(
            errorData.detail ||
              errorData.message ||
              "Failed to join lobby. Please check the code and try again."
          );
        } catch {
          setError("Failed to join lobby. Please check the code and try again.");
        }
      }
    } catch (err) {
      console.error("🚪 Lobby: Network error joining lobby", err);
      setError(
        `Network error: ${err instanceof Error ? err.message : "Please check your connection."}`
      );
    } finally {
      setLoading(false);
    }
  };

  const closeLobby = async () => {
    if (!lobbyData) return;

    if (!user?.userId) {
      console.error("🔒 Lobby: Cannot close lobby - user ID not available");
      return;
    }

    if (!lobbyData.code) {
      console.error("🔒 Lobby: Cannot close lobby - lobby code not available", lobbyData);
      return;
    }

    try {
      const requestBody = {
        user_id: user.userId,
        code: lobbyData.code,
      };

      // Add timeout to detect killed lobbies
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 10000); // 10 second timeout

      const response = await fetch(`/api/hosting/end`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies for session
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        try {
          const errorData = await response.json();
          const errorMessage = errorData.detail || errorData.message || "Failed to close lobby";
          console.error("🔒 Lobby: Close failed with error", response.status, errorMessage);

          // If lobby has been killed/deleted on server, free the user and return to main page
          if (response.status === 404 || response.status === 410) {
            setError("Lobby has been closed or no longer exists");
            // Fall through to clear lobby data and return user to main page
          } else {
            // For other errors, don't clear lobby data - let user try again
            setError(`Failed to close lobby: ${errorMessage}`);
            return;
          }
        } catch {
          console.error("🔒 Lobby: Close failed with unknown error", response.status);

          // For server errors that might indicate lobby was killed, free the user
          if (response.status >= 500) {
            setError("Server error - returning to lobby main page");
            // Fall through to clear lobby data
          } else {
            setError("Failed to close lobby - please try again");
            return;
          }
        }
      } else {
      }
    } catch (err) {
      console.error("🔒 Lobby: Network error closing lobby", err);

      // Check if this was a timeout (AbortError)
      if (err instanceof Error && err.name === "AbortError") {
        setError("Close request timed out - returning to lobby main page");
      } else {
        // Other network errors might indicate the server/lobby is down

        setError("Network error - returning to lobby main page");
      }
      // Fall through to clear lobby data
    }

    setLobbyData(null);
    setLobbyState("empty");
    clearLobbyData(); // Clear persisted data
  };

  const leaveLobby = async () => {
    if (!isAuthenticated || !user || !lobbyData) {
      setError("Cannot leave lobby - not authenticated or no lobby data");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/hosting/leave", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.userId,
          lobby_id: lobbyData.code,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to leave lobby");
      }

      if (data.success) {
        // Successfully left lobby - clear local state
        setLobbyData(null);
        setLobbyState("empty");
        setJoinCode("");
        setError("");
        clearLobbyData(); // Clear persisted data
      } else {
        throw new Error(data.message || "Failed to leave lobby");
      }
    } catch (err: unknown) {
      console.error("🚪🔙 Lobby: Error leaving lobby", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to leave lobby";
      setError(errorMessage);

      // For certain errors, still clear local state
      if (errorMessage?.includes("not found") || errorMessage?.includes("not in lobby")) {
        setLobbyData(null);
        setLobbyState("empty");
        setJoinCode("");
        clearLobbyData();
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshLobby = async () => {
    if (!lobbyData || !user?.userId) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/hosting/status?lobby_id=${lobbyData.code}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || errorData.message || "Failed to refresh lobby");
      }

      const statusData = await response.json();

      // Check if lobby exists and user is still a member
      if (!statusData.lobby_exists || !statusData.is_member) {
        setError("You are no longer a member of this lobby");
        setLobbyData(null);
        setLobbyState("empty");
        clearLobbyData();
        return;
      }

      // Update lobby data with current state from server
      setLobbyData({
        code: statusData.code,
        host: statusData.host,
        users: statusData.users,
        createdAt: statusData.createdAt,
      });

      // Update lobby state based on current role
      if (statusData.is_host) {
        setLobbyState("hosting");
      } else {
        setLobbyState("joined");
      }
    } catch (err: unknown) {
      console.error("Refresh lobby error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to refresh lobby";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const goBackToEmpty = () => {
    // Simply go back to empty state without making any server requests
    // This is used when backing out of the "join" state where no lobby has been joined yet
    setLobbyState("empty");
    setJoinCode("");
    setError("");
  };

  // Show login prompt only if definitely not authenticated (not during loading)
  if (!authLoading && !isAuthenticated) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full p-5"
        style={{ backgroundColor: PANELFILL }}
      >
        <div className="flex flex-col gap-4 items-center text-center">
          <h3 className="text-2xl mb-2" style={{ fontFamily: HeaderFont, color: FONTCOLOR }}>
            Authentication Required
          </h3>
          <p className="text-sm mb-5" style={{ fontFamily: BodyFont, color: SECONDARY_TEXT }}>
            Please log in to create or join study lobbies
          </p>
          <button
            onClick={() => (window.location.href = "/login")}
            className="text-white border-none py-3 px-6 rounded-lg text-base cursor-pointer transition-all min-w-[200px]"
            style={{ backgroundColor: ACCENT_COLOR, fontFamily: BodyFont }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Empty State
  if (lobbyState === "empty") {
    return (
      <div
        className="flex flex-col items-center justify-center h-full p-5"
        style={{ backgroundColor: PANELFILL }}
      >
        <div className="flex flex-col gap-4 items-center">
          <div className="text-center mb-5">
            <h3 className="text-2xl mb-2" style={{ fontFamily: HeaderFont, color: FONTCOLOR }}>
              Study Together
            </h3>
            <p className="text-sm" style={{ fontFamily: BodyFont, color: SECONDARY_TEXT }}>
              Create or join a lobby to study with friends
            </p>
          </div>

          <button
            onClick={createLobby}
            disabled={loading || authLoading}
            className="text-white border-none py-3 px-6 rounded-lg text-base transition-all min-w-[200px]"
            style={{
              backgroundColor: ACCENT_COLOR,
              fontFamily: BodyFont,
              cursor: loading || authLoading ? "not-allowed" : "pointer",
              opacity: loading || authLoading ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!loading && !authLoading) {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }
            }}
          >
            {loading ? "Creating..." : authLoading ? "Loading..." : "Create Lobby"}
          </button>

          <button
            onClick={() => setLobbyState("join")}
            disabled={loading || authLoading}
            className="bg-transparent py-3 px-6 rounded-lg text-base transition-all min-w-[200px]"
            style={{
              color: ACCENT_COLOR,
              border: `2px solid ${ACCENT_COLOR}`,
              fontFamily: BodyFont,
              cursor: loading || authLoading ? "not-allowed" : "pointer",
              opacity: loading || authLoading ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = ACCENT_COLOR;
                e.currentTarget.style.color = "white";
                e.currentTarget.style.transform = "translateY(-1px)";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = ACCENT_COLOR;
                e.currentTarget.style.transform = "translateY(0)";
              }
            }}
          >
            Join Lobby
          </button>

          {error && (
            <p
              className="text-sm text-center mt-2.5"
              style={{ color: "#ef4444", fontFamily: BodyFont }}
            >
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Join State
  if (lobbyState === "join") {
    return (
      <div
        className="flex flex-col items-center justify-center h-full p-5"
        style={{ backgroundColor: PANELFILL }}
      >
        <div className="flex flex-col gap-4 items-center max-w-[300px] w-full">
          <button
            onClick={goBackToEmpty}
            className="self-start bg-transparent border-none text-sm cursor-pointer p-1 flex items-center gap-1"
            style={{ color: SECONDARY_TEXT, fontFamily: BodyFont }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = FONTCOLOR;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = SECONDARY_TEXT;
            }}
          >
            <i className="fi fi-rr-arrow-left"></i>
            Back
          </button>

          <div className="text-center mb-5">
            <h3 className="text-2xl mb-2" style={{ fontFamily: HeaderFont, color: FONTCOLOR }}>
              Join Lobby
            </h3>
            <p className="text-sm" style={{ fontFamily: BodyFont, color: SECONDARY_TEXT }}>
              Enter the lobby code to join your study session
            </p>
          </div>

          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="Enter lobby code"
            className="w-full p-3 rounded-lg text-base bg-white outline-none transition-[border-color]"
            style={{
              border: `2px solid ${BORDERLINE}`,
              fontFamily: BodyFont,
              color: FONTCOLOR,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = ACCENT_COLOR;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = BORDERLINE;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading) {
                joinLobby();
              }
            }}
          />

          <button
            onClick={joinLobby}
            disabled={loading || !joinCode.trim()}
            className="text-white border-none py-3 px-6 rounded-lg text-base transition-all w-full"
            style={{
              backgroundColor: ACCENT_COLOR,
              fontFamily: BodyFont,
              cursor: loading || !joinCode.trim() ? "not-allowed" : "pointer",
              opacity: loading || !joinCode.trim() ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!loading && joinCode.trim()) {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && joinCode.trim()) {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }
            }}
          >
            {loading ? "Joining..." : "Join Lobby"}
          </button>

          {error && (
            <p
              className="text-sm text-center mt-2.5"
              style={{ color: "#ef4444", fontFamily: BodyFont }}
            >
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Hosting or Joined State
  return (
    <div className="flex flex-col h-full p-5" style={{ backgroundColor: PANELFILL }}>
      {/* Header */}
      <div
        className="flex justify-between items-center mb-5 pb-4"
        style={{ borderBottom: `2px solid ${BORDERLINE}` }}
      >
        <div>
          <h3 className="text-2xl mb-1" style={{ fontFamily: HeaderFont, color: FONTCOLOR }}>
            {lobbyState === "hosting" ? "Hosting Lobby" : "Joined Lobby"}
          </h3>
          <p className="text-sm" style={{ fontFamily: BodyFont, color: SECONDARY_TEXT }}>
            Code:{" "}
            <span className="font-bold" style={{ color: ACCENT_COLOR }}>
              {lobbyData?.code}
            </span>
          </p>
          {/* Connection status - show error or reconnecting status */}
          {(connectionError || !isConnected) && (
            <div className="mt-2">
              <div className="flex items-center gap-1.5 mb-1">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: connectionError ? "#ef4444" : "#f59e0b" }}
                />
                <span
                  className="text-xs"
                  style={{
                    fontFamily: BodyFont,
                    color: connectionError ? "#ef4444" : "#f59e0b",
                  }}
                >
                  {connectionError || "Reconnecting..."}
                </span>
              </div>
              {connectionError && (
                <button
                  onClick={() => {
                    clearConnectionError();
                    window.location.reload();
                  }}
                  className="text-white border-none py-1 px-2 rounded text-xs cursor-pointer mt-1"
                  style={{ backgroundColor: ACCENT_COLOR, fontFamily: BodyFont }}
                >
                  Refresh Page
                </button>
              )}
            </div>
          )}
        </div>

        {lobbyState === "hosting" ? (
          <button
            onClick={closeLobby}
            className="text-white border-none py-2 px-4 rounded-md text-sm cursor-pointer transition-all"
            style={{ backgroundColor: "#ef4444", fontFamily: BodyFont }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#dc2626";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#ef4444";
            }}
          >
            Close Lobby
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={refreshLobby}
              disabled={loading || authLoading}
              className="bg-transparent py-2 px-4 rounded-md text-sm transition-all"
              style={{
                color: ACCENT_COLOR,
                border: `1px solid ${ACCENT_COLOR}`,
                fontFamily: BodyFont,
                cursor: loading || authLoading ? "not-allowed" : "pointer",
                opacity: loading || authLoading ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!loading && !authLoading) {
                  e.currentTarget.style.backgroundColor = ACCENT_COLOR;
                  e.currentTarget.style.color = "white";
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = ACCENT_COLOR;
                }
              }}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
            <button
              onClick={leaveLobby}
              disabled={loading || authLoading}
              className="bg-transparent py-2 px-4 rounded-md text-sm transition-all"
              style={{
                color: SECONDARY_TEXT,
                border: `1px solid ${BORDERLINE}`,
                fontFamily: BodyFont,
                cursor: loading || authLoading ? "not-allowed" : "pointer",
                opacity: loading || authLoading ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!loading && !authLoading) {
                  e.currentTarget.style.backgroundColor = BORDERLINE;
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              Leave Lobby
            </button>
          </div>
        )}
      </div>

      {/* Online Users */}
      <div className="flex-1 overflow-auto">
        <h4 className="text-lg mb-3" style={{ fontFamily: HeaderFont, color: FONTCOLOR }}>
          Online Users ({lobbyData?.users?.length || 0})
        </h4>

        {lobbyData?.users && lobbyData.users.length > 0 ? (
          <div className="flex flex-col gap-2">
            {lobbyData.users.map((userId) => {
              const displayName = getDisplayNameForUser(userId);

              return (
                <div
                  key={userId}
                  className="flex items-center gap-3 p-3 bg-white rounded-lg"
                  style={{ border: `1px solid ${BORDERLINE}` }}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#10b981" }} />
                  <div className="flex-1">
                    <p className="text-base m-0" style={{ fontFamily: BodyFont, color: FONTCOLOR }}>
                      {displayName}
                      {lobbyData.host === userId && (
                        <span className="ml-2 text-xs font-bold" style={{ color: ACCENT_COLOR }}>
                          (Host)
                        </span>
                      )}
                    </p>
                    <p
                      className="text-xs m-0"
                      style={{ fontFamily: BodyFont, color: SECONDARY_TEXT }}
                    >
                      Online
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            className="text-center py-10 px-5"
            style={{ color: SECONDARY_TEXT, fontFamily: BodyFont }}
          >
            <i className="fi fi-rr-users text-5xl mb-4 block" />
            <p>Waiting for users to join...</p>
          </div>
        )}
      </div>
    </div>
  );
}
