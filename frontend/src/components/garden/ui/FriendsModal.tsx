import React, { useState, useEffect } from "react";
import { BaseModal } from "../../common";
import { useCachedUserFriends, useCacheActions } from "@/hooks/useCachedData";
import { FaUserFriends } from "react-icons/fa";
import type { Friend } from "@/utils/cacheManager";

interface FriendsModalProps {
  isVisible: boolean;
  onClose: () => void;
  userId: string;
}

export default function FriendsModal({ isVisible, onClose, userId }: FriendsModalProps) {
  // Use cached friends data
  const {
    friends,
    loading: friendsLoading,
    error: friendsError,
    refresh: refreshFriends,
  } = useCachedUserFriends(userId);
  const { invalidateFriends } = useCacheActions(userId);

  const [newFriendId, setNewFriendId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

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
    if (friendsError) {
      showMessage(friendsError, "error");
    }
  }, [friendsError]);

  // Add friend
  const addFriend = async () => {
    if (!newFriendId.trim()) {
      showMessage("Please enter a friend ID", "error");
      return;
    }

    if (newFriendId.trim() === userId) {
      showMessage("You cannot add yourself as a friend", "error");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/friends/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          friend_id: newFriendId.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        showMessage("Friend added successfully!", "success");
        setNewFriendId("");
        // Invalidate cache and refresh friends
        invalidateFriends();
        refreshFriends();
      } else {
        showMessage(data.message || "Failed to add friend", "error");
      }
    } catch (error) {
      console.error("Error adding friend:", error);
      showMessage("Failed to add friend", "error");
    } finally {
      setLoading(false);
    }
  };

  // Remove friend
  const removeFriend = async (friendId: string) => {
    setLoading(true);
    try {
      const response = await fetch("/api/friends/remove", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          friend_id: friendId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showMessage("Friend removed successfully!", "success");
        // Invalidate cache and refresh friends
        invalidateFriends();
        refreshFriends();
      } else {
        showMessage(data.message || "Failed to remove friend", "error");
      }
    } catch (error) {
      console.error("Error removing friend:", error);
      showMessage("Failed to remove friend", "error");
    } finally {
      setLoading(false);
    }
  };

  // Friends data is automatically loaded by the hook
  // No need for manual fetchFriends call

  return (
    <BaseModal
      isVisible={isVisible}
      onClose={onClose}
      title="Friends List"
      icon={<FaUserFriends />}
      width="650px"
      maxHeight="700px"
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

      {/* Add Friend Section */}
      <div className="p-5 border-b-2 border-[#a0622d] bg-[#e4be93ff]">
        <h3 className="text-[#2c1810] m-0 mb-4 text-base">Add Friend</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={newFriendId}
            onChange={(e) => setNewFriendId(e.target.value)}
            placeholder="Enter friend's User ID"
            className="flex-1 px-3 py-2 border-2 border-[#a0622d] rounded bg-[#fdf4e8] text-[#2c1810] text-sm outline-none focus:ring-2 focus:ring-[#a0622d] focus:ring-offset-2"
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                addFriend();
              }
            }}
          />
          <button
            onClick={addFriend}
            disabled={loading}
            className="px-4 py-2 border-2 border-[#a0622d] rounded bg-[#a0622d] text-[#2c1810] cursor-pointer text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50 hover:bg-[#8a5425] transition-colors"
          >
            {loading ? "..." : "Add"}
          </button>
        </div>
      </div>

      {/* Friends List */}
      <div className="p-5">
        <h3 className="text-[#2c1810] m-0 mb-4 text-base">
          Your Friends ({friends.length})
          {friendsLoading && (
            <span className="text-xs text-gray-500 ml-2">
              Refreshing...
            </span>
          )}
        </h3>

        {friendsLoading && friends.length === 0 ? (
          <div className="text-center text-[#2c1810] text-sm opacity-70 py-10 px-5">
            Loading your friends...
          </div>
        ) : friends.length === 0 ? (
          <div className="text-center text-[#2c1810] text-sm opacity-70 py-10 px-5">
            No friends added yet. Share your User ID with friends to get started!
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {friends.map((friend, index) => (
              <div
                key={friend.friend_id || `friend-${index}`}
                className="flex items-center justify-between p-3 bg-[#e4be93ff] border border-[#a0622d] rounded"
              >
                <div>
                  <div className="text-[#2c1810] text-sm font-bold">
                    {/* {friend.display_name || friend.friend_id} */}
                    Display Name: {friend.display_name}
                  </div>
                  <div className="text-[#2c1810] text-xs opacity-70 font-mono">
                    ID: {friend.friend_id}
                  </div>
                </div>
                <button
                  onClick={() => removeFriend(friend.friend_id)}
                  disabled={loading}
                  className="px-3 py-1.5 border border-[#f44336] rounded bg-[#f44336] text-white cursor-pointer text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50 hover:bg-[#d32f2f] transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </BaseModal>
  );
}
