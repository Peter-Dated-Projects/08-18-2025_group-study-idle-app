"use client";

import * as PIXI from "pixi.js";
import GardenCanvas from "@/components/garden/GardenCanvas";
import MinimizableToolsPanel from "@/components/garden/tools/MinimizableToolsPanel";
import GardenMenu from "@/components/garden/ui/GardenMenu";
import GardenTasks from "@/components/garden/tasks/GardenTasks";
import GardenSettings from "@/components/garden/ui/GardenSettings";
import GardenIcons from "@/components/garden/GardenIcons";
import { NotificationProvider, useGlobalNotification } from "@/components/NotificationProvider";
import {
  setGlobalStructureClickHandler,
  clearGlobalStructureClickHandler,
} from "@/utils/globalStructureHandler";
import { useSessionAuth } from "@/hooks/useSessionAuth";

import { FONTCOLOR, BORDERFILL, BORDERLINE, PANELFILL } from "@/components/constants";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Structure } from "@/scripts/structures/Structure";

// Types for lobby state management
interface LobbyData {
  code: string;
  host: string;
  users: string[];
  createdAt: string;
}

type LobbyState = "empty" | "hosting" | "joined" | "join";

// Lobby types (duplicated from Lobby.tsx for now)
interface User {
  userId: string;
  email: string;
}

interface LobbyData {
  code: string;
  host: string;
  users: string[];
  createdAt: string;
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
  const { isAuthenticated, isLoading, user, error } = useSessionAuth();

  const [isClicking, setIsClicking] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [pixiApp, setPixiApp] = useState<PIXI.Application | undefined>(undefined); // PIXI.js Application state

  const minPanelSplit = 40;
  const maxPanelSplit = 70;

  const [panelSplit, setPanelSplit] = useState(() => {
    // Load saved panel split from localStorage, default to 50%
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("gardenPanelSplit");
      if (saved) {
        const savedValue = parseInt(saved, 10);
        // Ensure saved value is within new constraints (40% - 80%)
        return Math.max(minPanelSplit, Math.min(maxPanelSplit, savedValue));
      }
      return 50;
    }
    return 50;
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartSplit, setDragStartSplit] = useState(50);

  // Lobby state management - moved from Lobby component to be shared
  const [lobbyState, setLobbyState] = useState<LobbyState>(() => {
    if (typeof window !== "undefined") {
      const savedState = localStorage.getItem("garden_lobby_state");
      return (savedState as LobbyState) || "empty";
    }
    return "empty";
  });

  const [lobbyData, setLobbyData] = useState<LobbyData | null>(() => {
    if (typeof window !== "undefined") {
      const savedData = localStorage.getItem("garden_lobby_data");
      return savedData ? JSON.parse(savedData) : null;
    }
    return null;
  });

  const router = useRouter();

