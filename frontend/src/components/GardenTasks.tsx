import { useState, useEffect, useCallback } from "react";
import { HeaderFont } from "@/components/constants";
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
  icon: {
    type: string;
    emoji?: string;
    external?: { url: string };
  } | null;
  url: string;
  properties?: Record<string, any>;
}

interface SessionUpdateResponse {
  updateSessions: boolean;
  updateTasks: boolean;
  [any: string]: any;
}

export default function GardenTasks() {
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [taskList, setTaskList] = useState<Task[]>([]);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [selectedSession, setSelectedSession] = useState<StudySession | null>(null);
  const [isEditingSessionName, setIsEditingSessionName] = useState(false);
  const [editingSessionName, setEditingSessionName] = useState("");

  const { addNotification } = useGlobalNotification();

  // Auth states - simplified
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

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

  const loadStudySessions = useCallback(async () => {
    try {
      setIsUpdating(true);
      const response = await fetch("/api/notion/storage/pages", {
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.needsReauth) {
          addNotification({
            type: "error",
            message: "Your Notion connection has expired. Please reconnect your account.",
          });
          redirectToLogin();
          return;
        }
        throw new Error(errorData.error || "Failed to load study sessions");
      }

      await updateSessionsList();
    } catch (error) {
      console.error("Error loading study sessions:", error);
      addNotification({
        type: "error",
        message: `Failed to load study sessions: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    } finally {
      setIsUpdating(false);
    }
  }, [addNotification, selectedSession]);

  // Check if user is authenticated (both Google and Notion)
  useEffect(() => {
    checkAuthentication();
  }, [checkAuthentication]);

  // Load study sessions after authentication
  useEffect(() => {
    if (isAuthenticated) {
      loadStudySessions();
    }
  }, [isAuthenticated, loadStudySessions]);

  const updateSessionsList = async () => {
    // query notion for update sessions list
    try {
      const response = await fetch("/api/notion/storage/pages", {
        credentials: "include",
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error updating sessions list:", errorData);
        return;
      }

      // Retrieve Sessions Data
      const responseData = await response.json();
      setStudySessions(responseData.results || []);

      console.log(responseData.results);
    } catch (error) {
      console.error("Error updating sessions list:", error);
    }
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
        addNotification({
          type: "error",
          message: `Failed to create study session: ${errorData.error || "Unknown error"}`,
        });
        throw new Error(errorData.error || "Failed to create study session");
      }

      const responseData: SessionUpdateResponse = await response.json(); // Consume the response
      addNotification({
        type: "info",
        message: "New study session created successfully!",
      });

      // Check if we need to update anything
      if (responseData.updateSessions) {
        await updateSessionsList();
      }

      // Reload sessions to include the new one
      await loadStudySessions();
    } catch (error) {
      console.error("Error creating study session:", error);
      addNotification({
        type: "error",
        message: `Failed to create study session: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    }
  };

  const redirectToLogin = () => {
    window.location.href = "/login";
  };

  const handleDataLoaded = (data: { taskList: Task[] }) => {
    setTaskList(data.taskList);
  };

  const handleSessionSelect = (session: StudySession) => {
    setSelectedSession(session);
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
      setSelectedSession((prev) => {
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
      setStudySessions((prev) =>
        prev.map((session) =>
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

      addNotification({
        type: "info",
        message: "Session name updated successfully!",
      });

      setIsEditingSessionName(false);
    } catch (error) {
      console.error("Error updating session name:", error);
      addNotification({
        type: "error",
        message: `Failed to update session name: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
      setIsEditingSessionName(false);
    }
  };

  const cancelEditingSessionName = () => {
    setIsEditingSessionName(false);
    setEditingSessionName("");
  };

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "60vh",
          fontFamily: HeaderFont,
          fontSize: "2rem",
          color: "#333",
          letterSpacing: "1px",
        }}
      >
        Loading...
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
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Select Study Session</h3>
                <p>{studySessions.length} available</p>
              </div>
              <button
                onClick={createNewStudySession}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm"
              >
                + New Session
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
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Pick a Session to get started!</option>
                  {studySessions.map((session: StudySession) => (
                    <option key={session.id} value={session.id}>
                      {session.properties?.Name?.title?.[0]?.text?.content || session.title}
                    </option>
                  ))}
                </select>
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-3">📚</div>
                  <p className="text-lg font-medium mb-1">Pick a Session to get started!</p>
                  <p className="text-sm">
                    Select a study session from the dropdown above to view your tasks
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-3">📚</div>
                <p className="text-lg font-medium mb-1">No study sessions found</p>
                <p className="text-sm">Create your first session to get started!</p>
              </div>
            )}
          </div>
        ) : (
          /* Session Selected - Show Compact Header */
          <div className="w-full max-w-6xl">
            <div className="text-left">
              {isEditingSessionName ? (
                <div className="flex justify-start gap-2">
                  <Image
                    src="/icon.png"
                    alt="Session Icon"
                    width={24}
                    height={24}
                    className="inline-block"
                  />

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
                    className="text-lg font-semibold text-gray-800 bg-transparent border-b-2 border-blue-500 outline-none text-left"
                    autoFocus
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Image
                    src="/icon.png"
                    alt="Session Icon"
                    width={24}
                    height={24}
                    className="inline-block"
                  />
                  <h3
                    className="text-lg font-semibold text-gray-800 cursor-pointer hover:text-blue-600 transition-colors truncate max-w-full"
                    onClick={startEditingSessionName}
                    title={
                      selectedSession.properties?.Name?.title?.[0]?.text?.content ||
                      selectedSession.title
                    }
                    style={{
                      display: "block",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {selectedSession.properties?.Name?.title?.[0]?.text?.content ||
                      selectedSession.title}
                  </h3>
                </div>
              )}
              <p className="text-sm text-gray-500">
                Created {new Date(selectedSession.created_time).toLocaleDateString()} •{" "}
                {taskList.length} tasks
              </p>
              <button
                onClick={() => setSelectedSession(null)}
                className="mt-2 text-sm text-blue-500 hover:text-blue-700 underline"
              >
                ← Change Session
              </button>
            </div>
          </div>
        )}

        {/* Task List Content - Only show when session is selected */}
        {selectedSession && (
          <div className="flex-1 min-h-0 w-full max-w-6xl">
            <GardenTaskListContainer
              selectedSession={selectedSession}
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
