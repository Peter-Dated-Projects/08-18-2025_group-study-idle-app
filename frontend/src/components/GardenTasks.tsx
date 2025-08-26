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
  createdTime: string;
  lastEditedTime: string;
  notionUrl: string;
  properties?: Record<string, unknown>;
  archived: boolean;
}

export default function GardenTasks() {
  const [isLoading, setIsLoading] = useState(true);
  const [taskList, setTaskList] = useState<Task[]>([]);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [selectedSession, setSelectedSession] = useState<StudySession | null>(null);

  const { addNotification } = useGlobalNotification();

  // Auth states - simplified
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  const checkAuthentication = useCallback(async () => {
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
  }, []);

  const loadStudySessions = useCallback(async () => {
    try {
      setIsLoading(true);
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

      const data = await response.json();
      const sessions = (data.pages || []).map((page: unknown) => {
        const pageObj = page as {
          id: string;
          title?: string;
          createdTime: string;
          lastEditedTime: string;
          notionUrl: string;
          properties?: Record<string, unknown>;
          archived?: boolean;
        };

        return {
          id: pageObj.id,
          title: pageObj.title || "Untitled Session",
          createdTime: pageObj.createdTime,
          lastEditedTime: pageObj.lastEditedTime,
          notionUrl: pageObj.notionUrl,
          properties: pageObj.properties,
          archived: pageObj.archived || false,
        };
      });

      setStudySessions(sessions);

      // Auto-select the most recent session if none selected
      if (sessions.length > 0 && !selectedSession) {
        setSelectedSession(sessions[0]);
      }
    } catch (error) {
      console.error("Error loading study sessions:", error);
      addNotification({
        type: "error",
        message: `Failed to load study sessions: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    } finally {
      setIsLoading(false);
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

  const createNewStudySession = async () => {
    try {
      const response = await fetch("/api/notion/storage/pages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          title: `Study Session - ${new Date().toLocaleDateString()}`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create study session");
      }

      await response.json(); // Consume the response
      addNotification({
        type: "info",
        message: "New study session created successfully!",
      });

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
      <div className="flex items-center select-none mb-2">
        <Image
          src="/icon.png"
          alt="Icon"
          width={40}
          height={40}
          className="w-10 h-10 mr-3 select-none"
          priority
        />
        <h1 className="font-header text-3xl m-0 select-none" style={{ fontFamily: HeaderFont }}>
          Study Sessions
        </h1>
      </div>

      <div className="flex flex-col items-center w-full flex-1 min-h-0">
        <p className="mb-2 text-center w-full">Welcome, {userName || userEmail}!</p>

        {/* Study Session Selector */}
        <div className="mb-4 w-full max-w-6xl">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-800">
              Select Study Session ({studySessions.length} available)
            </h3>
            <button
              onClick={createNewStudySession}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
            >
              + New Session
            </button>
          </div>

          {studySessions.length > 0 ? (
            <select
              value={selectedSession?.id || ""}
              onChange={(e) => {
                const session = studySessions.find((s: StudySession) => s.id === e.target.value);
                if (session) handleSessionSelect(session);
              }}
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a study session...</option>
              {studySessions.map((session: StudySession) => (
                <option key={session.id} value={session.id}>
                  {session.title} - {new Date(session.createdTime).toLocaleDateString()}
                </option>
              ))}
            </select>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <p>No study sessions found. Create your first one!</p>
            </div>
          )}
        </div>

        {selectedSession && (
          <div className="mb-4 text-center">
            <h3 className="text-lg font-semibold text-gray-800">{selectedSession.title}</h3>
            <p className="text-sm text-gray-500">
              Created {new Date(selectedSession.createdTime).toLocaleDateString()} •{" "}
              {taskList.length} tasks
            </p>
          </div>
        )}

        {/* Task List Content */}
        <div className="flex-1 min-h-0 w-full max-w-6xl">
          <GardenTaskListContainer
            selectedSession={selectedSession}
            onTaskClick={(task: Task) => {
              console.log("Task clicked:", task);
            }}
            isAuthenticated={isAuthenticated}
            onRedirectToLogin={redirectToLogin}
            onDataLoaded={handleDataLoaded}
            onSessionRefresh={loadStudySessions}
          />
        </div>
      </div>
    </div>
  );
}
