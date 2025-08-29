"use client";

import * as PIXI from "pixi.js";
import GardenCanvas from "@/components/GardenCanvas";
import MusicSync from "@/components/MusicSync";
import GardenMenu from "@/components/GardenMenu";
import GardenTasks from "@/components/GardenTasks";
import GardenSettings from "@/components/GardenSettings";
import { NotificationProvider, useGlobalNotification } from "@/components/NotificationProvider";

import { FONTCOLOR, BORDERFILL, BORDERLINE, PANELFILL } from "@/components/constants";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// Helper function to extract plain text from Notion rich text objects
const extractPlainText = (richTextArray: any): string => {
  if (!richTextArray || !Array.isArray(richTextArray)) {
    return "";
  }
  return richTextArray.map((textObj: any) => textObj.plain_text || "").join("");
};

interface NotionDatabase {
  id: string;
  title: any[]; // Rich text array from Notion API
  url?: string;
  created_time?: string;
  last_edited_time?: string;
}

interface StudySessionNotionPage {
  id: string;
  created_time: string;
  last_edited_time: string;
  icon: {
    type: string;
    emoji: string;
  };
  properties: {
    [key: string]: any;
  };
}

export default function GardenPage() {
  return (
    <NotificationProvider>
      <GardenPageContent />
    </NotificationProvider>
  );
}

function GardenPageContent() {
  const { addNotification } = useGlobalNotification();

  const [isClicking, setIsClicking] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [pixiApp, setPixiApp] = useState<PIXI.Application | null>(null); // PIXI.js Application state

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
    <NotificationProvider>
      <main
        className="flex flex-col min-h-screen w-full bg-black overflow-hidden"
        style={{
          backgroundColor: BORDERFILL,
          border: `5px solid ${BORDERLINE}`,
          cursor: isClicking
            ? `url("/ui/mouse_click.png") 8 8, auto`
            : `url("/ui/mouse_idle.png") 8 8, auto`,
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
              <GardenCanvas
                onAppCreated={(app) => {
                  console.log("PIXI App created:", app);
                  setPixiApp(app);
                }}
              />
              <GardenMenu pixiApp={pixiApp} />
              <GardenSettings />
            </div>

            <div
              className={`w-3/10 flex flex-col h-full gap-[10px]`}
              style={{ border: `5px solid ${BORDERLINE}`, backgroundColor: BORDERFILL }}
            >
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
    </NotificationProvider>
  );
}
