"use client";

import GardenCanvas from "@/components/GardenCanvas";
import GardenTasksSimple from "@/components/GardenTasksSimple";
import MusicSync from "@/components/MusicSync";
import GardenMenu from "@/components/GardenMenu";
import * as PIXI from "pixi.js";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const BORDERWIDTH = "8px";
const BORDERFILL = "#c49a6c";
const BORDERLINE = "#9b6542ff";
const PANELFILL = "#e8cfa6";
const FONTCOLOR = "#813706ff";

export default function GardenPage() {
  const [isClicking, setIsClicking] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [pixiApp, setPixiApp] = useState<PIXI.Application | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const router = useRouter();

  // Check authentication status on mount
  useEffect(() => {
    checkAuthenticationStatus();
  }, []);

  const checkAuthenticationStatus = async () => {
    try {
      // Check Google auth
      const authResponse = await fetch("/api/auth/session", {
        credentials: "include",
      });
      const authData = await authResponse.json();

      if (!authResponse.ok || !authData.success || !authData.userEmail) {
        // Not logged in with Google, redirect to login
        router.push("/login");
        return;
      }

      // Check Notion auth
      const notionResponse = await fetch("/api/notion/session", {
        credentials: "include",
      });

      if (!notionResponse.ok) {
        // Notion not connected, redirect to login
        router.push("/login");
        return;
      }

      const notionData = await notionResponse.json();
      if (!notionData.success || !notionData.hasValidTokens) {
        // Notion not connected, redirect to login
        router.push("/login");
        return;
      }

      // Check if database is selected (this should be checked in the session)
      // For now, we'll assume if they have Notion tokens, they're good to go
      // You could add an additional check here for selected database

      setIsCheckingAuth(false);
    } catch (error) {
      console.error("Error checking authentication:", error);
      // On error, redirect to login to be safe
      router.push("/login");
    }
  };

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          fontSize: "2rem",
          color: "#333",
        }}
      >
        Loading garden...
      </div>
    );
  }

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
            {/* <GardenCanvas
              onAppCreated={(app) => {
                console.log("PIXI App created:", app);
                setPixiApp(app);
              }}
            />
            <GardenMenu pixiApp={pixiApp} /> */}
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
              <GardenTasksSimple />
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
