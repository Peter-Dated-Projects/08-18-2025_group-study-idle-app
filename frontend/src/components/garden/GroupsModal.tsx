import React, { useState, useEffect } from "react";
import { FONTCOLOR, BORDERLINE, PANELFILL, BORDERFILL } from "../constants";
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

interface GroupsModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function GroupsModal({ isVisible, onClose }: GroupsModalProps) {
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

  const showMessage = (msg: string, type: "success" | "error") => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage("");
      setMessageType("");
    }, 3000);
  };

  // Fetch user's groups
  const fetchGroups = async () => {
    if (!user?.userId) return;

    try {
      const response = await fetch(`/api/groups/user/${user.userId}`);
      const data = await response.json();

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
        fetchUserStats();
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
        fetchUserStats();
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
        fetchUserStats();
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

  useEffect(() => {
    if (isVisible && user?.userId) {
      fetchGroups();
      fetchUserStats();
    }
  }, [isVisible, user?.userId]);

  if (!isVisible) return null;

  if (!user) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}
        onClick={onClose}
      >
        <div style={{ padding: "20px", textAlign: "center", color: FONTCOLOR }}>
          Please log in to access groups.
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: PANELFILL,
          border: `3px solid ${BORDERLINE}`,
          borderRadius: "8px",
          width: "600px",
          maxWidth: "90vw",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            backgroundColor: BORDERFILL,
            borderBottom: `2px solid ${BORDERLINE}`,
            padding: "15px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2 style={{ color: FONTCOLOR, margin: 0, fontSize: "18px", fontWeight: "bold" }}>
            Groups
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: FONTCOLOR,
              fontSize: "20px",
              cursor: "pointer",
              padding: "5px",
              borderRadius: "4px",
              backgroundColor: BORDERLINE,
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            padding: "20px",
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "15px",
          }}
        >
          {/* Message Display */}
          {message && (
            <div
              style={{
                padding: "8px 12px",
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

          {/* User Stats */}
          {userStats && (
            <div
              style={{
                padding: "12px",
                backgroundColor: BORDERFILL,
                border: `1px solid ${BORDERLINE}`,
                borderRadius: "6px",
                color: FONTCOLOR,
                fontSize: "14px",
              }}
            >
              <strong>Groups: {userStats.group_count}/5</strong> (Maximum 5 groups per user)
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              disabled={loading || (userStats ? parseInt(userStats.group_count) >= 5 : false)}
              style={{
                flex: 1,
                padding: "10px",
                backgroundColor: (userStats && parseInt(userStats.group_count) >= 5) ? "#666" : "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: (userStats && parseInt(userStats.group_count) >= 5) ? "not-allowed" : "pointer",
                fontSize: "12px",
                fontWeight: "bold",
              }}
            >
              {showCreateForm ? "Cancel" : "Create Group"}
            </button>

            <button
              onClick={() => setShowJoinForm(!showJoinForm)}
              disabled={loading || (userStats ? parseInt(userStats.group_count) >= 5 : false)}
              style={{
                flex: 1,
                padding: "10px",
                backgroundColor: (userStats && parseInt(userStats.group_count) >= 5) ? "#666" : "#2196F3",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: (userStats && parseInt(userStats.group_count) >= 5) ? "not-allowed" : "pointer",
                fontSize: "12px",
                fontWeight: "bold",
              }}
            >
              {showJoinForm ? "Cancel" : "Join Group"}
            </button>
          </div>

          {/* Create Group Form */}
          {showCreateForm && (
            <div
              style={{
                padding: "15px",
                backgroundColor: BORDERFILL,
                border: `1px solid ${BORDERLINE}`,
                borderRadius: "6px",
              }}
            >
              <h3 style={{ margin: "0 0 10px 0", color: FONTCOLOR, fontSize: "14px" }}>
                Create New Group
              </h3>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Enter group name"
                style={{
                  width: "100%",
                  padding: "8px",
                  border: `1px solid ${BORDERLINE}`,
                  borderRadius: "4px",
                  backgroundColor: PANELFILL,
                  color: FONTCOLOR,
                  fontSize: "12px",
                  marginBottom: "10px",
                }}
              />
              <button
                onClick={createGroup}
                disabled={loading || !newGroupName.trim()}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#4CAF50",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: "12px",
                  fontWeight: "bold",
                }}
              >
                {loading ? "Creating..." : "Create"}
              </button>
            </div>
          )}

          {/* Join Group Form */}
          {showJoinForm && (
            <div
              style={{
                padding: "15px",
                backgroundColor: BORDERFILL,
                border: `1px solid ${BORDERLINE}`,
                borderRadius: "6px",
              }}
            >
              <h3 style={{ margin: "0 0 10px 0", color: FONTCOLOR, fontSize: "14px" }}>
                Join Existing Group
              </h3>
              <input
                type="text"
                value={joinGroupId}
                onChange={(e) => setJoinGroupId(e.target.value)}
                placeholder="Enter 16-character group ID"
                style={{
                  width: "100%",
                  padding: "8px",
                  border: `1px solid ${BORDERLINE}`,
                  borderRadius: "4px",
                  backgroundColor: PANELFILL,
                  color: FONTCOLOR,
                  fontSize: "12px",
                  marginBottom: "10px",
                }}
              />
              <button
                onClick={joinGroup}
                disabled={loading || !joinGroupId.trim()}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#2196F3",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: "12px",
                  fontWeight: "bold",
                }}
              >
                {loading ? "Joining..." : "Join"}
              </button>
            </div>
          )}

          {/* Groups List */}
          <div>
            <h3 style={{ margin: "0 0 15px 0", color: FONTCOLOR, fontSize: "16px" }}>
              Your Groups ({groups.length})
            </h3>

            {groups.length === 0 ? (
              <div
                style={{
                  padding: "20px",
                  textAlign: "center",
                  color: FONTCOLOR,
                  backgroundColor: BORDERFILL,
                  border: `1px solid ${BORDERLINE}`,
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
              >
                You haven't joined any groups yet. Create or join a group to get started!
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
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
                      <h4 style={{ margin: 0, color: FONTCOLOR, fontSize: "14px", fontWeight: "bold" }}>
                        {group.group_name}
                      </h4>
                      {group.creator_id === user.userId && (
                        <span
                          style={{
                            fontSize: "10px",
                            backgroundColor: "#4CAF50",
                            color: "white",
                            padding: "2px 6px",
                            borderRadius: "3px",
                            fontWeight: "bold",
                          }}
                        >
                          Leader
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: "11px", color: FONTCOLOR, marginBottom: "8px" }}>
                      <div><strong>Group ID:</strong> {group.id}</div>
                      <div><strong>Members:</strong> {group.member_ids.length}</div>
                      <div><strong>Created:</strong> {new Date(group.created_at).toLocaleDateString()}</div>
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => navigator.clipboard.writeText(group.id)}
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
      </div>
    </div>
  );
}
