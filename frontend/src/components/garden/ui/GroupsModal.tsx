import React, { useState, useEffect } from "react";
import { BaseModal } from "../../common";
import { FONTCOLOR, BORDERLINE, PANELFILL, BORDERFILL } from "../../constants";
import { useSessionAuth } from "@/hooks/useSessionAuth";
import { useCachedUserGroups, useCacheActions } from "@/hooks/useCachedData";
import { useUsersInfo } from "@/utils/userInfo";
import type { Group } from "@/utils/cacheManager";

interface GroupsModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function GroupsModal({ isVisible, onClose }: GroupsModalProps) {
  const { user } = useSessionAuth();

  // Use cached groups data
  const {
    groups,
    loading: groupsLoading,
    error: groupsError,
    refresh: refreshGroups,
  } = useCachedUserGroups(user?.userId || null);
  const { invalidateGroups } = useCacheActions(user?.userId || null);

  // Get all member IDs from all groups for batch user info fetching
  const allMemberIds = React.useMemo(() => {
    const memberSet = new Set<string>();
    groups.forEach((group) => {
      group.member_ids.forEach((memberId) => memberSet.add(memberId));
    });
    return Array.from(memberSet);
  }, [groups]);

  // Fetch user information for all members
  const { loading: usersLoading, getDisplayName } = useUsersInfo(allMemberIds);

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

  // Display cached data loading error if present
  useEffect(() => {
    if (groupsError) {
      showMessage(groupsError, "error");
    }
  }, [groupsError]);

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
        // Invalidate cache and refresh groups
        invalidateGroups();
        refreshGroups();
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
        // Invalidate cache and refresh groups
        invalidateGroups();
        refreshGroups();
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
        // Invalidate cache and refresh groups
        invalidateGroups();
        refreshGroups();
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

  // Groups data is automatically loaded by the hook
  // No need for manual fetchGroups call

  if (!isVisible) return null;

  if (!user) {
    return (
      <BaseModal
        isVisible={isVisible}
        onClose={onClose}
        title="👥 Groups"
        width="650px"
        maxHeight="700px"
        constrainToCanvas={true}
        zIndex={2000}
      >
        <div style={{ padding: "20px", textAlign: "center", color: FONTCOLOR }}>
          Please log in to access groups.
        </div>
      </BaseModal>
    );
  }

  return (
    <BaseModal
      isVisible={isVisible}
      onClose={onClose}
      title="👥 Groups"
      width="650px"
      maxHeight="700px"
      constrainToCanvas={true}
      zIndex={2000}
    >
      {/* Message Display */}
      {message && (
        <div
          style={{
            padding: "8px 12px",
            backgroundColor: messageType === "success" ? "#4CAF50" : "#f44336",
            color: "white",
            fontSize: "12px",
            textAlign: "center",
          }}
        >
          {message}
        </div>
      )}

      <div
        style={{
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "15px",
        }}
      >
        {/* Group Count Display */}
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
          <strong>Groups: {groups.length}/5</strong> (Maximum 5 groups per user)
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => {
              if (showCreateForm) {
                setShowCreateForm(false);
              } else {
                setShowCreateForm(true);
                setShowJoinForm(false); // Close join form if open
              }
            }}
            disabled={loading || groups.length >= 5}
            style={{
              flex: 1,
              padding: "10px",
              backgroundColor: groups.length >= 5 ? "#666" : "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: groups.length >= 5 ? "not-allowed" : "pointer",
              fontSize: "12px",
              fontWeight: "bold",
            }}
          >
            {showCreateForm ? "Cancel" : "Create Group"}
          </button>

          <button
            onClick={() => {
              if (showJoinForm) {
                setShowJoinForm(false);
              } else {
                setShowJoinForm(true);
                setShowCreateForm(false); // Close create form if open
              }
            }}
            disabled={loading || groups.length >= 5}
            style={{
              flex: 1,
              padding: "10px",
              backgroundColor: groups.length >= 5 ? "#666" : "#2196F3",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: groups.length >= 5 ? "not-allowed" : "pointer",
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
            {groupsLoading && (
              <span style={{ fontSize: "12px", color: "#999", marginLeft: "10px" }}>
                Refreshing...
              </span>
            )}
          </h3>

          {groupsLoading && groups.length === 0 ? (
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
              Loading your groups...
            </div>
          ) : groups.length === 0 ? (
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
                  key={group.group_id}
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
                        margin: 0,
                        color: FONTCOLOR,
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
                    <div key={`${group.group_id}-id`}>
                      <strong>Group ID:</strong> {group.group_id}
                    </div>
                    <div key={`${group.group_id}-members`}>
                      <strong>Members ({group.member_ids.length}):</strong>
                      {usersLoading ? (
                        <span style={{ marginLeft: "5px", opacity: 0.7 }}>Loading names...</span>
                      ) : (
                        <div style={{ marginTop: "4px", marginLeft: "10px" }}>
                          {group.member_ids.slice(0, 5).map((memberId, index) => (
                            <div key={memberId} style={{ marginBottom: "2px" }}>
                              • {getDisplayName(memberId)}
                              {memberId === user?.userId && (
                                <span style={{ color: "#4CAF50", marginLeft: "5px" }}>(You)</span>
                              )}
                            </div>
                          ))}
                          {group.member_ids.length > 5 && (
                            <div style={{ marginTop: "2px", fontStyle: "italic", opacity: 0.7 }}>
                              ... and {group.member_ids.length - 5} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div key={`${group.group_id}-created`}>
                      <strong>Created:</strong> {new Date(group.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => navigator.clipboard.writeText(group.group_id)}
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
                      onClick={() => leaveGroup(group.group_id)}
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
    </BaseModal>
  );
}
