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
import { useReduxAuth } from "@/store/integrationHooks";
import { useSubscription } from "@/hooks/useSubscription";
import { useVisualWorldSync } from "@/hooks/useVisualWorldSync";
import { ReduxTest } from "@/components/ReduxTest";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/store/store";
import { initializePlotsFromConfig } from "@/store/slices/worldSlice";

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

  // Check subscription status for premium features
  const { isPaid: hasSubscription, isLoading: subscriptionLoading } = useSubscription();

  // Enable visual world synchronization between Redux and PIXI
  useVisualWorldSync();

  // Test Redux auth alongside existing auth (we'll switch over gradually)
  const reduxAuth = useReduxAuth();
  console.log("🔍 Redux Auth Status:", {
    isAuthenticated: reduxAuth.isAuthenticated,
    user: reduxAuth.user,
    isLoading: reduxAuth.isLoading,
    error: reduxAuth.error,
  });

  console.log("🔒 Subscription Status:", {
    hasSubscription,
    subscriptionLoading,
    userId: user?.userId,
  });

  const [isClicking, setIsClicking] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [pixiApp, setPixiApp] = useState<PIXI.Application | undefined>(undefined); // PIXI.js Application state

  // Shop modal opener function
  const [shopOpenerRef, setShopOpenerRef] = useState<(() => void) | null>(null);

  // Memoize the shop opener callback to prevent infinite re-renders
  const handleShopModalOpen = useCallback((shopOpener: () => void) => {
    setShopOpenerRef(() => shopOpener);
  }, []);

  // Lobby state management
  const [lobbyState, setLobbyState] = useState<LobbyState>("empty");
  const [lobbyData, setLobbyData] = useState<LobbyData | null>(null);
  const [isInLobby, setIsInLobby] = useState(false);

  // Panel split state for draggable divider
  const [panelSplit, setPanelSplit] = useState(60); // Default 60% for tasks, 40% for tools
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartSplit, setDragStartSplit] = useState(0);

  const router = useRouter();

  // Load panel split from localStorage
  useEffect(() => {
    const savedSplit = localStorage.getItem("gardenPanelSplit");
    if (savedSplit) {
      setPanelSplit(parseInt(savedSplit));
    }
  }, []);

  // Handle drag start
  const handleDragStart = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartY(e.clientY);
    setDragStartSplit(panelSplit);
  };

  // Handle drag move
  const handleDragMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const containerHeight = window.innerHeight - 200; // Approximate container height
      const deltaY = e.clientY - dragStartY;
      const deltaPercent = (deltaY / containerHeight) * 100;
      const newSplit = Math.max(20, Math.min(80, dragStartSplit + deltaPercent));

      setPanelSplit(newSplit);
    },
    [isDragging, dragStartY, dragStartSplit]
  );

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    localStorage.setItem("gardenPanelSplit", panelSplit.toString());
  }, [panelSplit]);

  // Handle double click to reset split
  const handleDoubleClick = () => {
    setPanelSplit(60);
    localStorage.setItem("gardenPanelSplit", panelSplit.toString());
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
      console.log("🏗️ Initializing plots for user:", user.userId);
      dispatch(initializePlotsFromConfig(user.userId));
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

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-3xl text-gray-700">
        Loading garden...
      </div>
    );
  }

  // Don't render the garden if not properly authenticated
  if (!isAuthenticated || !user || !user.hasNotionTokens) {
    return (
      <div className="flex items-center justify-center h-screen text-3xl text-gray-700">
        Redirecting to login...
      </div>
    );
  }

  return (
    <main
      className="flex flex-col min-h-screen w-full bg-[#e4be93ff] overflow-hidden border-5 border-[#a0622d] text-[#2c1810]"
      style={{
        cursor: isClicking
          ? `url("/ui/mouse_click.png") 0 0, auto`
          : `url("/ui/mouse_idle.png") 0 0, auto`,
        textShadow: `1px 1px 1px #e4be93ff`,
      }}
      onMouseDown={() => setIsClicking(true)}
      onMouseUp={() => setIsClicking(false)}
      onMouseLeave={() => setIsClicking(false)}
    >
      {/* <ReduxTest /> */}
      <div className="w-full h-full border-8 border-[#e4be93ff]">
        <div className="flex w-full h-full flex-1 gap-[10px] border-2 border-[#e4be93ff]">
          <div className="w-7/10 flex-1 border-5 border-[#a0622d] relative">
            <GardenCanvas
              onAppCreated={(app) => {
                console.log("PIXI App created:", app);
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

          <div className="w-3/10 flex flex-col h-full border-5 border-[#a0622d] bg-[#e4be93ff]">
            <div
              className="p-2.5 bg-[#fdf4e8] flex flex-col"
              style={{
                height: isMinimized ? "calc(100% - 40px)" : `${panelSplit}%`,
                minHeight: 100,
              }}
            >
              <GardenTasks />
            </div>

            {/* Draggable divider - only show when not minimized */}
            {!isMinimized && (
              <div
                className="h-2.5 cursor-ns-resize relative flex items-center justify-center border-t-2 border-b-2 border-[#e4be93ff] transition-colors duration-200"
                style={{
                  backgroundColor: isDragging ? "#2c1810" : "#a0622d",
                  transition: isDragging ? "none" : "background-color 0.2s ease",
                }}
                onMouseDown={handleDragStart}
                onDoubleClick={handleDoubleClick}
                onMouseEnter={(e) => {
                  if (!isDragging) {
                    e.currentTarget.style.backgroundColor = "#2c1810";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isDragging) {
                    e.currentTarget.style.backgroundColor = "#a0622d";
                  }
                }}
              >
                {/* Drag handle indicator */}
                <div
                  className="w-8 h-1 bg-[#e4be93ff] rounded opacity-80"
                  style={{
                    boxShadow: isDragging ? `0 0 5px #e4be93ff` : "none",
                  }}
                />
              </div>
            )}

            {!isMinimized ? (
              <div
                className="bg-[#fdf4e8] flex flex-col overflow-hidden"
                style={{
                  height: `${100 - panelSplit}%`,
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
              <div className="h-10 bg-[#fdf4e8] border-t-5 border-[#a0622d]">
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
