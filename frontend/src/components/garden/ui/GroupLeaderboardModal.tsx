import React, { useState, useEffect } from "react";
import { BaseModal } from "../../common";
import {
  FONTCOLOR,
  BORDERLINE,
  PANELFILL,
  BORDERFILL,
  ACCENT_COLOR,
  SUCCESS_COLOR,
  SECONDARY_TEXT,
  HeaderFont,
  BodyFont,
} from "../../constants";
import { useSessionAuth } from "@/hooks/useSessionAuth";

interface GroupLeaderboardEntry {
  rank: number;
  user_id: string;
  display_name?: string | null;
  score: number;
  stats: {
    daily_pomo_duration: number;
    weekly_pomo_duration: number;
    monthly_pomo_duration: number;
    yearly_pomo_duration: number;
  };
}

interface GroupLeaderboardResponse {
  success: boolean;
  period: string;
  entries: GroupLeaderboardEntry[];
}

interface Group {
  group_id: string;
  group_name: string;
  creator_id: string;
  member_ids: string[];
}

interface GroupLeaderboardModalProps {
  isVisible: boolean;
  onClose: () => void;
}

type LeaderboardPeriod = "daily" | "weekly" | "monthly" | "yearly";

export default function GroupLeaderboardModal({ isVisible, onClose }: GroupLeaderboardModalProps) {
  const { user, isLoading: authLoading } = useSessionAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [leaderboardData, setLeaderboardData] = useState<GroupLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");
  const [selectedPeriod, setSelectedPeriod] = useState<LeaderboardPeriod>("yearly");

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

    setLoadingGroups(true);
    try {
      const response = await fetch(`/api/groups/user/${user.userId}`);
      const data = await response.json();

      if (data.success && data.groups) {
        setGroups(data.groups);
        // Auto-select first group if available
        if (data.groups.length > 0 && !selectedGroup) {
          setSelectedGroup(data.groups[0].group_id);
        }
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
      showMessage("Failed to load groups", "error");
    } finally {
      setLoadingGroups(false);
    }
  };

  // Fetch group leaderboard data
  const fetchGroupLeaderboard = async () => {
    if (!selectedGroup) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/group-leaderboard/${selectedGroup}?period=${selectedPeriod}&limit=10`
      );
      const data = await response.json();

      if (data.success && data.entries) {
        setLeaderboardData(data.entries);
      } else {
        setLeaderboardData([]);
        if (!data.success) {
          showMessage(data.message || "Failed to load group leaderboard", "error");
        }
      }
    } catch (error) {
      console.error("Error fetching group leaderboard:", error);
      showMessage("Failed to load group leaderboard", "error");
      setLeaderboardData([]);
    } finally {
      setLoading(false);
    }
  };

  // Format duration from minutes to readable string
  const formatDuration = (minutes: number): string => {
    if (minutes === 0) return "0m";

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  // Get period-specific duration for an entry
  const getPomoDurationForPeriod = (
    entry: GroupLeaderboardEntry,
    period: LeaderboardPeriod
  ): number => {
    return entry.stats[`${period}_pomo_duration`] || 0;
  };

  // Load groups when modal opens
  useEffect(() => {
    if (isVisible && user?.userId) {
      fetchGroups();
    }
  }, [isVisible, user?.userId]);

  // Load leaderboard when group or period changes
  useEffect(() => {
    if (selectedGroup && selectedPeriod) {
      fetchGroupLeaderboard();
    }
  }, [selectedGroup, selectedPeriod]);

  if (!isVisible) return null;

  if (!user) {
    return (
      <BaseModal
        isVisible={isVisible}
        onClose={onClose}
        title="Group Leaderboard"
        constrainToCanvas={true}
        zIndex={2000}
      >
        <div style={{ padding: "20px", textAlign: "center", color: FONTCOLOR }}>
          Please log in to view group leaderboards.
        </div>
      </BaseModal>
    );
  }

  return (
    <BaseModal
      isVisible={isVisible}
      onClose={onClose}
      title="👥 Group Pomodoro Duration Leaderboard"
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
            backgroundColor: messageType === "success" ? SUCCESS_COLOR : "#f44336",
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
          maxHeight: "500px",
          overflow: "auto",
        }}
      >
        {/* Group Selection */}
        {loadingGroups ? (
          <div style={{ textAlign: "center", color: SECONDARY_TEXT, fontSize: "14px" }}>
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
              fontSize: "14px",
            }}
          >
            You haven&apos;t joined any groups yet. Join a group to view group leaderboards!
          </div>
        ) : (
          <div>
            <h3
              style={{
                margin: "0 0 10px 0",
                color: FONTCOLOR,
                fontSize: "16px",
                fontFamily: HeaderFont,
              }}
            >
              Select Group
            </h3>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                border: `1px solid ${BORDERLINE}`,
                borderRadius: "4px",
                backgroundColor: PANELFILL,
                color: FONTCOLOR,
                fontSize: "14px",
                fontFamily: BodyFont,
              }}
            >
              {groups.map((group) => (
                <option key={group.group_id} value={group.group_id}>
                  {group.group_name} ({group.member_ids.length} members)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Period Selection */}
        {selectedGroup && (
          <div>
            <h3
              style={{
                margin: "0 0 10px 0",
                color: FONTCOLOR,
                fontSize: "16px",
                fontFamily: HeaderFont,
              }}
            >
              Time Period
            </h3>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {(["daily", "weekly", "monthly", "yearly"] as LeaderboardPeriod[]).map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: selectedPeriod === period ? ACCENT_COLOR : BORDERFILL,
                    color: selectedPeriod === period ? "white" : FONTCOLOR,
                    border: `1px solid ${selectedPeriod === period ? ACCENT_COLOR : BORDERLINE}`,
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "bold",
                    textTransform: "capitalize",
                    fontFamily: BodyFont,
                  }}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Leaderboard */}
        {selectedGroup && (
          <div>
            <h3
              style={{
                margin: "0 0 15px 0",
                color: FONTCOLOR,
                fontSize: "16px",
                fontFamily: HeaderFont,
              }}
            >
              {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} Rankings
            </h3>

            {loading ? (
              <div style={{ textAlign: "center", color: SECONDARY_TEXT, fontSize: "14px" }}>
                Loading leaderboard...
              </div>
            ) : leaderboardData.length === 0 ? (
              <div
                style={{
                  padding: "20px",
                  textAlign: "center",
                  color: FONTCOLOR,
                  backgroundColor: BORDERFILL,
                  border: `1px solid ${BORDERLINE}`,
                  borderRadius: "6px",
                  fontSize: "14px",
                }}
              >
                No activity recorded for this period in this group.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {leaderboardData.map((entry, index) => {
                  const isCurrentUser = entry.user_id === user.userId;
                  const duration = getPomoDurationForPeriod(entry, selectedPeriod);

                  return (
                    <div
                      key={entry.user_id}
                      style={{
                        padding: "12px",
                        backgroundColor: isCurrentUser ? ACCENT_COLOR + "20" : BORDERFILL,
                        border: `2px solid ${isCurrentUser ? ACCENT_COLOR : BORDERLINE}`,
                        borderRadius: "6px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        {/* Rank */}
                        <div
                          style={{
                            width: "30px",
                            height: "30px",
                            backgroundColor: entry.rank <= 3 ? SUCCESS_COLOR : BORDERLINE,
                            color: entry.rank <= 3 ? "white" : FONTCOLOR,
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "bold",
                            fontSize: "14px",
                            fontFamily: HeaderFont,
                          }}
                        >
                          {entry.rank}
                        </div>

                        {/* User Info */}
                        <div>
                          <div
                            style={{
                              color: FONTCOLOR,
                              fontWeight: "bold",
                              fontSize: "14px",
                              fontFamily: BodyFont,
                            }}
                          >
                            {entry.display_name || entry.user_id}
                            {isCurrentUser && (
                              <span
                                style={{
                                  marginLeft: "8px",
                                  color: ACCENT_COLOR,
                                  fontSize: "12px",
                                  fontWeight: "normal",
                                }}
                              >
                                (You)
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              color: SECONDARY_TEXT,
                              fontSize: "11px",
                              fontFamily: "monospace",
                              marginTop: "2px",
                            }}
                          >
                            ID: {entry.user_id}
                          </div>
                          <div
                            style={{
                              color: SECONDARY_TEXT,
                              fontSize: "12px",
                              fontFamily: BodyFont,
                            }}
                          >
                            {formatDuration(duration)} focused
                          </div>
                        </div>
                      </div>

                      {/* Score */}
                      <div
                        style={{
                          color: ACCENT_COLOR,
                          fontWeight: "bold",
                          fontSize: "16px",
                          fontFamily: HeaderFont,
                        }}
                      >
                        {formatDuration(duration)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </BaseModal>
  );
}
