import React, { useState, useEffect } from "react";
import { BaseModal } from "../../common";
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
        showMessage("Group joined successfully!", "success");
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
        showMessage("Group left successfully!", "success");
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

  return (
    <BaseModal
      isVisible={isVisible}
      onClose={onClose}
      title="Study Groups"
      icon={<FaUsers />}
      width="700px"
      maxHeight="600px"
      constrainToCanvas={true}
      zIndex={2000}
    >
      {/* Message Display */}
      {message && (
        <div
          className={`px-5 py-3 text-white text-sm text-center ${
            messageType === "success" ? "bg-[#4CAF50]" : "bg-[#f44336]"
          }`}
        >
          {message}
        </div>
      )}

      <div className="p-5">
        {/* Loading State */}
        {groupsLoading ? (
          <div className="text-center text-[#2c1810] py-10">Loading your groups...</div>
        ) : groups.length === 0 ? (
          <div className="text-center text-[#2c1810] py-10">
            <p className="mb-4">You haven&apos;t joined any groups yet.</p>
            <p className="text-sm text-[#7a6b57]">
              Create a group or join an existing one to get started!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Groups List */}
            {groups.map((group) => (
              <div
                key={group.group_id}
                className="p-4 bg-[#e4be93ff] border-2 border-[#a0622d] rounded-lg"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[#2c1810] text-lg font-bold m-0">{group.group_name}</h3>
                  <button
                    onClick={() => leaveGroup(group.group_id)}
                    disabled={loading}
                    className="bg-[#c85a54] text-white border-none px-3 py-1 rounded text-sm font-bold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#b84a44]"
                  >
                    Leave
                  </button>
                </div>

                <div className="text-[#7a6b57] text-sm mb-3">
                  Group ID:{" "}
                  <span className="font-mono font-bold text-[#2c1810]">{group.group_id}</span>
                </div>

                <div className="text-[#2c1810] text-sm font-bold mb-2">
                  Members ({group.member_ids.length})
                </div>

                {usersLoading ? (
                  <div className="text-[#7a6b57] text-sm">Loading members...</div>
                ) : (
                  <div className="space-y-1">
                    {group.member_ids.map((memberId) => (
                      <div
                        key={memberId}
                        className="flex items-center gap-2 p-2 bg-[#fdf4e8] border border-[#a0622d] rounded"
                      >
                        <div className="w-2 h-2 bg-[#5cb370] rounded-full"></div>
                        <span className="text-[#2c1810] text-sm">{getDisplayName(memberId)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 mt-6">
          <button
            onClick={() => setShowCreateForm(true)}
            disabled={loading}
            className="flex-1 bg-[#5cb370] text-white border-none px-4 py-2 rounded text-sm font-bold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#4a9c5a]"
          >
            Create Group
          </button>
          <button
            onClick={() => setShowJoinForm(true)}
            disabled={loading}
            className="flex-1 bg-[#d4944a] text-white border-none px-4 py-2 rounded text-sm font-bold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#c4843a]"
          >
            Join Group
          </button>
        </div>

        {/* Create Group Form */}
        {showCreateForm && (
          <div className="mt-4 p-4 bg-[#e4be93ff] border-2 border-[#a0622d] rounded-lg">
            <h3 className="text-[#2c1810] text-sm font-bold mb-2">Create New Group</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Enter group name"
                className="flex-1 px-3 py-2 border-2 border-[#a0622d] rounded bg-[#fdf4e8] text-[#2c1810] text-sm outline-none focus:ring-2 focus:ring-[#a0622d] focus:ring-offset-2"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    createGroup();
                  }
                }}
              />
              <button
                onClick={createGroup}
                disabled={loading || !newGroupName.trim()}
                className="bg-[#5cb370] text-white border-none px-4 py-2 rounded text-sm font-bold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#4a9c5a]"
              >
                {loading ? "Creating..." : "Create"}
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="bg-[#7a6b57] text-white border-none px-4 py-2 rounded text-sm font-bold cursor-pointer transition-colors hover:bg-[#6a5b47]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Join Group Form */}
        {showJoinForm && (
          <div className="mt-4 p-4 bg-[#e4be93ff] border-2 border-[#a0622d] rounded-lg">
            <h3 className="text-[#2c1810] text-sm font-bold mb-2">Join Group</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={joinGroupId}
                onChange={(e) => setJoinGroupId(e.target.value)}
                placeholder="Enter group ID"
                className="flex-1 px-3 py-2 border-2 border-[#a0622d] rounded bg-[#fdf4e8] text-[#2c1810] text-sm outline-none focus:ring-2 focus:ring-[#a0622d] focus:ring-offset-2"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    joinGroup();
                  }
                }}
              />
              <button
                onClick={joinGroup}
                disabled={loading || !joinGroupId.trim()}
                className="bg-[#d4944a] text-white border-none px-4 py-2 rounded text-sm font-bold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#c4843a]"
              >
                {loading ? "Joining..." : "Join"}
              </button>
              <button
                onClick={() => setShowJoinForm(false)}
                className="bg-[#7a6b57] text-white border-none px-4 py-2 rounded text-sm font-bold cursor-pointer transition-colors hover:bg-[#6a5b47]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </BaseModal>
  );
}
