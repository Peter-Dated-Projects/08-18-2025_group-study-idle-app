import React, { useState } from "react";
import GardenTasks from "./tasks/GardenTasks";
import ToolsSection from "./tools/ToolsSection";
import { FONTCOLOR, BORDERLINE, PANELFILL, BORDERFILL } from "../constants";

export default function RightPanel() {
  const [isMinimized, setIsMinimized] = useState(false);

  const toggleMinimized = () => {
    setIsMinimized(!isMinimized);
  };

  if (isMinimized) {
    return (
      <div
        className={`w-3/10 flex flex-col h-full`}
        style={{
          border: `5px solid ${BORDERLINE}`,
          backgroundColor: BORDERFILL,
          minWidth: "60px",
          maxWidth: "60px",
        }}
      >
        <div
          style={{
            writingMode: "vertical-rl",
            textOrientation: "mixed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            backgroundColor: PANELFILL,
            cursor: "pointer",
            transition: "all 0.2s ease",
            position: "relative",
          }}
          onClick={toggleMinimized}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = BORDERFILL;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = PANELFILL;
          }}
        >
          <span
            style={{
              color: FONTCOLOR,
              fontSize: "14px",
              fontWeight: "bold",
              userSelect: "none",
            }}
          >
            Tasks & Tools
          </span>
          <button
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              background: "none",
              border: "none",
              color: FONTCOLOR,
              fontSize: "16px",
              cursor: "pointer",
              padding: "2px 4px",
              borderRadius: "2px",
              backgroundColor: BORDERFILL,
              transition: "all 0.2s ease",
              transform: "rotate(90deg)",
            }}
            onClick={(e) => {
              e.stopPropagation();
              toggleMinimized();
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = BORDERLINE;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = BORDERFILL;
            }}
          >
            ◀
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-3/10 flex flex-col h-full gap-[10px]`}
      style={{ border: `5px solid ${BORDERLINE}`, backgroundColor: BORDERFILL }}
    >
      {/* Header with minimize button */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "5px 10px",
          backgroundColor: BORDERFILL,
          borderBottom: `2px solid ${BORDERLINE}`,
          minHeight: "30px",
        }}
      >
        <span
          style={{
            color: FONTCOLOR,
            fontSize: "13px",
            fontWeight: "bold",
          }}
        >
          Tasks & Tools
        </span>
        <button
          onClick={toggleMinimized}
          style={{
            background: "none",
            border: "none",
            color: FONTCOLOR,
            fontSize: "14px",
            cursor: "pointer",
            padding: "2px 6px",
            borderRadius: "2px",
            backgroundColor: PANELFILL,
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = BORDERLINE;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = PANELFILL;
          }}
        >
          ▶
        </button>
      </div>

      {/* Tasks Section */}
      <div
        className="flex-1"
        style={{
          flexBasis: "60%",
          minHeight: 100,
          padding: "10px",
          backgroundColor: PANELFILL,
          borderBottom: `5px solid ${BORDERLINE}`,
        }}
      >
        <GardenTasks />
      </div>

      {/* Tools Section */}
      <div
        className="flex-1"
        style={{
          flexBasis: "30%",
          minHeight: 100,
          padding: "10px",
          backgroundColor: PANELFILL,
          borderTop: `5px solid ${BORDERLINE}`,
        }}
      >
        <ToolsSection />
      </div>
    </div>
  );
}
