import React, { useState, useEffect } from "react";
import { BaseModal } from "../../common";
import { FONTCOLOR, BORDERLINE, PANELFILL, BORDERFILL } from "../../constants";
import { useSessionAuth } from "@/hooks/useSessionAuth";
import { useCachedUserGroups, useCacheActions } from "@/hooks/useCachedData";
import { useUsersInfo } from "@/utils/userInfo";
import { FaUsers } from "react-icons/fa";
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
        title="Groups"
        icon={<FaUsers />}
        width="650px"
        maxHeight="700px"
        constrainToCanvas={true}
        zIndex={2000}
      >
        <div className="p-5 text-center" style={{ color: FONTCOLOR }}>
          Please log in to access groups.
        </div>
      </BaseModal>
    );
  }

  return (
    <BaseModal
      isVisible={isVisible}
      onClose={onClose}
      title="Groups"
      icon={<FaUsers />}
      width="650px"
      maxHeight="700px"
      constrainToCanvas={true}
      zIndex={2000}
    >
      {/* Message Display */}
      {message && (
        <div
          className="py-2 px-3 text-white text-xs text-center"
          style={{ backgroundColor: messageType === "success" ? "#4CAF50" : "#f44336" }}
        >
          {message}
        </div>
      )}

      <div className="p-5 flex flex-col gap-4">
        {/* Group Count Display */}
        <div
          className="p-3 rounded-md text-sm"
          style={{
            backgroundColor: BORDERFILL,
            border: `1px solid ${BORDERLINE}`,
            color: FONTCOLOR,
          }}
        >
          <strong>Groups: {groups.length}/5</strong> (Maximum 5 groups per user)
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2.5">
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
            className="flex-1 p-2.5 text-white border-none rounded text-xs font-bold"
            style={{
              backgroundColor: groups.length >= 5 ? "#666" : "#4CAF50",
              cursor: groups.length >= 5 ? "not-allowed" : "pointer",
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
            className="flex-1 p-2.5 text-white border-none rounded text-xs font-bold"
            style={{
              backgroundColor: groups.length >= 5 ? "#666" : "#2196F3",
              cursor: groups.length >= 5 ? "not-allowed" : "pointer",
            }}
          >
            {showJoinForm ? "Cancel" : "Join Group"}
          </button>
        </div>

        {/* Create Group Form */}
        {showCreateForm && (
          <div
            className="p-4 rounded-md"
            style={{ backgroundColor: BORDERFILL, border: `1px solid ${BORDERLINE}` }}
          >
            <h3 className="m-0 mb-2.5 text-sm" style={{ color: FONTCOLOR }}>
              Create New Group
            </h3>
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Enter group name"
              className="w-full p-2 rounded text-xs mb-2.5"
              style={{
                border: `1px solid ${BORDERLINE}`,
                backgroundColor: PANELFILL,
                color: FONTCOLOR,
              }}
            />
            <button
              onClick={createGroup}
              disabled={loading || !newGroupName.trim()}
              className="py-2 px-4 text-white border-none rounded text-xs font-bold"
              style={{
                backgroundColor: "#4CAF50",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        )}

        {/* Join Group Form */}
        {showJoinForm && (
          <div
            className="p-4 rounded-md"
            style={{ backgroundColor: BORDERFILL, border: `1px solid ${BORDERLINE}` }}
          >
            <h3 className="m-0 mb-2.5 text-sm" style={{ color: FONTCOLOR }}>
              Join Existing Group
            </h3>
            <input
              type="text"
              value={joinGroupId}
              onChange={(e) => setJoinGroupId(e.target.value)}
              placeholder="Enter 16-character group ID"
              className="w-full p-2 rounded text-xs mb-2.5"
              style={{
                border: `1px solid ${BORDERLINE}`,
                backgroundColor: PANELFILL,
                color: FONTCOLOR,
              }}
            />
            <button
              onClick={joinGroup}
              disabled={loading || !joinGroupId.trim()}
              className="py-2 px-4 text-white border-none rounded text-xs font-bold"
              style={{
                backgroundColor: "#2196F3",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Joining..." : "Join"}
            </button>
          </div>
        )}

        {/* Groups List */}
        <div>
          <h3 className="m-0 mb-4 text-base" style={{ color: FONTCOLOR }}>
            Your Groups ({groups.length})
            {groupsLoading && <span className="text-xs text-[#999] ml-2.5">Refreshing...</span>}
          </h3>

          {groupsLoading && groups.length === 0 ? (
            <div
              className="p-5 text-center rounded-md text-xs"
              style={{
                color: FONTCOLOR,
                backgroundColor: BORDERFILL,
                border: `1px solid ${BORDERLINE}`,
              }}
            >
              Loading your groups...
            </div>
          ) : groups.length === 0 ? (
            <div
              className="p-5 text-center rounded-md text-xs"
              style={{
                color: FONTCOLOR,
                backgroundColor: BORDERFILL,
                border: `1px solid ${BORDERLINE}`,
              }}
            >
              You haven&apos;t joined any groups yet. Create or join a group to get started!
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {groups.map((group) => (
                <div
                  key={group.group_id}
                  className="p-3 rounded-md"
                  style={{ backgroundColor: BORDERFILL, border: `1px solid ${BORDERLINE}` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="m-0 text-sm font-bold" style={{ color: FONTCOLOR }}>
                      {group.group_name}
                    </h4>
                    {group.creator_id === user.userId && (
                      <span
                        className="text-[10px] text-white py-0.5 px-1.5 rounded-sm font-bold"
                        style={{ backgroundColor: "#4CAF50" }}
                      >
                        Leader
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] mb-2" style={{ color: FONTCOLOR }}>
                    <div key={`${group.group_id}-id`}>
                      <strong>Group ID:</strong> {group.group_id}
                    </div>
                    <div key={`${group.group_id}-members`}>
                      <strong>Members ({group.member_ids.length}):</strong>
                      {usersLoading ? (
                        <span className="ml-1.5 opacity-70">Loading names...</span>
                      ) : (
                        <div className="mt-1 ml-2.5">
                          {group.member_ids.slice(0, 5).map((memberId, index) => (
                            <div key={memberId} className="mb-0.5">
                              • {getDisplayName(memberId)}
                              {memberId === user?.userId && (
                                <span className="ml-1.5" style={{ color: "#4CAF50" }}>
                                  (You)
                                </span>
                              )}
                            </div>
                          ))}
                          {group.member_ids.length > 5 && (
                            <div className="mt-0.5 italic opacity-70">
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

                  <div className="flex gap-2">
                    <button
                      onClick={() => navigator.clipboard.writeText(group.group_id)}
                      className="flex-1 py-1.5 px-2 rounded cursor-pointer text-[11px] font-bold"
                      style={{
                        border: `1px solid ${BORDERLINE}`,
                        backgroundColor: PANELFILL,
                        color: FONTCOLOR,
                      }}
                    >
                      Copy ID
                    </button>

                    <button
                      onClick={() => leaveGroup(group.group_id)}
                      disabled={loading}
                      className="flex-1 py-1.5 px-2 rounded text-white text-[11px] font-bold"
                      style={{
                        border: `1px solid #f44336`,
                        backgroundColor: "#f44336",
                        cursor: loading ? "not-allowed" : "pointer",
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
