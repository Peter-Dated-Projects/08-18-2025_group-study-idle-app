import React, { useState } from "react";
import MusicSync from "./MusicSync";
import Instructions from "./Instructions";
import Lobby from "./Lobby";
import { FONTCOLOR, BORDERLINE, PANELFILL, BORDERFILL } from "../../constants";

interface Tab {
  id: string;
  label: string;
  component: React.ReactNode;
}

export default function ToolsSection() {
  const [activeTab, setActiveTab] = useState("instructions");

  const tabs: Tab[] = [
    {
      id: "instructions",
      label: "Instructions",
      component: <Instructions />,
    },
    {
      id: "lobby",
      label: "Study Lobby",
      component: <Lobby />,
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
        backgroundColor: PANELFILL,
        display: "flex",
        flexDirection: "column",
        border: `2px solid ${BORDERLINE}`,
        borderBottomLeftRadius: "8px",
        borderBottomRightRadius: "8px",
        overflow: "hidden",
      }}
    >
      {/* Header with tabs */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          borderBottom: `2px solid ${BORDERLINE}`,
          backgroundColor: BORDERFILL,
          minHeight: "35px",
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
                border: "none",
                color: FONTCOLOR,
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: "13px",
                borderBottom: activeTab === tab.id ? `2px solid ${FONTCOLOR}` : "none",
                borderRight: index < tabs.length - 1 ? `1px solid ${BORDERLINE}` : "none",
                transition: "all 0.2s ease",
                fontWeight: activeTab === tab.id ? "bold" : "normal",
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

      {/* Tab content */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          backgroundColor: PANELFILL,
          border: `1px solid ${BORDERLINE}`,
          borderTop: "none",
          borderBottomLeftRadius: "6px",
          borderBottomRightRadius: "6px",
        }}
      >
        {tabs.find((tab) => tab.id === activeTab)?.component}
      </div>
    </div>
  );
}
