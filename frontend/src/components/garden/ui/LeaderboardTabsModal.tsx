import React, { useState } from "react";
import { BaseModal } from "../../common";
import {
  FONTCOLOR,
  BORDERLINE,
  PANELFILL,
  BORDERFILL,
  ACCENT_COLOR,
  HeaderFont,
} from "../../constants";
import GlobalLeaderboardModal from "./GlobalLeaderboardModal";
import GroupLeaderboardModal from "./GroupLeaderboardModal";
import { FaChartBar } from "react-icons/fa";

interface LeaderboardTabsModalProps {
  isVisible: boolean;
  onClose: () => void;
}

type LeaderboardTab = "global" | "group";

export default function LeaderboardTabsModal({ isVisible, onClose }: LeaderboardTabsModalProps) {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>("global");

  if (!isVisible) return null;

  return (
    <>
      {/* Tab Selection Modal */}
      <BaseModal
        isVisible={isVisible}
        onClose={onClose}
        title="Leaderboards"
        icon={<FaChartBar />}
        constrainToCanvas={true}
      >
        <div
          style={{
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "15px",
          }}
        >
          {/* Tab Buttons */}
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setActiveTab("global")}
              style={{
                flex: 1,
                padding: "12px 16px",
                backgroundColor: activeTab === "global" ? ACCENT_COLOR : BORDERFILL,
                color: activeTab === "global" ? "white" : FONTCOLOR,
                border: `2px solid ${activeTab === "global" ? ACCENT_COLOR : BORDERLINE}`,
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "bold",
                fontFamily: HeaderFont,
                transition: "all 0.2s ease",
              }}
            >
              🌍 Global Leaderboard
            </button>

            <button
              onClick={() => setActiveTab("group")}
              style={{
                flex: 1,
                padding: "12px 16px",
                backgroundColor: activeTab === "group" ? ACCENT_COLOR : BORDERFILL,
                color: activeTab === "group" ? "white" : FONTCOLOR,
                border: `2px solid ${activeTab === "group" ? ACCENT_COLOR : BORDERLINE}`,
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "bold",
                fontFamily: HeaderFont,
                transition: "all 0.2s ease",
              }}
            >
              👥 Group Leaderboard
            </button>
          </div>

          {/* Tab Description */}
          <div
            style={{
              padding: "12px",
              backgroundColor: BORDERFILL,
              border: `1px solid ${BORDERLINE}`,
              borderRadius: "6px",
              color: FONTCOLOR,
              fontSize: "13px",
            }}
          >
            {activeTab === "global" ? (
              <>
                <strong>Global Leaderboard:</strong> See how you rank against all users worldwide
                based on your pomodoro focus time.
              </>
            ) : (
              <>
                <strong>Group Leaderboard:</strong> Compare your performance with members of your
                study groups.
              </>
            )}
          </div>

          {/* Continue Button */}
          <button
            onClick={() => {
              // Close this modal and open the selected leaderboard
              onClose();
              // The parent component will handle opening the appropriate modal
            }}
            style={{
              padding: "12px 24px",
              backgroundColor: ACCENT_COLOR,
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "bold",
              fontFamily: HeaderFont,
            }}
          >
            View {activeTab === "global" ? "Global" : "Group"} Leaderboard →
          </button>
        </div>
      </BaseModal>

      {/* Conditionally render the actual leaderboard modals */}
      {activeTab === "global" && (
        <GlobalLeaderboardModal
          isVisible={false} // We'll control this from parent
          onClose={onClose}
        />
      )}

      {activeTab === "group" && (
        <GroupLeaderboardModal
          isVisible={false} // We'll control this from parent
          onClose={onClose}
        />
      )}
    </>
  );
}
