import { useState, useEffect, useCallback } from "react";
import {
  HeaderFont,
  BodyFont,
  FONTCOLOR,
  SECONDARY_TEXT,
  SUCCESS_COLOR,
  ACCENT_COLOR,
  BORDERFILL,
  BORDERFILLLIGHT,
} from "@/components/constants";
import { useGlobalNotification } from "@/components/NotificationProvider";
import GardenTaskListContainer from "./GardenTaskListContainer";
import Image from "next/image.js";

interface Task {
  id: string;
  title: string;
  completed?: boolean;
  status?: string;
  dueDate?: string;
  priority?: string;
  assignee?: unknown;
  notionUrl?: string;
  createdTime?: string;
  lastEditedTime?: string;
  archived?: boolean;
}

interface StudySession {
  id: string;
  title: string;
  created_time: string;
  last_edited_time?: string;
  icon: {
    type: string;
    emoji?: string;
    external?: { url: string };
  } | null;
  url: string;
  archived?: boolean;
  properties?: {
    Name?: {
      title?: Array<{ text?: { content?: string } }>;
    };
    [key: string]: unknown;
  };
}

interface SessionUpdateResponse {
  updateSessions: boolean;
  updateTasks: boolean;
  [key: string]: unknown;
}

export default function GardenTasks() {
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [taskList, setTaskList] = useState<Task[]>([]);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [selectedSession, setSelectedSession] = useState<StudySession | null>(null);
  const [isEditingSessionName, setIsEditingSessionName] = useState(false);
  const [editingSessionName, setEditingSessionName] = useState("");

  // Caching state
  const [sessionsCache, setSessionsCache] = useState<StudySession[]>([]);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [sessionsHash, setSessionsHash] = useState<string>("");

  const { addNotification } = useGlobalNotification();

  // Auth states - simplified
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  // Cache expiration time (5 minutes)
  const CACHE_EXPIRATION_TIME = 5 * 60 * 1000;

  // Generate a simple hash from sessions data for change detection
  const generateSessionsHash = (sessions: StudySession[]): string => {
    const dataString = sessions
      .map(
        (session) =>
          `${session.id}-${session.created_time}-${
            session.properties?.Name?.title?.[0]?.text?.content || session.title
          }`
      )
      .sort()
      .join("|");

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  };

  const checkAuthentication = useCallback(async () => {
    setIsLoading(true);
    try {
      // Check Google OAuth session
      const authResponse = await fetch("/api/auth/session", {
        credentials: "include",
      });
      const authData = await authResponse.json();

      if (!authData.userId) {
        redirectToLogin();
        return;
      }

      setUserEmail(authData.userEmail);
      setUserName(authData.userName);

      // Check Notion OAuth session
      const notionResponse = await fetch("/api/notion/session", {
        credentials: "include",
      });
      const notionData = await notionResponse.json();

      if (!notionData.authenticated) {
        redirectToLogin();
        return;
      }

      setIsAuthenticated(true);
    } catch (error) {
      console.error("Authentication check failed:", error);
      redirectToLogin();
    }
    setIsLoading(false);
  }, []);

  const loadStudySessions = useCallback(
    async (forceRefresh: boolean = false) => {
      try {
        setIsUpdating(true);

        // Check if we can use cached data
        const now = Date.now();
        const isCacheValid =
          !forceRefresh && sessionsCache.length > 0 && now - lastFetchTime < CACHE_EXPIRATION_TIME;

        if (isCacheValid) {
          setStudySessions(sessionsCache);
          setIsUpdating(false);
          return;
        }

        console.log("Fetching fresh study sessions data");
        const response = await fetch("/api/notion/storage/pages", {
          credentials: "include",
        });

        if (!response.ok) {
          const errorData = await response.json();
          if (errorData.needsReauth) {
            addNotification(
              "error",
              "Your Notion connection has expired. Please reconnect your account."
            );
            redirectToLogin();
            return;
          }
          throw new Error(errorData.error || "Failed to load study sessions");
        }

        const responseData = await response.json();
        const fetchedSessions = responseData.results || [];

        // Generate hash for change detection
        const newHash = generateSessionsHash(fetchedSessions);

        // Only update if data has changed or it's the first load
        if (newHash !== sessionsHash || sessionsCache.length === 0) {
          console.log("Sessions data changed, updating cache");
          setStudySessions(fetchedSessions);
          setSessionsCache(fetchedSessions);
          setSessionsHash(newHash);
          setLastFetchTime(now);
        } else {
          console.log("No changes detected, using existing data");
          setStudySessions(sessionsCache);
        }
      } catch (error) {
        console.error("Error loading study sessions:", error);
        addNotification(
          "error",
          `Failed to load study sessions: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );

        // Fall back to cache if available
        if (sessionsCache.length > 0) {
          console.log("Using cached data as fallback");
          setStudySessions(sessionsCache);
        }
      } finally {
        setIsUpdating(false);
      }
    },
    [
      addNotification,
      sessionsCache,
      lastFetchTime,
      sessionsHash,
      CACHE_EXPIRATION_TIME,
      generateSessionsHash,
    ]
  );

  // Check if user is authenticated (both Google and Notion)
  useEffect(() => {
    checkAuthentication();
  }, [checkAuthentication]);

  // Load study sessions after authentication
  useEffect(() => {
    if (isAuthenticated) {
      console.log("being spammed");
      loadStudySessions();
    }
  }, [isAuthenticated]);

  const updateSessionsList = async () => {
    // This function is now simplified and delegates to loadStudySessions
    await loadStudySessions(true); // Force refresh to get latest data
  };

  const createNewStudySession = async () => {
    try {
      // Extract mm-dd-yyyy format for the session title
      const now = new Date();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const yyyy = now.getFullYear();
      const formattedDate = `${mm}-${dd}-${yyyy}`;

      const response = await fetch("/api/notion/storage/pages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          title: `${formattedDate} - Study Session`,
          icon_emoji: null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        addNotification(
          "error",
          `Failed to create study session: ${errorData.error || "Unknown error"}`
        );
        throw new Error(errorData.error || "Failed to create study session");
      }

      const responseData: SessionUpdateResponse = await response.json(); // Consume the response
      addNotification("info", "New study session created successfully!", true);

      // Check if we need to update anything
      if (responseData.updateSessions) {
        await updateSessionsList();
      } else {
        // Force refresh to include the new session
        await loadStudySessions(true);
      }
    } catch (error) {
      console.error("Error creating study session:", error);
      addNotification(
        "error",
        `Failed to create study session: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const redirectToLogin = () => {
    window.location.href = "/login";
  };

  const refreshSessionsCache = async () => {
    console.log("Manually refreshing sessions cache");
    await loadStudySessions(true);
  };

  const handleDataLoaded = (data: { taskList: Task[] }) => {
    setTaskList(data.taskList);
  };

  const handleSessionSelect = (session: StudySession) => {
    setSelectedSession(session);
  };

  // Transform session data to match GardenTaskListContainer interface
  const transformSessionForTaskList = (session: StudySession) => {
    return {
      id: session.id,
      title: session.title,
      createdTime: session.created_time,
      lastEditedTime: session.last_edited_time || session.created_time,
      notionUrl: session.url,
      archived: session.archived || false,
      properties: session.properties,
    };
  };

  const startEditingSessionName = () => {
    if (selectedSession) {
      const currentName =
        selectedSession.properties?.Name?.title?.[0]?.text?.content || selectedSession.title;
      setEditingSessionName(currentName);
      setIsEditingSessionName(true);
    }
  };

  const saveSessionName = async () => {
    if (!selectedSession || !editingSessionName.trim()) {
      setIsEditingSessionName(false);
      return;
    }

    try {
      const response = await fetch(`/api/notion/storage/pages/${selectedSession.id}/name`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: editingSessionName.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.needsReauth) {
          redirectToLogin();
          return;
        }
        throw new Error(errorData.error || "Failed to update session name");
      }

      // Update the local state
      setSelectedSession((prev: StudySession | null) => {
        if (!prev) return null;
        return {
          ...prev,
          properties: {
            ...prev.properties,
            Name: {
              title: [
                {
                  text: {
                    content: editingSessionName.trim(),
                  },
                },
              ],
            },
          },
        };
      });

      // Update the sessions list as well
      setStudySessions((prev: StudySession[]) =>
        prev.map((session: StudySession) =>
          session.id === selectedSession.id
            ? {
                ...session,
                properties: {
                  ...session.properties,
                  Name: {
                    title: [
                      {
                        text: {
                          content: editingSessionName.trim(),
                        },
                      },
                    ],
                  },
                },
              }
            : session
        )
      );

      // Also update the cache
      setSessionsCache((prev: StudySession[]) =>
        prev.map((session: StudySession) =>
          session.id === selectedSession.id
            ? {
                ...session,
                properties: {
                  ...session.properties,
                  Name: {
                    title: [
                      {
                        text: {
                          content: editingSessionName.trim(),
                        },
                      },
                    ],
                  },
                },
              }
            : session
        )
      );

      addNotification("info", "Session name updated successfully!");

      setIsEditingSessionName(false);
    } catch (error) {
      console.error("Error updating session name:", error);
      addNotification(
        "error",
        `Failed to update session name: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      setIsEditingSessionName(false);
    }
  };

  const cancelEditingSessionName = () => {
    setIsEditingSessionName(false);
    setEditingSessionName("");
  };

  // Show loading screen while checking authentication
  if (isLoading || (!selectedSession && isUpdating)) {
    return (
      <div className="h-full flex flex-col justify-center items-center text-center py-16">
        <div className="flex justify-center mb-6">
          <i className="fi fi-rr-loading text-6xl animate-spin" style={{ color: ACCENT_COLOR }}></i>
        </div>
        <h2
          className="text-2xl font-semibold mb-3"
          style={{ fontFamily: HeaderFont, color: FONTCOLOR }}
        >
          Loading Your Study Garden
        </h2>
        <p className="text-base max-w-md" style={{ color: SECONDARY_TEXT, fontFamily: BodyFont }}>
          Setting up your personalized study environment and checking your connections...
        </p>
      </div>
    );
  }

  // If not authenticated, this shouldn't show (should redirect), but just in case
  if (!isAuthenticated) {
    return (
      <div style={{ textAlign: "center", padding: "20px" }}>
        <p>Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="p-1 h-full flex flex-col">
      <div className="flex flex-col items-center w-full flex-1 min-h-0">
        {!selectedSession ? (
          /* No Session Selected - Show Selection UI */
          <div className="w-full max-w-6xl">
            {isUpdating ? (
              /* Show loading animation while updating sessions */
              <div className="min-h-96 flex flex-col justify-center items-center text-center">
                <div className="flex justify-center mb-6">
                  <i
                    className="fi fi-rr-loading text-6xl animate-spin"
                    style={{ color: ACCENT_COLOR }}
                  ></i>
                </div>
                <h2
                  className="text-2xl font-semibold mb-3"
                  style={{ fontFamily: HeaderFont, color: FONTCOLOR }}
                >
                  Loading Study Sessions
                </h2>
                <p
                  className="text-base max-w-md"
                  style={{ color: SECONDARY_TEXT, fontFamily: BodyFont }}
                >
                  Fetching your available study sessions from Notion...
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6" style={{ gap: "5px" }}>
                  <div className="flex items-center gap-3">
                    <i className="fi fi-rr-book text-2xl" style={{ color: ACCENT_COLOR }}></i>
                    <div>
                      <h3
                        className="text-xl font-semibold"
                        style={{ fontFamily: HeaderFont, color: FONTCOLOR }}
                      >
                        Select Study Session
                      </h3>
                      <p
                        className="text-sm"
                        style={{ color: SECONDARY_TEXT, fontFamily: BodyFont }}
                      >
                        {studySessions.length} available sessions
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={createNewStudySession}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg hover:shadow-md transition-all duration-200"
                    style={{
                      backgroundColor: SUCCESS_COLOR,
                      color: "white",
                      fontFamily: HeaderFont,
                      fontSize: "1rem",
                      maxWidth: "200px",
                    }}
                  >
                    <i className="fi fi-rr-plus text-sm"></i>
                    New Session
                  </button>
                </div>

                {studySessions.length > 0 ? (
                  <>
                    <select
                      value=""
                      onChange={(e) => {
                        const session = studySessions.find(
                          (s: StudySession) => s.id === e.target.value
                        );
                        if (session) handleSessionSelect(session);
                      }}
                      className="w-full p-4 rounded-lg border-2 transition-all duration-200"
                      style={{
                        borderColor: ACCENT_COLOR,
                        backgroundColor: "white",
                        color: FONTCOLOR,
                        fontFamily: BodyFont,
                        fontSize: "1rem",
                      }}
                    >
                      <option value="" style={{ color: SECONDARY_TEXT }}>
                        Choose a session to begin your study journey...
                      </option>
                      {studySessions.map((session: StudySession) => (
                        <option key={session.id} value={session.id}>
                          {session.properties?.Name?.title?.[0]?.text?.content || session.title}
                        </option>
                      ))}
                    </select>
                    <div className="text-center py-12">
                      <div className="flex justify-center mb-4">
                        <i
                          className="fi fi-rr-graduation-cap text-6xl"
                          style={{ color: ACCENT_COLOR }}
                        ></i>
                      </div>
                      <h4
                        className="text-lg font-medium mb-2"
                        style={{ fontFamily: HeaderFont, color: FONTCOLOR }}
                      >
                        Choose your session to continue
                      </h4>
                      <p
                        className="text-sm"
                        style={{ color: SECONDARY_TEXT, fontFamily: BodyFont }}
                      >
                        Select a study session from the dropdown above to view and manage your tasks
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <div className="flex justify-center mb-4">
                      <i
                        className="fi fi-rr-book-open text-6xl"
                        style={{ color: ACCENT_COLOR }}
                      ></i>
                    </div>
                    <h4
                      className="text-lg font-medium mb-2"
                      style={{ fontFamily: HeaderFont, color: FONTCOLOR }}
                    >
                      No study sessions found
                    </h4>
                    <p className="text-sm" style={{ color: SECONDARY_TEXT, fontFamily: BodyFont }}>
                      Create your first session to begin your learning journey!
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          /* Session Selected - Show Compact Header */
          <div className="w-full max-w-6xl">
            <div
              className="mb-6 p-5 rounded-lg"
              style={{ backgroundColor: "white", border: `2px solid ${ACCENT_COLOR}` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <i className="fi fi-rr-document text-xl" style={{ color: ACCENT_COLOR }}></i>
                    <div className="w-full max-w-[600px]">
                      {isEditingSessionName ? (
                        <input
                          type="text"
                          value={editingSessionName}
                          onChange={(e) => setEditingSessionName(e.target.value)}
                          onBlur={saveSessionName}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              saveSessionName();
                            } else if (e.key === "Escape") {
                              cancelEditingSessionName();
                            }
                          }}
                          className="text-lg font-semibold bg-transparent border-b-2 outline-none"
                          style={{
                            color: FONTCOLOR,
                            borderColor: ACCENT_COLOR,
                            fontFamily: HeaderFont,
                            width: "100%",
                            maxWidth: "600px",
                            boxSizing: "border-box",
                          }}
                          autoFocus
                        />
                      ) : (
                        <h3
                          className="text-lg font-semibold cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={startEditingSessionName}
                          title={
                            selectedSession.properties?.Name?.title?.[0]?.text?.content ||
                            selectedSession.title
                          }
                          style={{
                            color: FONTCOLOR,
                            fontFamily: HeaderFont,
                            width: "100%",
                            maxWidth: "600px",
                            boxSizing: "border-box",
                          }}
                        >
                          {(
                            selectedSession.properties?.Name?.title?.[0]?.text?.content ||
                            selectedSession.title
                          )?.length > 50
                            ? (
                                selectedSession.properties?.Name?.title?.[0]?.text?.content ||
                                selectedSession.title
                              ).slice(0, 50) + "..."
                            : selectedSession.properties?.Name?.title?.[0]?.text?.content ||
                              selectedSession.title}
                        </h3>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-6 ml-0">
                    <div className="flex items-center gap-2">
                      <i
                        className="fi fi-rr-calendar text-sm"
                        style={{ color: SECONDARY_TEXT }}
                      ></i>
                      <span
                        className="text-sm"
                        style={{ color: SECONDARY_TEXT, fontFamily: BodyFont }}
                      >
                        {new Date(selectedSession.created_time).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <i className="fi fi-rr-list text-sm" style={{ color: SECONDARY_TEXT }}></i>
                      <span
                        className="text-sm"
                        style={{ color: SECONDARY_TEXT, fontFamily: BodyFont }}
                      >
                        {taskList.length} tasks
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ml-4 hover:bg-accent hover:text-white text-bold"
                  style={{
                    color: ACCENT_COLOR,
                    fontFamily: BodyFont,
                    border: `1px solid ${ACCENT_COLOR}`,
                    fontSize: "0.875rem",
                    backgroundColor: "transparent",
                    maxWidth: "120px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = BORDERFILLLIGHT;
                    e.currentTarget.style.color = "white";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = ACCENT_COLOR;
                  }}
                >
                  <i className="fi fi-rr-arrow-small-left text-sm"></i>
                  Change Session
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Task List Content - Only show when session is selected */}
        {selectedSession && (
          <div className="flex-1 min-h-0 w-full max-w-6xl">
            <GardenTaskListContainer
              selectedSession={transformSessionForTaskList(selectedSession)}
              isAuthenticated={isAuthenticated}
              onRedirectToLogin={redirectToLogin}
              onDataLoaded={handleDataLoaded}
              onSessionRefresh={loadStudySessions}
            />
          </div>
        )}
      </div>
    </div>
  );
}
