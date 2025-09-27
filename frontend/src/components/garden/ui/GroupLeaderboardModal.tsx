import React, { useState, useEffect } from "react";
import { BaseModal } from "../../common";
import { useSessionAuth } from "@/hooks/useSessionAuth";
import { FaUsers } from "react-icons/fa";

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
        `/api/groups/${selectedGroup}/leaderboard?period=${selectedPeriod}`
      );
      const data: GroupLeaderboardResponse = await response.json();

      if (data.success) {
        setLeaderboardData(data.entries);
      } else {
        showMessage("Failed to load leaderboard", "error");
      }
    } catch (error) {
      console.error("Error fetching group leaderboard:", error);
      showMessage("Failed to load leaderboard", "error");
    } finally {
      setLoading(false);
    }
  };

  // Load groups when modal opens
  useEffect(() => {
    if (isVisible && user?.userId) {
      fetchGroups();
    }
  }, [isVisible, user?.userId]);

  // Load leaderboard when group or period changes
  useEffect(() => {
    if (selectedGroup) {
      fetchGroupLeaderboard();
    }
  }, [selectedGroup, selectedPeriod]);

  // Format duration in hours and minutes
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Get period display name
  const getPeriodDisplayName = (period: LeaderboardPeriod) => {
    switch (period) {
      case "daily":
        return "Today";
      case "weekly":
        return "This Week";
      case "monthly":
        return "This Month";
      case "yearly":
        return "This Year";
      default:
        return period;
    }
  };

  // Get score for selected period
  const getScoreForPeriod = (entry: GroupLeaderboardEntry) => {
    switch (selectedPeriod) {
      case "daily":
        return entry.stats.daily_pomo_duration;
      case "weekly":
        return entry.stats.weekly_pomo_duration;
      case "monthly":
        return entry.stats.monthly_pomo_duration;
      case "yearly":
        return entry.stats.yearly_pomo_duration;
      default:
        return 0;
    }
  };

  return (
    <BaseModal
      isVisible={isVisible}
      onClose={onClose}
      title="Group Leaderboard"
      icon={<FaUsers />}
      width="800px"
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

      <div className="p-5 flex flex-col gap-4 max-h-[500px] overflow-auto">
        {/* Group Selection */}
        {loadingGroups ? (
          <div className="text-center text-[#7a6b57] text-sm">Loading your groups...</div>
        ) : groups.length === 0 ? (
          <div className="p-5 text-center text-[#2c1810] bg-[#e4be93ff] border border-[#a0622d] rounded text-sm">
            You haven&apos;t joined any groups yet. Join a group to view group leaderboards!
          </div>
        ) : (
          <div>
            <h3 className="m-0 mb-2 text-[#2c1810] text-base font-bold">Select Group</h3>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full px-2 py-2 border border-[#a0622d] rounded bg-[#fdf4e8] text-[#2c1810] text-sm"
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
            <h3 className="m-0 mb-2 text-[#2c1810] text-base font-bold">Time Period</h3>
            <div className="flex gap-2 flex-wrap">
              {(["daily", "weekly", "monthly", "yearly"] as LeaderboardPeriod[]).map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-4 py-2 rounded text-xs font-bold capitalize transition-colors ${
                    selectedPeriod === period
                      ? "bg-[#d4944a] text-white border border-[#d4944a]"
                      : "bg-[#e4be93ff] text-[#2c1810] border border-[#a0622d] hover:bg-[#d4944a] hover:text-white"
                  }`}
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
            <h3 className="m-0 mb-4 text-[#2c1810] text-base font-bold">
              {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} Rankings
            </h3>

            {loading ? (
              <div className="text-center text-[#7a6b57] text-sm">Loading leaderboard...</div>
            ) : leaderboardData.length === 0 ? (
              <div className="p-5 text-center text-[#2c1810] bg-[#e4be93ff] border border-[#a0622d] rounded text-sm">
                No activity recorded for this period in this group.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {leaderboardData.map((entry, index) => {
                  const isCurrentUser = entry.user_id === user?.userId;
                  const duration = getScoreForPeriod(entry);

                  return (
                    <div
                      key={entry.user_id}
                      className={`p-3 rounded border-2 flex items-center justify-between ${
                        isCurrentUser
                          ? "bg-[#d4944a]/20 border-[#d4944a]"
                          : "bg-[#e4be93ff] border-[#a0622d]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Rank */}
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            entry.rank <= 3 ? "bg-[#5cb370] text-white" : "bg-[#a0622d] text-white"
                          }`}
                        >
                          {entry.rank}
                        </div>

                        {/* User Info */}
                        <div>
                          <div className="text-[#2c1810] font-bold text-sm">
                            {entry.display_name || entry.user_id}
                            {isCurrentUser && (
                              <span className="ml-2 text-[#d4944a] text-xs font-normal">(You)</span>
                            )}
                          </div>
                          <div className="text-[#7a6b57] text-xs">{entry.user_id}</div>
                        </div>
                      </div>

                      {/* Score */}
                      <div className="text-right">
                        <div className="text-[#2c1810] font-bold text-sm">
                          {formatDuration(duration)}
                        </div>
                        <div className="text-[#7a6b57] text-xs">{selectedPeriod} focus time</div>
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