  // Lobby helper functions
  const saveLobbyData = (state: LobbyState, data: LobbyData | null) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("garden_lobby_state", state);
      if (data) {
        localStorage.setItem("garden_lobby_data", JSON.stringify(data));
      } else {
        localStorage.removeItem("garden_lobby_data");
      }
    }
  };

  const clearLobbyData = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("garden_lobby_state");
      localStorage.removeItem("garden_lobby_data");
    }
  };

  // Update localStorage whenever lobbyState or lobbyData changes
  useEffect(() => {
    saveLobbyData(lobbyState, lobbyData);
  }, [lobbyState, lobbyData]);

  // Determine if user is in a lobby (hosting or joined)
  const isInLobby = lobbyState === "hosting" || lobbyState === "joined";

  // Handle panel resizing
  const handleDragStart = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartY(e.clientY);
    setDragStartSplit(panelSplit);
    e.preventDefault();
  };

  const handleDoubleClick = () => {
    setPanelSplit(50); // Reset to default (within new constraints)
    if (typeof window !== "undefined") {
      localStorage.setItem("gardenPanelSplit", "50");
    }
  };

  const handleDragMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const containerHeight = window.innerHeight * 0.8; // Approximate container height
    const deltaY = e.clientY - dragStartY;
    const deltaPercentage = (deltaY / containerHeight) * 100;

    const newSplit = Math.max(
      minPanelSplit,
      Math.min(maxPanelSplit, dragStartSplit + deltaPercentage)
    );
    setPanelSplit(newSplit);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    // Save the panel split to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("gardenPanelSplit", panelSplit.toString());
    }
  };

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleDragMove);
      document.addEventListener("mouseup", handleDragEnd);
      document.body.style.cursor = "ns-resize";
      document.body.style.userSelect = "none";

      return () => {
        document.removeEventListener("mousemove", handleDragMove);
        document.removeEventListener("mouseup", handleDragEnd);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }
  }, [isDragging, dragStartY, dragStartSplit, panelSplit]);

  // Handle authentication status changes
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Not authenticated, redirect to login
      router.push("/login");
    } else if (error) {
      addNotification("error", "Authentication error. Please log in again.");
      router.push("/login");
    } else if (isAuthenticated && user && !user.hasNotionTokens) {
      // Google authenticated but Notion not connected, redirect to login
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, user, error, router, addNotification]);

  // Show loading while checking auth
  if (isLoading) {
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

  // Don't render the garden if not properly authenticated
  if (!isAuthenticated || !user || !user.hasNotionTokens) {
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
        Redirecting to login...
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
            ? `url("/ui/mouse_click.png") 0 0, auto`
            : `url("/ui/mouse_idle.png") 0 0, auto`,
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
              <GardenMenu pixiApp={pixiApp} isInLobby={isInLobby} lobbyCode={lobbyData?.code} />
              <GardenSettings />
              <GardenIcons />
            </div>

            <div
              className="w-3/10 flex flex-col h-full"
              style={{ border: `5px solid ${BORDERLINE}`, backgroundColor: BORDERFILL }}
            >
              <div
                style={{
                  height: isMinimized ? "calc(100% - 40px)" : `${panelSplit}%`,
                  minHeight: 100,
                  padding: "10px",
                  backgroundColor: PANELFILL,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <GardenTasks />
              </div>

              {/* Draggable divider - only show when not minimized */}
              {!isMinimized && (
                <div
                  style={{
                    height: "10px",
                    backgroundColor: isDragging ? FONTCOLOR : BORDERLINE,
                    cursor: "ns-resize",
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderTop: `2px solid ${BORDERFILL}`,
                    borderBottom: `2px solid ${BORDERFILL}`,
                    transition: isDragging ? "none" : "background-color 0.2s ease",
                  }}
                  onMouseDown={handleDragStart}
                  onDoubleClick={handleDoubleClick}
                  onMouseEnter={(e) => {
                    if (!isDragging) {
                      e.currentTarget.style.backgroundColor = FONTCOLOR;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isDragging) {
                      e.currentTarget.style.backgroundColor = BORDERLINE;
                    }
                  }}
                >
                  {/* Drag handle indicator */}
                  <div
                    style={{
                      width: "30px",
                      height: "3px",
                      backgroundColor: BORDERFILL,
                      borderRadius: "2px",
                      opacity: 0.8,
                      boxShadow: isDragging ? `0 0 5px ${BORDERFILL}` : "none",
                    }}
                  />
                </div>
              )}

              {!isMinimized ? (
                <div
                  style={{
                    height: `${100 - panelSplit}%`,
                    backgroundColor: PANELFILL,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                  }}
                >
                  <MinimizableToolsPanel
                    isMinimized={isMinimized}
                    setIsMinimized={setIsMinimized}
                    lobbyState={lobbyState}
                    lobbyData={lobbyData}
                    onLobbyStateChange={setLobbyState}
                    onLobbyDataChange={setLobbyData}
                  />
                </div>
              ) : (
                <div
                  style={{
                    height: "40px",
                    backgroundColor: PANELFILL,
                    borderTop: `5px solid ${BORDERLINE}`,
                  }}
                >
                  <MinimizableToolsPanel
                    isMinimized={isMinimized}
                    setIsMinimized={setIsMinimized}
                    lobbyState={lobbyState}
                    lobbyData={lobbyData}
                    onLobbyStateChange={setLobbyState}
                    onLobbyDataChange={setLobbyData}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </NotificationProvider>
  );
}
