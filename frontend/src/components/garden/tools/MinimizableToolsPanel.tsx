import React from "react";
import ToolsSection from "./ToolsSection";
import { FONTCOLOR, BORDERLINE, PANELFILL, BORDERFILL } from "../../constants";

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
}

export default function MinimizableToolsPanel({
  isMinimized,
  setIsMinimized,
  lobbyState,
  lobbyData,
  onLobbyStateChange,
  onLobbyDataChange,
}: MinimizableToolsPanelProps) {
  const toggleMinimized = () => {
    setIsMinimized((prev) => !prev);
  };

  if (isMinimized) {
    return (
      <div
        className="relative w-full h-10 border-2 border-gray-300 flex items-center justify-between px-2.5 transition-all duration-200"
        onClick={toggleMinimized}
      >
        <span className="text-gray-900 text-sm font-bold">Tools Section</span>
        <button
          className="border-none text-gray-900 text-base px-1.5 py-0.5 rounded bg-gray-200 transition-all duration-200"
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
    <div className="relative w-full h-full flex flex-col" style={{ backgroundColor: PANELFILL }}>
      {/* Header with minimize button */}
      <button
        className="flex items-center justify-between border-b-2 min-h-[30px] p-[4px_10px] cursor-pointer"
        style={{ borderBottomColor: BORDERLINE, backgroundColor: BORDERFILL }}
        onClick={toggleMinimized}
      >
        <span className="text-sm font-bold" style={{ color: FONTCOLOR }}>
          Tools Section
        </span>
        <i
          className="fa fa-chevron-down text-base cursor-pointer p-[2px_6px] rounded-sm transition-all duration-200 flex items-center justify-center"
          style={{ color: FONTCOLOR, backgroundColor: BORDERLINE }}
          aria-label="Minimize"
        />
      </button>

      {/* Tools content */}
      <div
        className="flex-1 flex flex-col"
        style={{
          overflow: "hidden",
          backgroundColor: PANELFILL,
        }}
      >
        <ToolsSection
          lobbyState={lobbyState}
          lobbyData={lobbyData}
          onLobbyStateChange={onLobbyStateChange}
          onLobbyDataChange={onLobbyDataChange}
        />
      </div>
    </div>
  );
}
