"use client";

import * as PIXI from "pixi.js";
import GardenCanvas from "@/components/garden/GardenCanvas";
import MinimizableToolsPanel from "@/components/garden/tools/MinimizableToolsPanel";
import GardenMenu from "@/components/garden/ui/GardenMenu";
import GardenTasks from "@/components/garden/tasks/GardenTasks";
import GardenSettings from "@/components/garden/ui/GardenSettings";
import GardenIcons from "@/components/garden/GardenIcons";
import { NotificationProvider, useGlobalNotification } from "@/components/NotificationProvider";
import { ReduxProvider } from "@/store/ReduxProvider";
import {
  setGlobalStructureClickHandler,
  clearGlobalStructureClickHandler,
} from "@/utils/globalStructureHandler";
import { useSessionAuth } from "@/hooks/useSessionAuth";
import { useReduxAuth, useAutoFetchProfilePicture } from "@/store/integrationHooks";
import { useSubscription } from "@/hooks/useSubscription";
import { useVisualWorldSync } from "@/hooks/useVisualWorldSync";
import { ReduxTest } from "@/components/ReduxTest";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/store/store";
import { initializePlotsFromConfig, fetchStructureInventory } from "@/store/slices/worldSlice";
import { clearLevelConfigCache } from "@/engine/DefaultWorld";
import { localDataManager } from "@/utils/localDataManager";
import { useTutorial } from "@/components/tutorial/TutorialContext";
import { phase2And3TestTutorial } from "@/config/tutorials";

import { FONTCOLOR, BORDERFILL, BORDERLINE, PANELFILL } from "@/components/constants";
import { useState, useEffect, useCallback } from "react";
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
    <ReduxProvider>
      <NotificationProvider>
        <GardenPageContent />
      </NotificationProvider>
    </ReduxProvider>
  );
}

