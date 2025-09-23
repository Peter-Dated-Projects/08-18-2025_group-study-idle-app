import React, { useState, useEffect } from "react";
import { BaseModal } from "../../common";
import { FONTCOLOR, BORDERLINE, PANELFILL, BORDERFILL } from "../../constants";
import { useCachedUserFriends, useCacheActions } from "@/hooks/useCachedData";
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
      title="👫 Friends List"
      width="650px"
      maxHeight="700px"
      constrainToCanvas={true}
      zIndex={2000}
    >
      {/* Message Display */}
      {message && (
        <div
          style={{
            padding: "10px 20px",
            backgroundColor: messageType === "success" ? "#4CAF50" : "#f44336",
            color: "white",
            fontSize: "14px",
            textAlign: "center",
          }}
        >
          {message}
        </div>
      )}

      {/* Add Friend Section */}
      <div
        style={{
          padding: "20px",
          borderBottom: `2px solid ${BORDERLINE}`,
          backgroundColor: BORDERFILL,
        }}
      >
        <h3 style={{ color: FONTCOLOR, margin: "0 0 15px 0", fontSize: "16px" }}>Add Friend</h3>
        <div style={{ display: "flex", gap: "10px" }}>
          <input
            type="text"
            value={newFriendId}
            onChange={(e) => setNewFriendId(e.target.value)}
            placeholder="Enter friend's User ID"
            style={{
              flex: 1,
              padding: "8px 12px",
              border: `2px solid ${BORDERLINE}`,
              borderRadius: "4px",
              backgroundColor: PANELFILL,
              color: FONTCOLOR,
              fontSize: "14px",
            }}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                addFriend();
              }
            }}
          />
          <button
            onClick={addFriend}
            disabled={loading}
            style={{
              padding: "8px 16px",
              border: `2px solid ${BORDERLINE}`,
              borderRadius: "4px",
              backgroundColor: BORDERLINE,
              color: FONTCOLOR,
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: "bold",
            }}
          >
            {loading ? "..." : "Add"}
          </button>
        </div>
      </div>

      {/* Friends List */}
      <div
        style={{
          padding: "20px",
        }}
      >
        <h3 style={{ color: FONTCOLOR, margin: "0 0 15px 0", fontSize: "16px" }}>
          Your Friends ({friends.length})
          {friendsLoading && (
            <span style={{ fontSize: "12px", color: "#999", marginLeft: "10px" }}>
              Refreshing...
            </span>
          )}
        </h3>

        {friendsLoading && friends.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: FONTCOLOR,
              fontSize: "14px",
              opacity: 0.7,
              padding: "40px 20px",
            }}
          >
            Loading your friends...
          </div>
        ) : friends.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: FONTCOLOR,
              fontSize: "14px",
              opacity: 0.7,
              padding: "40px 20px",
            }}
          >
            No friends added yet. Share your User ID with friends to get started!
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {friends.map((friend, index) => (
              <div
                key={friend.friend_id || `friend-${index}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 15px",
                  backgroundColor: BORDERFILL,
                  border: `1px solid ${BORDERLINE}`,
                  borderRadius: "6px",
                }}
              >
                <div>
                  <div
                    style={{
                      color: FONTCOLOR,
                      fontSize: "14px",
                      fontWeight: "bold",
                    }}
                  >
                    {/* {friend.display_name || friend.friend_id} */}
                    Display Name: {friend.display_name}
                  </div>
                  <div
                    style={{
                      color: FONTCOLOR,
                      fontSize: "12px",
                      opacity: 0.7,
                      fontFamily: "monospace",
                    }}
                  >
                    ID: {friend.friend_id}
                  </div>
                </div>
                <button
                  onClick={() => removeFriend(friend.friend_id)}
                  disabled={loading}
                  style={{
                    padding: "6px 12px",
                    border: `1px solid #f44336`,
                    borderRadius: "4px",
                    backgroundColor: "#f44336",
                    color: "white",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontSize: "12px",
                    fontWeight: "bold",
                  }}
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
