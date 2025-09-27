import React, { useState, useEffect } from "react";
import { BaseModal } from "../../common";
import { useSessionAuth } from "@/hooks/useSessionAuth";
import { useCachedGlobalLeaderboard } from "@/hooks/useCachedData";
import { FaTrophy } from "react-icons/fa";
import type { LeaderboardEntry } from "@/utils/cacheManager";

interface GlobalLeaderboardModalProps {
  isVisible: boolean;
  onClose: () => void;
}

type LeaderboardPeriod = "daily" | "weekly" | "monthly" | "yearly";

export default function GlobalLeaderboardModal({
  isVisible,
  onClose,
}: GlobalLeaderboardModalProps) {
  const { user, isLoading: authLoading } = useSessionAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<LeaderboardPeriod>("yearly");

  // Use cached leaderboard data
  const {
    leaderboard: leaderboardData,
    loading: leaderboardLoading,
    error: leaderboardError,
    refresh: refreshLeaderboard,
  } = useCachedGlobalLeaderboard(selectedPeriod);

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
    if (leaderboardError) {
      showMessage(leaderboardError, "error");
    }
  }, [leaderboardError]);

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
  const getScoreForPeriod = (entry: LeaderboardEntry) => {
    switch (selectedPeriod) {
      case "daily":
        return entry.daily_pomo_duration;
      case "weekly":
        return entry.weekly_pomo_duration;
      case "monthly":
        return entry.monthly_pomo_duration;
      case "yearly":
        return entry.yearly_pomo_duration;
      default:
        return 0;
    }
  };

  return (
    <BaseModal
      isVisible={isVisible}
      onClose={onClose}
      title="Global Leaderboard"
      icon={<FaTrophy />}
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

      {/* Period Selection */}
      <div className="p-5 border-b-2 border-[#a0622d] bg-[#e4be93ff]">
        <h3 className="text-[#2c1810] mb-3 text-base font-bold">Time Period</h3>
        <div className="flex gap-2">
          {(["daily", "weekly", "monthly", "yearly"] as LeaderboardPeriod[]).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-3 py-2 rounded text-sm font-bold transition-colors ${
                selectedPeriod === period
                  ? "bg-[#a0622d] text-white"
                  : "bg-[#fdf4e8] text-[#2c1810] border-2 border-[#a0622d] hover:bg-[#e4be93ff]"
              }`}
            >
              {getPeriodDisplayName(period)}
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard Content */}
      <div className="p-5">
        {leaderboardLoading ? (
          <div className="text-center text-[#2c1810] text-sm opacity-70 py-10">
            Loading leaderboard...
          </div>
        ) : leaderboardData.length === 0 ? (
          <div className="text-center text-[#2c1810] text-sm opacity-70 py-10">
            No data available for this period
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-[#2c1810] text-lg font-bold mb-4">
              {getPeriodDisplayName(selectedPeriod)} Global Rankings
            </h3>
            
            {/* Leaderboard Entries */}
            <div className="space-y-2">
              {leaderboardData.map((entry, index) => {
                const isCurrentUser = entry.user_id === user?.userId;
                const duration = getScoreForPeriod(entry);

                return (
                  <div
                    key={entry.user_id}
                    className={`p-4 rounded border-2 flex items-center justify-between ${
                      isCurrentUser
                        ? "bg-[#d4944a]/20 border-[#d4944a]"
                        : index === 0
                        ? "bg-yellow-100 border-yellow-300"
                        : index === 1
                        ? "bg-gray-100 border-gray-300"
                        : index === 2
                        ? "bg-orange-100 border-orange-300"
                        : "bg-[#e4be93ff] border-[#a0622d]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Rank */}
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          index === 0
                            ? "bg-yellow-500 text-white"
                            : index === 1
                            ? "bg-gray-500 text-white"
                            : index === 2
                            ? "bg-orange-500 text-white"
                            : isCurrentUser
                            ? "bg-[#d4944a] text-white"
                            : "bg-[#a0622d] text-white"
                        }`}
                      >
                        {entry.rank}
                      </div>
                      
                      {/* User Info */}
                      <div>
                        <div className="text-[#2c1810] font-bold text-base">
                          {entry.display_name || entry.user_id}
                          {isCurrentUser && (
                            <span className="ml-2 text-[#d4944a] text-sm font-normal">
                              (You)
                            </span>
                          )}
                        </div>
                        <div className="text-[#7a6b57] text-sm">
                          {entry.user_id}
                        </div>
                      </div>
                    </div>
                    
                    {/* Score */}
                    <div className="text-right">
                      <div className="text-[#2c1810] font-bold text-lg">
                        {formatDuration(duration)}
                      </div>
                      <div className="text-[#7a6b57] text-sm">
                        {selectedPeriod} focus time
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </BaseModal>
  );
}