function GardenPageContent() {
  const { addNotification } = useGlobalNotification();
  const { isAuthenticated, isLoading, user, error } = useSessionAuth();
  const dispatch = useDispatch<AppDispatch>();
  const { startTutorial } = useTutorial();

  // Auto-fetch user's profile picture when authenticated
  useAutoFetchProfilePicture();

  // Check subscription status for premium features
  const { isPaid: hasSubscription, isLoading: subscriptionLoading } = useSubscription(); // Enable visual world synchronization between Redux and PIXI
  useVisualWorldSync();

  const [isClicking, setIsClicking] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [pixiApp, setPixiApp] = useState<PIXI.Application | undefined>(undefined); // PIXI.js Application state
  const [showTestButton, setShowTestButton] = useState(true);

  // Shop modal opener function
  const [shopOpenerRef, setShopOpenerRef] = useState<(() => void) | null>(null);

  // Memoize the shop opener callback to prevent infinite re-renders
  const handleShopModalOpen = useCallback((shopOpener: () => void) => {
    setShopOpenerRef(() => shopOpener);
  }, []);

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

  // Initialize plots when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user?.userId && !isLoading) {
      // Clear all cached data to ensure we get fresh data from PostgreSQL database

      clearLevelConfigCache();
      localDataManager.invalidateLevelConfig(user.userId);
      localDataManager.invalidateInventory(user.userId);

      // Initialize plots and inventory from fresh database data
      // Dispatch both calls to ensure they complete before UI calculates inventory
      const initializeData = async () => {
        try {
          await Promise.all([
            dispatch(initializePlotsFromConfig(user.userId)),
            dispatch(fetchStructureInventory(user.userId)),
          ]);
        } catch (error) {
          console.error("❌ Error loading initial data:", error);
        }
      };

      initializeData();
    }
  }, [isAuthenticated, user?.userId, isLoading, dispatch]);

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

  // Check if user should see tutorial and trigger Phase 2 & 3
  useEffect(() => {
    if (!isAuthenticated || !user || isLoading) return;

    // Check if tutorial was already completed
    const tutorialCompleted = localStorage.getItem("phase2and3-tutorial-completed");

    if (!tutorialCompleted) {
      // Wait a bit for the garden to load before starting tutorial
      const timer = setTimeout(() => {
        startTutorial(phase2And3TestTutorial);
      }, 1500); // 1.5 second delay to let garden render

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user, isLoading, startTutorial]);

  // Handler for manual tutorial trigger (test button)
  const handleStartTutorial = () => {
    startTutorial(phase2And3TestTutorial);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-3xl text-gray-800">
        Loading garden...
      </div>
    );
  }

  if (!isAuthenticated || !user || !user.hasNotionTokens) {
    return (
      <div className="flex items-center justify-center h-screen text-3xl text-gray-800">
        Redirecting to login...
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
          ? `url("/ui/mouse_click.png") 0 0, auto`
          : `url("/ui/mouse_idle.png") 0 0, auto`,
        color: FONTCOLOR,
        textShadow: `1px 1px 1px ${BORDERFILL}`,
      }}
      onMouseDown={() => setIsClicking(true)}
      onMouseUp={() => setIsClicking(false)}
      onMouseLeave={() => setIsClicking(false)}
    >
      {/* Tutorial Test Button - DEV ONLY */}
      {showTestButton && (
        <button
          onClick={handleStartTutorial}
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            zIndex: 9999,
            padding: "10px 20px",
            backgroundColor: PANELFILL,
            border: `3px solid ${BORDERLINE}`,
            borderRadius: "8px",
            color: FONTCOLOR,
            fontWeight: "bold",
            cursor: "pointer",
            fontSize: "14px",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.2)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = BORDERFILL;
            e.currentTarget.style.transform = "scale(1.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = PANELFILL;
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          🎓 Test Tutorial
        </button>
      )}
      {/* <ReduxTest /> */}
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
                setPixiApp(app);
              }}
              userId={user?.userId} // Pass the real user ID to the canvas
            />
            <GardenMenu
              pixiApp={pixiApp}
              isInLobby={isInLobby}
              lobbyCode={lobbyData?.code}
              onShopClick={() => {
                if (shopOpenerRef) {
                  shopOpenerRef();
                }
              }}
            />
            <GardenSettings />
            <GardenIcons onShopModalOpen={handleShopModalOpen} />
          </div>

          <div
            className="w-3/10 flex flex-col h-full"
            style={{ border: `5px solid ${BORDERLINE}`, backgroundColor: BORDERFILL }}
          >
            <div
              className="p-2.5 flex flex-col"
              style={{
                height: isMinimized ? "calc(100% - 40px)" : `${panelSplit}%`,
                minHeight: 100,
                backgroundColor: PANELFILL,
              }}
            >
              <GardenTasks />
            </div>

            {/* Draggable divider - only show when not minimized */}
            {!isMinimized && (
              <div
                className="h-3 cursor-ns-resize relative flex items-center justify-center"
                style={{
                  backgroundColor: isDragging ? FONTCOLOR : BORDERLINE,
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
                <div
                  className="w-7 h-1 rounded opacity-80"
                  style={{
                    backgroundColor: BORDERFILL,
                    boxShadow: isDragging ? `0 0 5px ${BORDERFILL}` : "none",
                  }}
                />
              </div>
            )}

            {!isMinimized ? (
              <div
                className="flex flex-col overflow-hidden"
                style={{
                  height: `${100 - panelSplit}%`,
                  backgroundColor: PANELFILL,
                }}
              >
                <MinimizableToolsPanel
                  isMinimized={isMinimized}
                  setIsMinimized={setIsMinimized}
                  lobbyState={lobbyState}
                  lobbyData={lobbyData}
                  onLobbyStateChange={setLobbyState}
                  onLobbyDataChange={setLobbyData}
                  hasSubscription={hasSubscription}
                  subscriptionLoading={subscriptionLoading}
                />
              </div>
            ) : (
              <div
                className="h-10"
                style={{
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
                  hasSubscription={hasSubscription}
                  subscriptionLoading={subscriptionLoading}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
