import React from "react";
import ToolsSection from "./ToolsSection";

// Types for lobby state management
interface LobbyData {
  code: string;
  host: string;
  users: string[];
  createdAt: string;
}

type LobbyState = "empty" | "hosting" | "joined" | "join";

interface MinimizableToolsPanelProps {
  isMinimized: boolean;
  setIsMinimized: React.Dispatch<React.SetStateAction<boolean>>;
  lobbyState?: LobbyState;
  lobbyData?: LobbyData | null;
  onLobbyStateChange?: (state: LobbyState) => void;
  onLobbyDataChange?: (data: LobbyData | null) => void;
  hasSubscription?: boolean;
  subscriptionLoading?: boolean;
}

export default function MinimizableToolsPanel({
  isMinimized,
  setIsMinimized,
  lobbyState,
  lobbyData,
  onLobbyStateChange,
  onLobbyDataChange,
  hasSubscription = false,
  subscriptionLoading = false,
}: MinimizableToolsPanelProps) {
  const toggleMinimized = () => {
    setIsMinimized((prev) => !prev);
  };

  if (isMinimized) {
    return (
      <div
        className="relative w-full h-10 border-2 border-[#a0622d] flex items-center justify-between px-2.5 transition-all duration-200 bg-[#e4be93ff] cursor-pointer hover:bg-[#f5d9b8]"
        onClick={toggleMinimized}
      >
        <span className="text-[#2c1810] text-sm font-bold">Tools Section</span>
        <button
          className="border-none text-[#2c1810] text-base px-1.5 py-0.5 rounded bg-[#a0622d] hover:bg-[#8a5425] transition-all duration-200"
          onClick={(e) => {
            e.stopPropagation();
            toggleMinimized();
          }}
        >
          <i className="fa fa-chevron-up"></i>
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-[#fdf4e8] border-2 border-[#a0622d] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="relative w-full h-10 border-b-2 border-[#a0622d] flex items-center justify-between px-2.5 bg-[#e4be93ff]">
        <span className="text-[#2c1810] text-sm font-bold">Tools Section</span>
        <button
          className="border-none text-[#2c1810] text-base px-1.5 py-0.5 rounded bg-[#a0622d] hover:bg-[#8a5425] transition-all duration-200"
          onClick={toggleMinimized}
        >
          <i className="fa fa-chevron-down"></i>
        </button>
      </div>

      {/* Content */}
      <div className="h-[calc(100%-2.5rem)]">
        <ToolsSection
          lobbyState={lobbyState}
          lobbyData={lobbyData}
          onLobbyStateChange={onLobbyStateChange}
          onLobbyDataChange={onLobbyDataChange}
          hasSubscription={hasSubscription}
          subscriptionLoading={subscriptionLoading}
        />
      </div>
    </div>
  );
}