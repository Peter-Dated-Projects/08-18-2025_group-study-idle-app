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

  // Manual refresh function that triggers cache refresh
  const handleRefresh = () => {
    refreshLeaderboard();
  };

  const getPeriodDisplayName = (period: LeaderboardPeriod): string => {
    switch (period) {
      case "daily":
        return "Today";
      case "weekly":
        return "This Week";
      case "monthly":
        return "This Month";
      case "yearly":
        return "All Time";
    }
  };

  const getPomoDurationForPeriod = (entry: LeaderboardEntry, period: LeaderboardPeriod): number => {
    switch (period) {
      case "daily":
        return entry.daily_pomo_duration;
      case "weekly":
        return entry.weekly_pomo_duration;
      case "monthly":
        return entry.monthly_pomo_duration;
      case "yearly":
        return entry.yearly_pomo_duration;
    }
  };

  const getRankColor = (rank: number): string => {
    switch (rank) {
      case 1:
        return "#FFD700"; // Gold
      case 2:
        return "#C0C0C0"; // Silver
      case 3:
        return "#CD7F32"; // Bronze
      default:
        return FONTCOLOR;
    }
  };

  const getRankIcon = (rank: number): string => {
    switch (rank) {
      case 1:
        return "👑";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return `#${rank}`;
    }
  };

  useEffect(() => {
    // Data is automatically loaded by the hook
    // Only manual refresh needed when period changes
  }, [isVisible, selectedPeriod, user?.userId, authLoading]);

  // Add rank numbers to leaderboard data with null checking
  const leaderboardWithRanks = Array.isArray(leaderboardData)
    ? leaderboardData.map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }))
    : [];

  return (
    <BaseModal
      isVisible={isVisible}
      onClose={onClose}
      title="Global Pomodoro Duration Leaderboard"
      icon={<FaTrophy />}
      width="650px"
      maxHeight="700px"
      constrainToCanvas={true}
      zIndex={2000}
    >
      {/* Authentication Loading Display */}
      {authLoading && (
        <div
          style={{
            padding: "40px",
            textAlign: "center",
            color: SECONDARY_TEXT,
            fontSize: "16px",
          }}
        >
          <div style={{ marginBottom: "10px" }}>🔐</div>
          Checking authentication...
        </div>
      )}

      {/* Message Display */}
      {message && (
        <div
          style={{
            padding: "12px 20px",
            backgroundColor: messageType === "success" ? SUCCESS_COLOR : "#c85a54",
            color: "white",
            fontSize: "14px",
            textAlign: "center",
            fontWeight: "500",
          }}
        >
          {message}
        </div>
      )}

      {/* Main Content - only show when not loading auth */}
      {!authLoading && (
        <div
          style={{
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            fontFamily: BodyFont,
          }}
        >
          {/* Period Selection */}
          <div>
            <h3
              style={{
                margin: "0 0 15px 0",
                color: FONTCOLOR,
                fontSize: "16px",
                fontFamily: HeaderFont,
              }}
            >
              Leaderboard Period
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
                    border: `1px solid ${BORDERLINE}`,
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: selectedPeriod === period ? "bold" : "normal",
                    transition: "all 0.2s ease",
                  }}
                >
                  {getPeriodDisplayName(period)}
                </button>
              ))}
            </div>
          </div>

          {/* Leaderboard Content */}
          <div>
            <h3
              style={{
                margin: "0 0 15px 0",
                color: FONTCOLOR,
                fontSize: "16px",
                fontFamily: HeaderFont,
              }}
            >
              Top 10 - {getPeriodDisplayName(selectedPeriod)}
            </h3>

            {leaderboardLoading && leaderboardWithRanks.length === 0 ? (
              <div
                style={{
                  padding: "40px",
                  textAlign: "center",
                  color: SECONDARY_TEXT,
                  fontSize: "14px",
                }}
              >
                Loading leaderboard...
              </div>
            ) : leaderboardWithRanks.length === 0 ? (
              <div
                style={{
                  padding: "40px",
                  textAlign: "center",
                  color: SECONDARY_TEXT,
                  fontSize: "14px",
                  backgroundColor: BORDERFILL,
                  borderRadius: "8px",
                  border: `1px solid ${BORDERLINE}`,
                }}
              >
                No leaderboard data available for this period.
              </div>
            ) : (
              <div
                style={{
                  border: `1px solid ${BORDERLINE}`,
                  borderRadius: "8px",
                  backgroundColor: PANELFILL,
                  overflow: "hidden",
                }}
              >
                {/* Header */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "60px 1fr 120px",
                    gap: "15px",
                    padding: "12px 15px",
                    backgroundColor: BORDERFILL,
                    borderBottom: `1px solid ${BORDERLINE}`,
                    fontSize: "12px",
                    fontWeight: "bold",
                    color: FONTCOLOR,
                  }}
                >
                  <div>Rank</div>
                  <div>User</div>
                  <div style={{ textAlign: "center" }}>Minutes</div>
                </div>

                {/* Leaderboard Entries */}
                {leaderboardWithRanks.map((entry, index) => {
                  const isCurrentUser = entry.user_id === user?.userId;
                  const pomoDuration = getPomoDurationForPeriod(entry, selectedPeriod);

                  return (
                    <div
                      key={entry.user_id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "60px 1fr 120px",
                        gap: "15px",
                        padding: "15px",
                        borderBottom:
                          index < leaderboardWithRanks.length - 1
                            ? `1px solid ${BORDERLINE}`
                            : "none",
                        backgroundColor: isCurrentUser ? "rgba(212, 148, 74, 0.1)" : "transparent",
                        transition: "background-color 0.2s ease",
                      }}
                    >
                      {/* Rank */}
                      <div
                        style={{
                          fontWeight: "bold",
                          fontSize: "16px",
                          color: getRankColor(entry.rank || index + 1),
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {getRankIcon(entry.rank || index + 1)}
                      </div>

                      {/* User Name */}
                      <div
                        style={{
                          fontSize: "14px",
                          color: FONTCOLOR,
                          fontWeight: isCurrentUser ? "bold" : "normal",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span>{entry.display_name || entry.user_id}</span>
                        {isCurrentUser && (
                          <span
                            style={{
                              fontSize: "11px",
                              backgroundColor: ACCENT_COLOR,
                              color: "white",
                              padding: "2px 6px",
                              borderRadius: "3px",
                              fontWeight: "bold",
                            }}
                          >
                            You
                          </span>
                        )}
                      </div>

                      {/* Pomodoro Count */}
                      <div
                        style={{
                          fontSize: "16px",
                          fontWeight: "bold",
                          color: pomoDuration > 0 ? SUCCESS_COLOR : SECONDARY_TEXT,
                          textAlign: "center",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "4px",
                        }}
                      >
                        ⏱️ {pomoDuration}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Refresh Button */}
          <div style={{ display: "flex", justifyContent: "center", paddingTop: "10px" }}>
            <button
              onClick={handleRefresh}
              disabled={leaderboardLoading}
              style={{
                padding: "10px 20px",
                backgroundColor: leaderboardLoading ? BORDERFILL : ACCENT_COLOR,
                color: leaderboardLoading ? SECONDARY_TEXT : "white",
                border: "none",
                borderRadius: "6px",
                cursor: leaderboardLoading ? "not-allowed" : "pointer",
                fontSize: "13px",
                fontWeight: "bold",
                transition: "all 0.2s ease",
              }}
            >
              {leaderboardLoading ? "Loading..." : "🔄 Refresh"}
            </button>
          </div>
        </div>
      )}
    </BaseModal>
  );
}
