import React, { useState, useEffect } from "react";
import MusicSync from "./MusicSync";
import Lobby from "./Lobby";
import PomoBlockTimer from "./PomoBlockTimer";

// Types for lobby state management
interface LobbyData {
  code: string;
  host: string;
  users: string[];
  createdAt: string;
}

type LobbyState = "empty" | "hosting" | "joined" | "join";

interface ToolsSectionProps {
  lobbyState?: LobbyState;
  lobbyData?: LobbyData | null;
  onLobbyStateChange?: (state: LobbyState) => void;
  onLobbyDataChange?: (data: LobbyData | null) => void;
  hasSubscription?: boolean;
  subscriptionLoading?: boolean;
}

interface Tab {
  id: string;
  label: string;
  component: React.ReactNode;
}

export default function ToolsSection({
  lobbyState,
  lobbyData,
  onLobbyStateChange,
  onLobbyDataChange,
  hasSubscription = false,
  subscriptionLoading = false,
}: ToolsSectionProps) {
  const [activeTab, setActiveTab] = useState(() => {
    // Default to "pomo-block" if user doesn't have subscription (lobby is premium)
    return hasSubscription ? "lobby" : "pomo-block";
  });

  // Create tabs array based on subscription status
  const tabs: Tab[] = [
    // Lobby tab - only available for premium users
    ...(hasSubscription && !subscriptionLoading ? [{
      id: "lobby",
      label: "Study Lobby",
      component: (
        <Lobby
          lobbyState={lobbyState}
          lobbyData={lobbyData}
          onLobbyStateChange={onLobbyStateChange}
          onLobbyDataChange={onLobbyDataChange}
        />
      ),
    }] : []),
    {
      id: "pomo-block",
      label: "Pomo Blocks",
      component: <PomoBlockTimer />,
    },
    // Music Sync tab - only available for premium users
    ...(hasSubscription && !subscriptionLoading ? [{
      id: "music",
      label: "Music Sync",
      component: <MusicSync />,
    }] : []),
  ];

  // Update active tab when subscription status changes
  useEffect(() => {
    if (!hasSubscription && (activeTab === "lobby" || activeTab === "music")) {
      setActiveTab("pomo-block");
    } else if (hasSubscription && tabs.length > 0 && !tabs.find(tab => tab.id === activeTab)) {
      setActiveTab("lobby");
    }
  }, [hasSubscription, activeTab, tabs]);

  return (
    <div className="relative w-full h-full bg-[#fdf4e8] flex flex-col overflow-hidden">
      {/* Header with tabs - this stays fixed */}
      <div className="flex items-center border-b-2 border-[#a0622d] bg-[#e4be93ff] min-h-[35px] flex-shrink-0">
        {/* Tabs */}
        <div className="flex flex-1">
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 text-[#2c1810] text-xs transition-all duration-200 font-normal ${
                activeTab === tab.id 
                  ? "bg-[#fdf4e8] font-bold" 
                  : "bg-transparent hover:bg-[#fdf4e8] hover:opacity-80"
              } ${
                index === 0 ? "border-l-0" : "border-l border-[#a0622d]"
              } ${
                index === tabs.length - 1 ? "border-r-0" : "border-r border-[#a0622d]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content - this scrolls */}
      <div className="flex-1 bg-[#fdf4e8] overflow-auto min-h-0">
        {tabs.find((tab) => tab.id === activeTab)?.component}
      </div>
    </div>
  );
}
