import React, { useState } from "react";
import { BaseModal } from "../../common";
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
        <div className="p-5 flex flex-col gap-4">
          {/* Tab Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("global")}
              className={`flex-1 px-4 py-3 rounded text-sm font-bold transition-colors ${
                activeTab === "global"
                  ? "bg-[#a0622d] text-white"
                  : "bg-[#fdf4e8] text-[#2c1810] border-2 border-[#a0622d] hover:bg-[#e4be93ff]"
              }`}
            >
              Global Leaderboard
            </button>
            <button
              onClick={() => setActiveTab("group")}
              className={`flex-1 px-4 py-3 rounded text-sm font-bold transition-colors ${
                activeTab === "group"
                  ? "bg-[#a0622d] text-white"
                  : "bg-[#fdf4e8] text-[#2c1810] border-2 border-[#a0622d] hover:bg-[#e4be93ff]"
              }`}
            >
              Group Leaderboard
            </button>
          </div>

          {/* Tab Content */}
          <div className="min-h-[400px]">
            {activeTab === "global" ? (
              <div className="text-center text-[#2c1810] text-sm opacity-70 py-20">
                <p className="mb-4">View global rankings and compete with users worldwide!</p>
                <p>Click "Open Global Leaderboard" to see the full leaderboard.</p>
              </div>
            ) : (
              <div className="text-center text-[#2c1810] text-sm opacity-70 py-20">
                <p className="mb-4">View rankings within your study groups!</p>
                <p>Click "Open Group Leaderboard" to see group-specific rankings.</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                onClose();
                // Open the respective leaderboard modal
                if (activeTab === "global") {
                  // This would be handled by the parent component
                  console.log("Open Global Leaderboard");
                } else {
                  // This would be handled by the parent component
                  console.log("Open Group Leaderboard");
                }
              }}
              className="flex-1 px-4 py-2 bg-[#5cb370] text-white rounded hover:bg-[#4a9c5a] transition-colors font-bold"
            >
              Open {activeTab === "global" ? "Global" : "Group"} Leaderboard
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#7a6b57] text-white rounded hover:bg-[#6a5b47] transition-colors font-bold"
            >
              Close
            </button>
          </div>
        </div>
      </BaseModal>

      {/* Individual Leaderboard Modals */}
      <GlobalLeaderboardModal
        isVisible={false} // These are controlled by parent component
        onClose={() => {}}
      />
      <GroupLeaderboardModal
        isVisible={false} // These are controlled by parent component
        onClose={() => {}}
      />
    </>
  );
}