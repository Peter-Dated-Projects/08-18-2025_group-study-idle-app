import React, { useState, useEffect } from "react";
import MusicSync from "./MusicSync";
import Lobby from "./Lobby";
import PomoBlockTimer from "./PomoBlockTimer";
import { FONTCOLOR, BORDERLINE, PANELFILL, BORDERFILL } from "../../constants";

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
    ...(hasSubscription ? [{
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
    }] : [{
      id: "lobby-premium",
      label: "Study Lobby 🔒",
      component: (
        <div style={{
          padding: "20px",
          textAlign: "center",
          backgroundColor: PANELFILL,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center"
        }}>
          <div style={{
            backgroundColor: BORDERFILL,
            padding: "20px",
            borderRadius: "10px",
            border: `2px solid ${BORDERLINE}`,
            maxWidth: "300px"
          }}>
            <i className="fas fa-lock" style={{ 
              fontSize: "24px", 
              color: FONTCOLOR, 
              marginBottom: "10px" 
            }}></i>
            <h3 style={{ 
              color: FONTCOLOR, 
              marginBottom: "10px",
              fontSize: "16px"
            }}>
              Premium Feature
            </h3>
            <p style={{ 
              color: FONTCOLOR, 
              marginBottom: "15px",
              fontSize: "14px",
              lineHeight: "1.4"
            }}>
              Study Lobbies allow you to collaborate with friends in real-time study sessions.
            </p>
            <button
              onClick={() => window.location.href = '/pricing'}
              style={{
                backgroundColor: "#10b981",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "6px",
                fontSize: "14px",
                cursor: "pointer",
                fontWeight: "bold"
              }}
            >
              Upgrade to Premium
            </button>
          </div>
        </div>
      ),
    }]),
    {
      id: "pomo-block",
      label: "Pomo Blocks",
      component: <PomoBlockTimer />,
    },
    {
      id: "music",
      label: "Music Sync",
      component: <MusicSync />,
    },
  ];

  // Update active tab when subscription status changes
  useEffect(() => {
    if (!hasSubscription && activeTab === "lobby") {
      setActiveTab("pomo-block");
    } else if (hasSubscription && tabs.length > 0 && !tabs.find(tab => tab.id === activeTab)) {
      setActiveTab("lobby");
    }
  }, [hasSubscription, activeTab, tabs]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        backgroundColor: PANELFILL,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header with tabs - this stays fixed */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          borderBottom: `2px solid ${BORDERLINE}`,
          backgroundColor: BORDERFILL,
          minHeight: "35px",
          flexShrink: 0, // Prevent this from shrinking
        }}
      >
        {/* Tabs */}
        <div style={{ display: "flex", flex: 1 }}>
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                backgroundColor: activeTab === tab.id ? PANELFILL : "transparent",
                color: FONTCOLOR,
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: "13px",
                transition: "all 0.2s ease",
                fontWeight: activeTab === tab.id ? "bold" : "normal",
                borderLeft: index === 0 ? "none" : `1px solid ${BORDERLINE}`,
                borderRight: index === tabs.length - 1 ? "none" : `1px solid ${BORDERLINE}`,
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.backgroundColor = PANELFILL;
                  e.currentTarget.style.opacity = "0.8";
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.opacity = "1";
                }
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content - this scrolls */}
      <div
        className="flex-1"
        style={{
          backgroundColor: PANELFILL,
          overflow: "auto",
          minHeight: 0, // Allow this to shrink below its content height
        }}
      >
        {tabs.find((tab) => tab.id === activeTab)?.component}
      </div>
    </div>
  );
}
