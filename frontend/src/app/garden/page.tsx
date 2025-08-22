"use client";

import GardenCanvas from "@/components/GardenCanvas";
import MusicSync from "@/components/MusicSync";
import GardenMenu from "@/components/GardenMenu";
import GardenTasks from "@/components/GardenTasks";
import * as PIXI from "pixi.js";

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

  // Database selection state
  const [databases, setDatabases] = useState<NotionDatabase[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<{ id: string; title: string } | null>(
    null
  );
  const [isLoadingDatabases, setIsLoadingDatabases] = useState(false);
  const [showDatabaseDropdown, setShowDatabaseDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  // Check authentication status on mount
  useEffect(() => {
    checkAuthenticationStatus();
  }, []);

  // Load databases after authentication is confirmed
  useEffect(() => {
    if (!isCheckingAuth) {
      loadDatabases();
      loadCurrentSelectedDatabase();
    }
  }, [isCheckingAuth]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDatabaseDropdown) {
        const target = event.target as HTMLElement;
        if (!target.closest(".database-dropdown-container")) {
          setShowDatabaseDropdown(false);
        }
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showDatabaseDropdown]);

  const loadDatabases = async () => {
    try {
      setIsLoadingDatabases(true);
      setError(null);

      const response = await fetch("/api/notion/databases/enabled", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        const databases = data.databases || [];
        setDatabases(databases);

        // Set the first enabled database as default
        if (databases.length > 0) {
          const firstDb = databases[0];
          setSelectedDatabase({
            id: firstDb.id,
            title: extractPlainText(firstDb.title),
          });
        }
      } else {
        const errorData = await response.json();
        if (errorData.needsReauth) {
          setError("Your Notion connection has expired. Please reconnect your account.");
          router.push("/login");
        } else {
          setError(errorData.error || "Failed to load enabled databases");
        }
      }
    } catch (err) {
      console.error("Error loading enabled databases:", err);
      setError("Failed to load enabled databases");
    } finally {
      setIsLoadingDatabases(false);
    }
  };

  const loadCurrentSelectedDatabase = async () => {
    try {
      const response = await fetch("/api/notion/session", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.selectedDatabase) {
          setSelectedDatabase(data.selectedDatabase);
        }
      }
    } catch (err) {
      console.error("Error loading current selected database:", err);
    }
  };

  const handleSelectDatabase = async (database: NotionDatabase) => {
    try {
      setError(null);
      const plainTitle = extractPlainText(database.title);

      // Show immediate feedback
      setSelectedDatabase({ id: database.id, title: plainTitle });
      setShowDatabaseDropdown(false);

      const response = await fetch("/api/notion/databases/select", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          id: database.id,
          title: plainTitle,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to select database");
      }

      const data = await response.json();

      // Emit a custom event to notify components that the database changed
      const databaseChangeEvent = new CustomEvent("databaseChanged", {
        detail: {
          databaseId: database.id,
          databaseTitle: plainTitle,
        },
      });
      window.dispatchEvent(databaseChangeEvent);
    } catch (err) {
      console.error("Error selecting database:", err);
      setError("Failed to select database");
    }
  };

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
            {/* Database Selector */}
            <div
              style={{
                padding: "10px",
                backgroundColor: PANELFILL,
                borderBottom: `3px solid ${BORDERLINE}`,
                minHeight: "60px",
              }}
            >
              <div className="flex flex-col gap-2 database-dropdown-container relative">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium" style={{ color: FONTCOLOR }}>
                    Current Database:
                  </span>
                  <button
                    onClick={() => setShowDatabaseDropdown(!showDatabaseDropdown)}
                    className="text-xs px-2 py-1 rounded border"
                    style={{
                      backgroundColor: BORDERFILL,
                      border: `1px solid ${BORDERLINE}`,
                      color: FONTCOLOR,
                    }}
                    disabled={isLoadingDatabases}
                  >
                    {isLoadingDatabases ? "Loading..." : "Change"}
                  </button>
                </div>

                <div className="text-xs" style={{ color: FONTCOLOR }}>
                  {selectedDatabase ? selectedDatabase.title : "No database selected"}
                </div>

                {/* Dropdown */}
                {showDatabaseDropdown && (
                  <div
                    className="absolute z-10 mt-1 max-h-60 overflow-auto rounded border shadow-lg"
                    style={{
                      backgroundColor: PANELFILL,
                      border: `2px solid ${BORDERLINE}`,
                      width: "280px",
                      top: "100%",
                    }}
                  >
                    {databases.length > 0 ? (
                      databases.map((db: NotionDatabase) => (
                        <div
                          key={db.id}
                          onClick={() => handleSelectDatabase(db)}
                          className="px-3 py-2 cursor-pointer border-b hover:bg-opacity-80"
                          style={{
                            borderBottom: `1px solid ${BORDERLINE}`,
                            backgroundColor:
                              selectedDatabase?.id === db.id ? BORDERFILL : "transparent",
                            color: FONTCOLOR,
                          }}
                        >
                          <div className="text-sm font-medium">{extractPlainText(db.title)}</div>
                          <div className="text-xs opacity-70">ID: {db.id.substring(0, 8)}...</div>
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm" style={{ color: FONTCOLOR }}>
                        No databases found
                      </div>
                    )}
                  </div>
                )}

                {/* Error display */}
                {error && (
                  <div
                    className="text-xs p-2 rounded"
                    style={{
                      backgroundColor: "#fee",
                      border: "1px solid #fcc",
                      color: "#800",
                    }}
                  >
                    {error}
                  </div>
                )}
              </div>
            </div>

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
  );
}
