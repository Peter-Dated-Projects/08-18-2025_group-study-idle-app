"use client";

import GardenCanvas from "@/components/GardenCanvas";
import GardenTasks from "@/components/GardenTasks";
import MusicSync from "@/components/MusicSync";
import GardenMenu from "@/components/GardenMenu";

import { useState } from "react";

const BORDERWIDTH = "8px";
const BORDERFILL = "#c49a6c";
const BORDERLINE = "#9b6542ff";
const PANELFILL = "#e8cfa6";
const FONTCOLOR = "#813706ff";

export default function GardenPage() {
  const [isClicking, setIsClicking] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  return (
    <main
      className="flex flex-col min-h-screen w-full bg-black overflow-hidden"
      style={{
        backgroundColor: BORDERFILL,
        border: `5px solid ${BORDERLINE}`,
        cursor: isClicking
          ? `url("/mouse_click.png") 8 8, auto`
          : `url("/mouse_idle.png") 8 8, auto`,
        color: FONTCOLOR,
        textShadow: `1px 1px 1px ${BORDERFILL}`,
      }}
      onMouseDown={() => setIsClicking(true)}
      onMouseUp={() => setIsClicking(false)}
      onMouseLeave={() => setIsClicking(false)}
    >
      <div className="w-full h-full" style={{ border: `8px solid ${BORDERFILL}` }}>
        <div
          className={`flex w-full h-full flex-1 gap-[10px]`}
          style={{ border: `2px solid ${BORDERFILL}` }}
        >
          <div
            className="w-7/10 flex-1"
            style={{
              border: `5px solid ${BORDERLINE}`,
              position: "relative", // Add relative positioning here
            }}
          >
            <GardenCanvas />
            <GardenMenu />
          </div>

          <div
            className={`w-3/10 flex flex-col h-full gap-[10px]`}
            style={{ border: `5px solid ${BORDERLINE}`, backgroundColor: BORDERFILL }}
          >
            <div
              className="flex-1"
              style={{
                flexBasis: "70%",
                minHeight: 100,
                padding: "10px",
                backgroundColor: PANELFILL,
                borderBottom: `5px solid ${BORDERLINE}`,
              }}
            >
              <GardenTasks />
            </div>
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
              <MusicSync />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
