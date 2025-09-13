import React, { useState, useEffect } from "react";
import { FONTCOLOR, BORDERLINE, PANELFILL, BORDERFILL } from "../../constants";
import { useSessionAuth } from "@/hooks/useSessionAuth";

interface Group {
  id: string;
  creator_id: string;
  member_ids: string[];
  group_name: string;
  created_at: string;
  updated_at: string;
}

interface UserStats {
  user_id: string;
  group_count: string;
  group_ids: string[];
  friend_count: string;
  pomo_count: string;
}

interface GroupsProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function Groups({ isVisible, onClose }: GroupsProps) {
  const { user } = useSessionAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  // Create group form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  // Join group form
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinGroupId, setJoinGroupId] = useState("");

  // Fetch user's groups
  const fetchGroups = async () => {
    if (!user?.userId) return;

    try {
      const response = await fetch(`/api/groups/user/${user.userId}`);
      const data = await response.json();

      console.log(data);

      if (data.success) {
        setGroups(data.groups);
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
      showMessage("Failed to load groups", "error");
    }
  };

  // Fetch user stats
  const fetchUserStats = async () => {
    if (!user?.userId) return;

    try {
      const response = await fetch(`/api/user-stats/${user.userId}`);
      const data = await response.json();

      if (data.success && data.stats) {
        setUserStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching user stats:", error);
    }
  };

  // Create group
  const createGroup = async () => {
    if (!user?.userId || !newGroupName.trim()) {
      showMessage("Please enter a group name", "error");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/groups/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          creator_id: user.userId,
          group_name: newGroupName.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        showMessage("Group created successfully!", "success");
        setNewGroupName("");
        setShowCreateForm(false);
        fetchGroups();
        fetchUserStats(); // Refresh user stats
      } else {
        showMessage(data.message || "Failed to create group", "error");
      }
    } catch (error) {
      console.error("Error creating group:", error);
      showMessage("Failed to create group", "error");
    } finally {
      setLoading(false);
    }
  };

  // Join group
  const joinGroup = async () => {
    if (!user?.userId || !joinGroupId.trim()) {
      showMessage("Please enter a group ID", "error");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/groups/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.userId,
          group_id: joinGroupId.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        showMessage("Joined group successfully!", "success");
        setJoinGroupId("");
        setShowJoinForm(false);
        fetchGroups();
        fetchUserStats(); // Refresh user stats
      } else {
        showMessage(data.message || "Failed to join group", "error");
      }
    } catch (error) {
      console.error("Error joining group:", error);
      showMessage("Failed to join group", "error");
    } finally {
      setLoading(false);
    }
  };

  // Leave group
  const leaveGroup = async (groupId: string) => {
    if (!user?.userId) return;

    setLoading(true);
    try {
      const response = await fetch("/api/groups/leave", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.userId,
          group_id: groupId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showMessage("Left group successfully!", "success");
        fetchGroups();
        fetchUserStats(); // Refresh user stats
      } else {
        showMessage(data.message || "Failed to leave group", "error");
      }
    } catch (error) {
      console.error("Error leaving group:", error);
      showMessage("Failed to leave group", "error");
    } finally {
      setLoading(false);
    }
  };

  // Copy group ID to clipboard
  const copyGroupId = async (groupId: string) => {
    try {
      await navigator.clipboard.writeText(groupId);
      showMessage("Group ID copied to clipboard!", "success");
    } catch (error) {
      console.error("Failed to copy group ID:", error);
      showMessage("Failed to copy group ID", "error");
    }
  };

  const showMessage = (msg: string, type: "success" | "error") => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage("");
      setMessageType("");
    }, 3000);
  };

  useEffect(() => {
    if (isVisible) {
      fetchGroups();
      fetchUserStats();
    }
  }, [isVisible, user?.userId]);

  if (!isVisible) return null;

  if (!user) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: FONTCOLOR }}>
        Please log in to access groups.
      </div>
    );
  }

  return (
    <>
      {/* Modal Backdrop */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "600px",
          maxWidth: "90vw",
          height: "80vh",
          backgroundColor: PANELFILL,
          border: `3px solid ${BORDERLINE}`,
          borderRadius: "12px",
          zIndex: 1001,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "15px 20px",
            borderBottom: `2px solid ${BORDERLINE}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: BORDERFILL,
          }}
        >
          <h2 style={{ margin: 0, color: FONTCOLOR, fontSize: "18px" }}>
            Groups
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: FONTCOLOR,
              fontSize: "24px",
              cursor: "pointer",
              padding: "0",
              width: "30px",
              height: "30px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>

        {/* Content Container */}
        <div
          style={{
            padding: "15px",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            backgroundColor: PANELFILL,
            overflowY: "auto",
          }}
        >
      {/* Message Display */}
      {message && (
        <div
          style={{
            padding: "8px 12px",
            marginBottom: "15px",
            backgroundColor: messageType === "success" ? "#4CAF50" : "#f44336",
            color: "white",
            fontSize: "12px",
            borderRadius: "4px",
            textAlign: "center",
          }}
        >
          {message}
        </div>
      )}

      {/* Group Limit Info */}
      {userStats && (
        <div
          style={{
            padding: "8px 12px",
            marginBottom: "15px",
            backgroundColor: BORDERFILL,
            border: `1px solid ${BORDERLINE}`,
            borderRadius: "4px",
            fontSize: "11px",
            color: FONTCOLOR,
            textAlign: "center",
          }}
        >
          Groups: {userStats.group_count}/5 (Maximum 5 groups per user)
        </div>
      )}

      {/* Action Buttons */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "15px",
        }}
      >
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{
            flex: 1,
            padding: "8px 12px",
            border: `2px solid ${BORDERLINE}`,
            borderRadius: "4px",
            backgroundColor: showCreateForm ? BORDERLINE : BORDERFILL,
            color: FONTCOLOR,
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "bold",
          }}
        >
          Create Group
        </button>
        <button
          onClick={() => setShowJoinForm(!showJoinForm)}
          style={{
            flex: 1,
            padding: "8px 12px",
            border: `2px solid ${BORDERLINE}`,
            borderRadius: "4px",
            backgroundColor: showJoinForm ? BORDERLINE : BORDERFILL,
            color: FONTCOLOR,
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "bold",
          }}
        >
          Join Group
        </button>
      </div>

      {/* Create Group Form */}
      {showCreateForm && (
        <div
          style={{
            padding: "15px",
            marginBottom: "15px",
            backgroundColor: BORDERFILL,
            border: `1px solid ${BORDERLINE}`,
            borderRadius: "6px",
          }}
        >
          <h4 style={{ color: FONTCOLOR, margin: "0 0 10px 0", fontSize: "14px" }}>
            Create New Group
          </h4>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Group name (max 32 chars)"
              maxLength={32}
              style={{
                flex: 1,
                padding: "6px 8px",
                border: `1px solid ${BORDERLINE}`,
                borderRadius: "4px",
                backgroundColor: PANELFILL,
                color: FONTCOLOR,
                fontSize: "12px",
              }}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  createGroup();
                }
              }}
            />
            <button
              onClick={createGroup}
              disabled={loading}
              style={{
                padding: "6px 12px",
                border: `1px solid ${BORDERLINE}`,
                borderRadius: "4px",
                backgroundColor: BORDERLINE,
                color: FONTCOLOR,
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "12px",
                fontWeight: "bold",
              }}
            >
              {loading ? "..." : "Create"}
            </button>
          </div>
        </div>
      )}

      {/* Join Group Form */}
      {showJoinForm && (
        <div
          style={{
            padding: "15px",
            marginBottom: "15px",
            backgroundColor: BORDERFILL,
            border: `1px solid ${BORDERLINE}`,
            borderRadius: "6px",
          }}
        >
          <h4 style={{ color: FONTCOLOR, margin: "0 0 10px 0", fontSize: "14px" }}>
            Join Existing Group
          </h4>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              value={joinGroupId}
              onChange={(e) => setJoinGroupId(e.target.value)}
              placeholder="Enter group ID"
              style={{
                flex: 1,
                padding: "6px 8px",
                border: `1px solid ${BORDERLINE}`,
                borderRadius: "4px",
                backgroundColor: PANELFILL,
                color: FONTCOLOR,
                fontSize: "12px",
                fontFamily: "monospace",
              }}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  joinGroup();
                }
              }}
            />
            <button
              onClick={joinGroup}
              disabled={loading}
              style={{
                padding: "6px 12px",
                border: `1px solid ${BORDERLINE}`,
                borderRadius: "4px",
                backgroundColor: BORDERLINE,
                color: FONTCOLOR,
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "12px",
                fontWeight: "bold",
              }}
            >
              {loading ? "..." : "Join"}
            </button>
          </div>
        </div>
      )}

      {/* Groups List */}
      <div style={{ flex: 1, overflow: "auto" }}>
        <h3 style={{ color: FONTCOLOR, margin: "0 0 10px 0", fontSize: "14px" }}>
          My Groups ({groups.length})
        </h3>

        {groups.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: FONTCOLOR,
              fontSize: "12px",
              opacity: 0.7,
              padding: "20px",
            }}
          >
            No groups yet. Create a new group or join an existing one!
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {groups.map((group) => (
              <div
                key={group.id}
                style={{
                  padding: "12px",
                  backgroundColor: BORDERFILL,
                  border: `1px solid ${BORDERLINE}`,
                  borderRadius: "6px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <h4
                    style={{
                      color: FONTCOLOR,
                      margin: 0,
                      fontSize: "14px",
                      fontWeight: "bold",
                    }}
                  >
                    {group.group_name}
                  </h4>
                  {group.creator_id === user.userId && (
                    <span
                      style={{
                        fontSize: "10px",
                        color: "#4CAF50",
                        backgroundColor: "rgba(76, 175, 80, 0.1)",
                        padding: "2px 6px",
                        borderRadius: "10px",
                        fontWeight: "bold",
                      }}
                    >
                      CREATOR
                    </span>
                  )}
                </div>

                <div
                  style={{ fontSize: "11px", color: FONTCOLOR, opacity: 0.8, marginBottom: "8px" }}
                >
                  Members: {group.member_ids.length} • ID: {group.id.substring(0, 8)}...
                </div>

                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    onClick={() => copyGroupId(group.id)}
                    style={{
                      flex: 1,
                      padding: "6px 8px",
                      border: `1px solid ${BORDERLINE}`,
                      borderRadius: "4px",
                      backgroundColor: PANELFILL,
                      color: FONTCOLOR,
                      cursor: "pointer",
                      fontSize: "11px",
                      fontWeight: "bold",
                    }}
                  >
                    Copy ID
                  </button>
                  <button
                    onClick={() => leaveGroup(group.id)}
                    disabled={loading}
                    style={{
                      flex: 1,
                      padding: "6px 8px",
                      border: `1px solid #f44336`,
                      borderRadius: "4px",
                      backgroundColor: "#f44336",
                      color: "white",
                      cursor: loading ? "not-allowed" : "pointer",
                      fontSize: "11px",
                      fontWeight: "bold",
                    }}
                  >
                    Leave
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </>
  );
}
