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

interface User {
  id: string;
  name: string;
  joinedAt: string;
}

interface LobbyData {
  code: string;
  host: string;
  users: User[];
  createdAt: string;
}

type LobbyState = "empty" | "hosting" | "joined" | "join";

export default function Lobby() {
  const [lobbyState, setLobbyState] = useState<LobbyState>("empty");
  const [lobbyData, setLobbyData] = useState<LobbyData | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const cloudRunUrl = process.env.GOOGLE_CLOUD_RUN_URL || "localhost:5000";

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
      if (lobbyState === "hosting" && lobbyData) {
        closeLobby();
      }
    };
  }, [lobbyState, lobbyData]);

  const createLobby = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`http://${cloudRunUrl}/api/hosting/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hostName: "Current User", // TODO: Replace with actual user name from auth
        }),
      });

      if (response.status === 200) {
        const data = await response.json();
        setLobbyData(data);
        setLobbyState("hosting");
      } else {
        setError("Failed to create lobby. Please try again.");
      }
    } catch (err) {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const joinLobby = async () => {
    if (!joinCode.trim()) {
      setError("Please enter a lobby code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`http://${cloudRunUrl}/api/hosting/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: joinCode.trim(),
          userName: "Current User", // TODO: Replace with actual user name from auth
        }),
      });

      if (response.status === 200) {
        const data = await response.json();
        setLobbyData(data);
        setLobbyState("joined");
      } else {
        setError("Failed to join lobby. Please check the code and try again.");
      }
    } catch (err) {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const closeLobby = async () => {
    if (!lobbyData) return;

    try {
      await fetch(`http://${cloudRunUrl}/api/hosting/close`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: lobbyData.code,
        }),
      });
    } catch (err) {
      console.error("Error closing lobby:", err);
    }

    setLobbyData(null);
    setLobbyState("empty");
  };

  const leaveLobby = () => {
    setLobbyData(null);
    setLobbyState("empty");
    setJoinCode("");
    setError("");
  };

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
            disabled={loading}
            style={{
              backgroundColor: ACCENT_COLOR,
              color: "white",
              border: "none",
              padding: "12px 24px",
              borderRadius: "8px",
              fontFamily: BodyFont,
              fontSize: "1rem",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              transition: "all 0.2s ease",
              minWidth: "200px",
            }}
            onMouseEnter={(e) => {
              if (!loading) {
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
            {loading ? "Creating..." : "Create Lobby"}
          </button>

          <button
            onClick={() => setLobbyState("join")}
            disabled={loading}
            style={{
              backgroundColor: "transparent",
              color: ACCENT_COLOR,
              border: `2px solid ${ACCENT_COLOR}`,
              padding: "12px 24px",
              borderRadius: "8px",
              fontFamily: BodyFont,
              fontSize: "1rem",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
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
          <button
            onClick={leaveLobby}
            style={{
              backgroundColor: "transparent",
              color: SECONDARY_TEXT,
              border: `1px solid ${BORDERLINE}`,
              padding: "8px 16px",
              borderRadius: "6px",
              fontFamily: BodyFont,
              fontSize: "0.9rem",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = BORDERLINE;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            Leave Lobby
          </button>
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
            {lobbyData.users.map((user) => (
              <div
                key={user.id}
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
                    {user.name}
                    {lobbyData.host === user.id && (
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
                    Joined {new Date(user.joinedAt).toLocaleTimeString()}
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
