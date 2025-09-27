import React, { useState, useEffect } from "react";
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

  // Use prop values if provided, otherwise use local state
  const lobbyState = propLobbyState !== "empty" ? propLobbyState : localLobbyState;
  const lobbyData = propLobbyData !== null ? propLobbyData : localLobbyData;

  const setLobbyState = (state: LobbyState) => {
    if (onLobbyStateChange) {
      onLobbyStateChange(state);
    } else {
      setLocalLobbyState(state);
      localStorage.setItem(LOBBY_STATE_STORAGE_KEY, state);
    }
  };

  const setLobbyData = (data: LobbyData | null) => {
    if (onLobbyDataChange) {
      onLobbyDataChange(data);
    } else {
      setLocalLobbyData(data);
      if (data) {
        localStorage.setItem(LOBBY_STORAGE_KEY, JSON.stringify(data));
      } else {
        localStorage.removeItem(LOBBY_STORAGE_KEY);
      }
    }
  };

  const { isAuthenticated, isLoading: authLoading } = useSessionAuth();
  const { sendMessage, isConnected } = useWebSocket();
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Load users when lobby data changes
  useEffect(() => {
    if (lobbyData && lobbyData.users.length > 0) {
      setUsersLoading(true);
      fetchUsersInfo(lobbyData.users)
        .then((userInfos) => {
          setUsers(userInfos);
        })
        .catch((error) => {
          console.error("Error fetching user info:", error);
          setUsers([]);
        })
        .finally(() => {
          setUsersLoading(false);
        });
    } else {
      setUsers([]);
    }
  }, [lobbyData]);

  // Create lobby
  const createLobby = async () => {
    if (!isAuthenticated) {
      setError("Please log in to create a lobby");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/lobbies/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      const data = await response.json();

      if (data.success) {
        setLobbyData(data.lobby);
        setLobbyState("hosting");
      } else {
        setError(data.message || "Failed to create lobby");
      }
    } catch (error) {
      console.error("Error creating lobby:", error);
      setError("Failed to create lobby");
    } finally {
      setLoading(false);
    }
  };

  // Join lobby
  const joinLobby = async () => {
    if (!isAuthenticated) {
      setError("Please log in to join a lobby");
      return;
    }

    if (!joinCode.trim()) {
      setError("Please enter a lobby code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/lobbies/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ code: joinCode.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setLobbyData(data.lobby);
        setLobbyState("joined");
        setJoinCode("");
      } else {
        setError(data.message || "Failed to join lobby");
      }
    } catch (error) {
      console.error("Error joining lobby:", error);
      setError("Failed to join lobby");
    } finally {
      setLoading(false);
    }
  };

  // Leave lobby
  const leaveLobby = async () => {
    if (!lobbyData) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/lobbies/leave", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ code: lobbyData.code }),
      });

      const data = await response.json();

      if (data.success) {
        setLobbyData(null);
        setLobbyState("empty");
      } else {
        setError(data.message || "Failed to leave lobby");
      }
    } catch (error) {
      console.error("Error leaving lobby:", error);
      setError("Failed to leave lobby");
    } finally {
      setLoading(false);
    }
  };

  // Go back to empty state
  const goBack = () => {
    // Simply go back to empty state without making any server requests
    // This is used when backing out of the "join" state where no lobby has been joined yet
    setLobbyState("empty");
    setJoinCode("");
    setError("");
  };

  // Show login prompt only if definitely not authenticated (not during loading)
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-5 bg-[#fdf4e8]">
        <div className="flex flex-col gap-4 items-center text-center">
          <h3 className="font-falling-sky text-[#2c1810] text-2xl mb-2">Authentication Required</h3>
          <p className="text-[#7a6b57] text-sm mb-5">
            Please log in to create or join study lobbies
          </p>
          <button
            onClick={() => (window.location.href = "/login")}
            className="bg-[#d4944a] text-white border-none px-6 py-3 rounded-lg text-base cursor-pointer transition-all duration-200 min-w-[200px] hover:-translate-y-0.5 hover:shadow-lg"
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
      <div className="flex flex-col items-center justify-center h-full p-5 bg-[#fdf4e8]">
        <div className="flex flex-col gap-4 items-center">
          <h3 className="font-falling-sky text-[#2c1810] text-xl mb-2">Study Lobby</h3>
          <p className="text-[#7a6b57] text-sm text-center mb-4">
            Create a lobby to study with friends or join an existing one
          </p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={createLobby}
              disabled={loading}
              className="bg-[#5cb370] text-white border-none px-4 py-2 rounded text-sm font-bold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#4a9c5a]"
            >
              {loading ? "Creating..." : "Create Lobby"}
            </button>
            <button
              onClick={() => setLobbyState("join")}
              className="bg-[#d4944a] text-white border-none px-4 py-2 rounded text-sm font-bold cursor-pointer transition-colors hover:bg-[#c4843a]"
            >
              Join Lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Join State
  if (lobbyState === "join") {
    return (
      <div className="flex flex-col items-center justify-center h-full p-5 bg-[#fdf4e8]">
        <div className="flex flex-col gap-4 items-center w-full max-w-xs">
          <h3 className="font-falling-sky text-[#2c1810] text-xl mb-2">Join Lobby</h3>
          <p className="text-[#7a6b57] text-sm text-center mb-4">Enter the lobby code to join</p>
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="Enter lobby code"
            className="w-full px-3 py-2 border-2 border-[#a0622d] rounded bg-white text-[#2c1810] text-sm outline-none focus:ring-2 focus:ring-[#a0622d] focus:ring-offset-2"
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                joinLobby();
              }
            }}
          />
          {error && <div className="text-red-600 text-sm text-center">{error}</div>}
          <div className="flex gap-2 w-full">
            <button
              onClick={joinLobby}
              disabled={loading || !joinCode.trim()}
              className="flex-1 bg-[#5cb370] text-white border-none px-4 py-2 rounded text-sm font-bold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#4a9c5a]"
            >
              {loading ? "Joining..." : "Join"}
            </button>
            <button
              onClick={goBack}
              className="flex-1 bg-[#7a6b57] text-white border-none px-4 py-2 rounded text-sm font-bold cursor-pointer transition-colors hover:bg-[#6a5b47]"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Hosting or Joined State
  if (lobbyState === "hosting" || lobbyState === "joined") {
    return (
      <div className="flex flex-col h-full p-5 bg-[#fdf4e8]">
        <div className="text-center mb-5">
          <h3 className="font-falling-sky text-[#2c1810] text-xl mb-2">
            {lobbyState === "hosting" ? "Hosting Lobby" : "Joined Lobby"}
          </h3>
          <p className="text-[#7a6b57] text-sm">
            Code: <span className="font-mono font-bold text-[#2c1810]">{lobbyData?.code}</span>
          </p>
        </div>

        <div className="flex-1 mb-4">
          <h4 className="text-[#2c1810] text-sm font-bold mb-2">
            Members ({lobbyData?.users.length || 0})
          </h4>
          {usersLoading ? (
            <div className="text-[#7a6b57] text-sm text-center py-4">Loading members...</div>
          ) : users.length === 0 ? (
            <div className="text-[#7a6b57] text-sm text-center py-4">No members yet</div>
          ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.userId}
                  className="flex items-center gap-2 p-2 bg-[#e4be93ff] border border-[#a0622d] rounded"
                >
                  <div className="w-2 h-2 bg-[#5cb370] rounded-full"></div>
                  <span className="text-[#2c1810] text-sm">{getDisplayName(user)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <div className="text-red-600 text-sm text-center mb-4">{error}</div>}

        <button
          onClick={leaveLobby}
          disabled={loading}
          className="w-full bg-[#c85a54] text-white border-none px-4 py-2 rounded text-sm font-bold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#b84a44]"
        >
          {loading ? "Leaving..." : "Leave Lobby"}
        </button>
      </div>
    );
  }

  return null;
}
