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

interface User {
  id: string;
  name: string;
  joinedAt: string;
}

interface LobbyData {
  code: string;
  host: string;
  users: string[]; // Array of user IDs, not User objects
  createdAt: string;
}

type LobbyState = "empty" | "hosting" | "joined" | "join";

// Local storage keys for persistence
const LOBBY_STORAGE_KEY = "garden_lobby_data";
const LOBBY_STATE_STORAGE_KEY = "garden_lobby_state";

export default function Lobby() {
  // Initialize state from localStorage if available
  const [lobbyState, setLobbyState] = useState<LobbyState>(() => {
    if (typeof window !== "undefined") {
      const savedState = localStorage.getItem(LOBBY_STATE_STORAGE_KEY);
      return (savedState as LobbyState) || "empty";
    }
    return "empty";
  });

  const [lobbyData, setLobbyData] = useState<LobbyData | null>(() => {
    if (typeof window !== "undefined") {
      const savedData = localStorage.getItem(LOBBY_STORAGE_KEY);
      return savedData ? JSON.parse(savedData) : null;
    }
    return null;
  });

  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Authentication
  const { user, isLoading: authLoading, isAuthenticated } = useSessionAuth();

  // WebSocket connection for real-time updates
  const { isConnected, connectionCount, connectionError, onLobbyEvent, clearConnectionError } =
    useWebSocket();

  // Initialize connection in background without blocking UI
  useEffect(() => {
    // Connection happens automatically via useWebSocket hook
    // No need to show connection status to user unless there's an issue
  }, []);

  // Log WebSocket connection status changes (for debugging only)
  useEffect(() => {
    console.log("🔌 Lobby: WebSocket connection status", {
      isConnected,
      connectionCount,
      user_id: user?.userId,
    });
  }, [isConnected, connectionCount, user?.userId]);

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

  // Handle real-time lobby events from WebSocket
  useEffect(() => {
    if (!lobbyData || !user?.userId) return;

    const cleanup = onLobbyEvent((event) => {
      console.log("🏠 Lobby: Received event", {
        action: event.action,
        lobby_code: event.lobby_code,
        user_id: event.user_id,
        users: event.users,
        current_lobby: lobbyData?.code,
        current_user: user?.userId,
      });

      // Only process events for our current lobby
      if (event.lobby_code !== lobbyData.code) {
        console.log("🏠 Lobby: Ignoring event for different lobby", {
          event_lobby: event.lobby_code,
          current_lobby: lobbyData.code,
        });
        return;
      }

      switch (event.action) {
        case "join":
          if (event.user_id !== user.userId) {
            console.log("🏠 Lobby: Another user joined", event.user_id);
            // Another user joined
            setLobbyData((prevData) => {
              if (!prevData) return prevData;
              return {
                ...prevData,
                users: event.users,
              };
            });
          } else {
            console.log("🏠 Lobby: We joined the lobby");
          }
          break;

        case "leave":
          if (event.user_id !== user.userId) {
            console.log("🏠 Lobby: Another user left", event.user_id);
            // Another user left
            setLobbyData((prevData) => {
              if (!prevData) return prevData;
              return {
                ...prevData,
                users: event.users,
              };
            });
          } else {
            console.log("🏠 Lobby: We left the lobby");
          }
          break;

        case "disband":
          console.log("🏠 Lobby: Lobby was disbanded", {
            disbanded_by: event.user_id,
            current_user: user.userId,
            is_host: event.user_id === user.userId,
          });
          // Lobby was disbanded by host
          if (event.user_id !== user.userId) {
            // Show notification that lobby was disbanded
            setError("Lobby was disbanded by the host");
            console.log("🏠 Lobby: Showing disband notification to non-host user");
          } else {
            console.log("🏠 Lobby: Host disbanded their own lobby");
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

      console.log("🔍 Lobby: Background validation for non-host user...");

      try {
        const response = await fetch(`/api/hosting/status?lobby_id=${lobbyData.code}`, {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          // Network error or server error - show error but don't immediately clear data
          console.log("🔍 Lobby: Validation failed due to network/server error");
          setError("Unable to verify lobby status. Please check your connection.");
          return;
        }

        const statusData = await response.json();

        // Check if lobby exists and user is still a member
        if (!statusData.lobby_exists || !statusData.is_member) {
          console.log("🔍 Lobby: Validation failed - lobby doesn't exist or user not a member");
          setError("The lobby you were in is no longer available");
          setLobbyData(null);
          setLobbyState("empty");
          clearLobbyData();
          return;
        }

        // Update lobby data with current state from server
        if (statusData.success) {
          console.log("🔍 Lobby: Validation successful, updating local data");
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

  const createLobby = async () => {
    console.log("🏗️ Lobby: Creating lobby", { user_id: user?.userId, isAuthenticated });

    if (!isAuthenticated || !user) {
      console.log("🏗️ Lobby: Not authenticated, redirecting to login");
      setError("Please log in to create a lobby");
      // Redirect to login
      window.location.href = "/login";
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("🏗️ Lobby: Sending create request to backend");
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

      console.log("🏗️ Lobby: Create response", { status: response.status });

      if (response.status === 200) {
        const data = await response.json();
        console.log("🏗️ Lobby: Successfully created lobby", data);
        setLobbyData(data);
        setLobbyState("hosting");
      } else {
        // Extract error message from backend response
        try {
          const errorData = await response.json();
          console.log("🏗️ Lobby: Create failed with error", errorData);
          setError(
            errorData.detail || errorData.message || "Failed to create lobby. Please try again."
          );
        } catch {
          console.log("🏗️ Lobby: Create failed with unknown error");
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
    console.log("🚪 Lobby: Joining lobby", {
      joinCode: joinCode.trim(),
      user_id: user?.userId,
      isAuthenticated,
    });

    if (!joinCode.trim()) {
      console.log("🚪 Lobby: No join code provided");
      setError("Please enter a lobby code");
      return;
    }

    if (!isAuthenticated || !user) {
      console.log("🚪 Lobby: Not authenticated, redirecting to login");
      setError("Please log in to join a lobby");
      // Redirect to login
      window.location.href = "/login";
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("🚪 Lobby: Sending join request to backend");
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

      console.log("🚪 Lobby: Join response", { status: response.status });

      if (response.status === 200) {
        const data = await response.json();
        console.log("🚪 Lobby: Successfully joined lobby", data);
        setLobbyData(data);
        setLobbyState("joined");
      } else {
        // Extract error message from backend response
        try {
          const errorData = await response.json();
          console.log("🚪 Lobby: Join failed with error", errorData);
          setError(
            errorData.detail ||
              errorData.message ||
              "Failed to join lobby. Please check the code and try again."
          );
        } catch {
          console.log("🚪 Lobby: Join failed with unknown error");
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
    console.log("🔒 Lobby: Closing lobby", {
      lobby_code: lobbyData?.code,
      user_id: user?.userId,
    });

    if (!lobbyData) return;

    console.log("🔒 Lobby: Current lobbyData:", lobbyData);

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
      console.log("🔒 Lobby: Sending close request", requestBody);

      const response = await fetch(`/api/hosting/end`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies for session
        body: JSON.stringify(requestBody),
      });

      console.log("🔒 Lobby: Close response", { status: response.status });

      if (!response.ok) {
        try {
          const errorData = await response.json();
          const errorMessage = errorData.detail || errorData.message || "Failed to close lobby";
          console.error("🔒 Lobby: Close failed with error", response.status, errorMessage);
          // You might want to show this error to the user in the UI
          // For now, we'll just log it since close lobby doesn't have error state in UI
        } catch {
          console.error("🔒 Lobby: Close failed with unknown error", response.status);
        }
        return; // Don't clear lobby data if close failed
      } else {
        console.log("🔒 Lobby: Successfully closed lobby");
      }
    } catch (err) {
      console.error("🔒 Lobby: Network error closing lobby", err);
    }

    setLobbyData(null);
    setLobbyState("empty");
    clearLobbyData(); // Clear persisted data
  };

  const leaveLobby = async () => {
    console.log("🚪🔙 Lobby: Leaving lobby", {
      lobby_code: lobbyData?.code,
      user_id: user?.userId,
      isAuthenticated,
    });

    if (!isAuthenticated || !user || !lobbyData) {
      console.log("🚪🔙 Lobby: Cannot leave - missing authentication or lobby data");
      setError("Cannot leave lobby - not authenticated or no lobby data");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("🚪🔙 Lobby: Sending leave request to backend");
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
      console.log("🚪🔙 Lobby: Leave response", { status: response.status, data });

      if (!response.ok) {
        throw new Error(data.error || "Failed to leave lobby");
      }

      if (data.success) {
        console.log("🚪🔙 Lobby: Successfully left lobby");
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
        console.log("🚪🔙 Lobby: Clearing local state due to lobby not found");
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

  // Show login prompt only if definitely not authenticated (not during loading)
  if (!authLoading && !isAuthenticated) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          padding: "20px",
          backgroundColor: PANELFILL,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <h3
            style={{
              fontFamily: HeaderFont,
              color: FONTCOLOR,
              fontSize: "1.5rem",
              marginBottom: "8px",
            }}
          >
            Authentication Required
          </h3>
          <p
            style={{
              fontFamily: BodyFont,
              color: SECONDARY_TEXT,
              fontSize: "0.9rem",
              marginBottom: "20px",
            }}
          >
            Please log in to create or join study lobbies
          </p>
          <button
            onClick={() => (window.location.href = "/login")}
            style={{
              backgroundColor: ACCENT_COLOR,
              color: "white",
              border: "none",
              padding: "12px 24px",
              borderRadius: "8px",
              fontFamily: BodyFont,
              fontSize: "1rem",
              cursor: "pointer",
              transition: "all 0.2s ease",
              minWidth: "200px",
            }}
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
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          padding: "20px",
          backgroundColor: PANELFILL,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            alignItems: "center",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <h3
              style={{
                fontFamily: HeaderFont,
                color: FONTCOLOR,
                fontSize: "1.5rem",
                marginBottom: "8px",
              }}
            >
              Study Together
            </h3>
            <p
              style={{
                fontFamily: BodyFont,
                color: SECONDARY_TEXT,
                fontSize: "0.9rem",
              }}
            >
              Create or join a lobby to study with friends
            </p>
          </div>

          <button
            onClick={createLobby}
            disabled={loading || authLoading}
            style={{
              backgroundColor: ACCENT_COLOR,
              color: "white",
              border: "none",
              padding: "12px 24px",
              borderRadius: "8px",
              fontFamily: BodyFont,
              fontSize: "1rem",
              cursor: loading || authLoading ? "not-allowed" : "pointer",
              opacity: loading || authLoading ? 0.6 : 1,
              transition: "all 0.2s ease",
              minWidth: "200px",
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
            style={{
              backgroundColor: "transparent",
              color: ACCENT_COLOR,
              border: `2px solid ${ACCENT_COLOR}`,
              padding: "12px 24px",
              borderRadius: "8px",
              fontFamily: BodyFont,
              fontSize: "1rem",
              cursor: loading || authLoading ? "not-allowed" : "pointer",
              opacity: loading || authLoading ? 0.6 : 1,
              transition: "all 0.2s ease",
              minWidth: "200px",
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
              style={{
                color: "#ef4444",
                fontFamily: BodyFont,
                fontSize: "0.9rem",
                textAlign: "center",
                marginTop: "10px",
              }}
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
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          padding: "20px",
          backgroundColor: PANELFILL,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            alignItems: "center",
            maxWidth: "300px",
            width: "100%",
          }}
        >
          <button
            onClick={leaveLobby}
            style={{
              alignSelf: "flex-start",
              backgroundColor: "transparent",
              border: "none",
              color: SECONDARY_TEXT,
              fontFamily: BodyFont,
              fontSize: "0.9rem",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
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

          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <h3
              style={{
                fontFamily: HeaderFont,
                color: FONTCOLOR,
                fontSize: "1.5rem",
                marginBottom: "8px",
              }}
            >
              Join Lobby
            </h3>
            <p
              style={{
                fontFamily: BodyFont,
                color: SECONDARY_TEXT,
                fontSize: "0.9rem",
              }}
            >
              Enter the lobby code to join your study session
            </p>
          </div>

          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="Enter lobby code"
            style={{
              width: "100%",
              padding: "12px",
              border: `2px solid ${BORDERLINE}`,
              borderRadius: "8px",
              fontFamily: BodyFont,
              fontSize: "1rem",
              backgroundColor: "white",
              color: FONTCOLOR,
              outline: "none",
              transition: "border-color 0.2s ease",
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
            style={{
              backgroundColor: ACCENT_COLOR,
              color: "white",
              border: "none",
              padding: "12px 24px",
              borderRadius: "8px",
              fontFamily: BodyFont,
              fontSize: "1rem",
              cursor: loading || !joinCode.trim() ? "not-allowed" : "pointer",
              opacity: loading || !joinCode.trim() ? 0.6 : 1,
              transition: "all 0.2s ease",
              width: "100%",
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
              style={{
                color: "#ef4444",
                fontFamily: BodyFont,
                fontSize: "0.9rem",
                textAlign: "center",
                marginTop: "10px",
              }}
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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: PANELFILL,
        padding: "20px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          paddingBottom: "16px",
          borderBottom: `2px solid ${BORDERLINE}`,
        }}
      >
        <div>
          <h3
            style={{
              fontFamily: HeaderFont,
              color: FONTCOLOR,
              fontSize: "1.5rem",
              marginBottom: "4px",
            }}
          >
            {lobbyState === "hosting" ? "Hosting Lobby" : "Joined Lobby"}
          </h3>
          <p
            style={{
              fontFamily: BodyFont,
              color: SECONDARY_TEXT,
              fontSize: "0.9rem",
            }}
          >
            Code: <span style={{ fontWeight: "bold", color: ACCENT_COLOR }}>{lobbyData?.code}</span>
          </p>
          {/* Connection status - show error or reconnecting status */}
          {(connectionError || !isConnected) && (
            <div style={{ marginTop: "8px" }}>
              <div
                style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}
              >
                <div
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor: connectionError ? "#ef4444" : "#f59e0b",
                  }}
                />
                <span
                  style={{
                    fontFamily: BodyFont,
                    color: connectionError ? "#ef4444" : "#f59e0b",
                    fontSize: "0.7rem",
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
                  style={{
                    backgroundColor: ACCENT_COLOR,
                    color: "white",
                    border: "none",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontFamily: BodyFont,
                    fontSize: "0.7rem",
                    cursor: "pointer",
                    marginTop: "4px",
                  }}
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
            style={{
              backgroundColor: "#ef4444",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "6px",
              fontFamily: BodyFont,
              fontSize: "0.9rem",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
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
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={refreshLobby}
              disabled={loading || authLoading}
              style={{
                backgroundColor: "transparent",
                color: ACCENT_COLOR,
                border: `1px solid ${ACCENT_COLOR}`,
                padding: "8px 16px",
                borderRadius: "6px",
                fontFamily: BodyFont,
                fontSize: "0.9rem",
                cursor: loading || authLoading ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
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
              style={{
                backgroundColor: "transparent",
                color: SECONDARY_TEXT,
                border: `1px solid ${BORDERLINE}`,
                padding: "8px 16px",
                borderRadius: "6px",
                fontFamily: BodyFont,
                fontSize: "0.9rem",
                cursor: loading || authLoading ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
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
      <div style={{ flex: 1, overflow: "auto" }}>
        <h4
          style={{
            fontFamily: HeaderFont,
            color: FONTCOLOR,
            fontSize: "1.1rem",
            marginBottom: "12px",
          }}
        >
          Online Users ({lobbyData?.users?.length || 0})
        </h4>

        {lobbyData?.users && lobbyData.users.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {lobbyData.users.map((userId) => (
              <div
                key={userId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px",
                  backgroundColor: "white",
                  borderRadius: "8px",
                  border: `1px solid ${BORDERLINE}`,
                }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: "#10b981",
                  }}
                />
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      fontFamily: BodyFont,
                      color: FONTCOLOR,
                      fontSize: "0.95rem",
                      margin: 0,
                    }}
                  >
                    {userId}
                    {lobbyData.host === userId && (
                      <span
                        style={{
                          marginLeft: "8px",
                          fontSize: "0.8rem",
                          color: ACCENT_COLOR,
                          fontWeight: "bold",
                        }}
                      >
                        (Host)
                      </span>
                    )}
                  </p>
                  <p
                    style={{
                      fontFamily: BodyFont,
                      color: SECONDARY_TEXT,
                      fontSize: "0.8rem",
                      margin: 0,
                    }}
                  >
                    Online
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: "40px 20px",
              color: SECONDARY_TEXT,
              fontFamily: BodyFont,
            }}
          >
            <i
              className="fi fi-rr-users"
              style={{
                fontSize: "3rem",
                marginBottom: "16px",
                display: "block",
              }}
            />
            <p>Waiting for users to join...</p>
          </div>
        )}
      </div>
    </div>
  );
}
