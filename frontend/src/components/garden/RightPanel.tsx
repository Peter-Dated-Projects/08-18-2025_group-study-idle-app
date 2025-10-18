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
        className="w-3/10 flex flex-col h-full min-w-[60px] max-w-[60px]"
        style={{ border: `5px solid ${BORDERLINE}`, backgroundColor: BORDERFILL }}
      >
        <div
          className="flex items-center justify-center h-full cursor-pointer transition-all relative"
          style={{
            writingMode: "vertical-rl",
            textOrientation: "mixed",
            backgroundColor: PANELFILL,
          }}
          onClick={toggleMinimized}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = BORDERFILL;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = PANELFILL;
          }}
        >
          <span className="text-sm font-bold select-none" style={{ color: FONTCOLOR }}>
            Tasks & Tools
          </span>
          <button
            className="absolute top-2.5 right-2.5 bg-none border-none text-base cursor-pointer p-0.5 px-1 rounded-sm transition-all rotate-90"
            style={{ color: FONTCOLOR, backgroundColor: BORDERFILL }}
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
      className="w-3/10 flex flex-col h-full gap-[10px]"
      style={{ border: `5px solid ${BORDERLINE}`, backgroundColor: BORDERFILL }}
    >
      {/* Header with minimize button */}
      <div
        className="flex items-center justify-between py-1.5 px-2.5 min-h-[30px]"
        style={{
          backgroundColor: BORDERFILL,
          borderBottom: `2px solid ${BORDERLINE}`,
        }}
      >
        <span className="text-[13px] font-bold" style={{ color: FONTCOLOR }}>
          Tasks & Tools
        </span>
        <button
          onClick={toggleMinimized}
          className="bg-none border-none text-sm cursor-pointer py-0.5 px-1.5 rounded-sm transition-all"
          style={{ color: FONTCOLOR, backgroundColor: PANELFILL }}
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
        className="flex-1 min-h-[100px] p-2.5"
        style={{
          flexBasis: "60%",
          backgroundColor: PANELFILL,
          borderBottom: `5px solid ${BORDERLINE}`,
        }}
      >
        <GardenTasks />
      </div>

      {/* Tools Section */}
      <div
        className="flex-1 min-h-[100px] p-2.5"
        style={{
          flexBasis: "30%",
          backgroundColor: PANELFILL,
          borderTop: `5px solid ${BORDERLINE}`,
        }}
      >
        <ToolsSection />
      </div>
    </div>
  );
}
