import React from "react";
import ToolsSection from "./ToolsSection";
import { FONTCOLOR, BORDERLINE, PANELFILL, BORDERFILL } from "./constants";

export default function MinimizableToolsPanel({
  isMinimized,
  setIsMinimized,
}: {
  isMinimized: boolean;
  setIsMinimized: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const toggleMinimized = () => {
    setIsMinimized((prev) => !prev);
  };

  if (isMinimized) {
    return (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "40px",
          backgroundColor: BORDERFILL,
          border: `2px solid ${BORDERLINE}`,
          borderRadius: "4px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 10px",
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
        onClick={toggleMinimized}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = PANELFILL;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = BORDERFILL;
        }}
      >
        <span style={{ color: FONTCOLOR, fontSize: "14px", fontWeight: "bold" }}>
          Tools Section
        </span>
        <button
          style={{
            background: "none",
            border: "none",
            color: FONTCOLOR,
            fontSize: "16px",
            cursor: "pointer",
            padding: "2px 6px",
            borderRadius: "2px",
            backgroundColor: PANELFILL,
            transition: "all 0.2s ease",
          }}
          onClick={(e) => {
            e.stopPropagation();
            toggleMinimized();
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = BORDERLINE;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = PANELFILL;
          }}
        >
          ▲
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        backgroundColor: PANELFILL,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header with minimize button */}
      <button
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `2px solid ${BORDERLINE}`,
          backgroundColor: BORDERFILL,
          minHeight: "30px",
          padding: "4px 10px",
          cursor: "pointer", // Add cursor pointer for toggle functionality
        }}
        onClick={toggleMinimized} // Ensure toggle functionality is applied
      >
        <span style={{ color: FONTCOLOR, fontSize: "14px", fontWeight: "bold" }}>
          Tools Section
        </span>
        <i
          className="fa fa-chevron-down"
          style={{
            color: FONTCOLOR,
            fontSize: "16px",
            cursor: "pointer",
            padding: "2px 6px",
            borderRadius: "2px",
            backgroundColor: BORDERLINE,
            transition: "all 0.2s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          aria-label="Minimize"
        />
      </button>

      {/* Tools content */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          backgroundColor: PANELFILL,
        }}
      >
        <ToolsSection />
      </div>
    </div>
  );
}
