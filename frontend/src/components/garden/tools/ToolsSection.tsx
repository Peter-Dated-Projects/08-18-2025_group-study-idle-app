import React, { useState } from "react";
import MusicSync from "./MusicSync";
import Lobby from "./Lobby";
import Pomodoro from "./WorkBlockTimer";
import { FONTCOLOR, BORDERLINE, PANELFILL, BORDERFILL } from "../../constants";

interface Tab {
  id: string;
  label: string;
  component: React.ReactNode;
}

export default function ToolsSection() {
  const [activeTab, setActiveTab] = useState("lobby");

  const tabs: Tab[] = [
    {
      id: "lobby",
      label: "Study Lobby",
      component: <Lobby />,
    },
    {
      id: "work-block",
      label: "Work Blocks",
      component: <Pomodoro />,
    },
    {
      id: "music",
      label: "Music Sync",
      component: <MusicSync />,
    },
  ];

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
