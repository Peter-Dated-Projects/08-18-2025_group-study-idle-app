import { useState, useEffect, useCallback } from "react";
import { HeaderFont } from "./utils";

export const AUTH_TOKEN_KEY = "auth_token";

interface Task {
  id: string;
  title: string;
  completed: boolean;
  notionUrl?: string;
  createdTime?: string;
  lastEditedTime?: string;
}

interface NotionDatabase {
  id: string;
  title: string;
  url?: string;
  created_time?: string;
  last_edited_time?: string;
}

interface SelectedDatabase {
  id: string;
  title: string;
  selectedAt: string;
}

export default function GardenTasks() {
  const [isLoading, setIsLoading] = useState(true); // Start with loading state
  const [isConnected, setIsConnected] = useState(false);
  const [taskList, setTaskList] = useState<Task[]>([]);
  const [databases, setDatabases] = useState<NotionDatabase[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<SelectedDatabase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [showDatabaseSelector, setShowDatabaseSelector] = useState(false);

  // Google Auth state
  const [isGoogleSignedIn, setIsGoogleSignedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [previousEmail, setPreviousEmail] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [hasProcessedRedirect, setHasProcessedRedirect] = useState(false);

  // Check session on component mount
  useEffect(() => {
    checkUserSession().finally(() => {
      setIsLoading(false);
    });
  }, []);

  // Handle OAuth redirect success
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authSuccess = urlParams.get("auth");
    const authError = urlParams.get("error");

    // Only process redirect once
    if (hasProcessedRedirect) return;

    if (authSuccess === "success") {
      setHasProcessedRedirect(true);

      // Clear URL parameters immediately to prevent multiple processing
      const url = new URL(window.location.href);
      url.search = ""; // Clear all search parameters
      window.history.replaceState({}, "", url.toString());

      // Check auth status and reload user data
      setIsLoading(true);
      checkUserSession().finally(() => {
        setIsLoading(false);
      });
    } else if (authError) {
      setHasProcessedRedirect(true);
      setError(`Authentication failed: ${decodeURIComponent(authError)}`);

      // Clear URL parameters
      const url = new URL(window.location.href);
      url.search = ""; // Clear all search parameters
      window.history.replaceState({}, "", url.toString());
    }
  }, [hasProcessedRedirect]);

  // Check user session from server
  const checkUserSession = async () => {
    try {
      const response = await fetch("/api/gauth/session", {
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok && data.success && data.userEmail) {
        setIsGoogleSignedIn(true);
        setUserEmail(data.userEmail);
        setPreviousEmail(null); // Clear previous email since we have an active session
        await checkAuthStatus();
      } else {
        // No active session, but check if we have a previous email
        if (data.previousEmail) {
          setPreviousEmail(data.previousEmail);
        }
      }
    } catch (error) {
      console.error("Error checking user session:", error);
    }
  };

  // Load tasks when database is selected
  useEffect(() => {
    if (isConnected && selectedDatabase) {
      loadTasks();
    }
  }, [isConnected, selectedDatabase]);

  const checkAuthStatus = useCallback(async () => {
    try {
      if (!isGoogleSignedIn) {
        setIsConnected(false);
        return;
      }

      const response = await fetch("/api/notion/auth/check", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.hasValidTokens) {
          setIsConnected(true);
          await loadTasks();
        } else {
          setIsConnected(false);
        }
      } else {
        setIsConnected(false);
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      setIsConnected(false);
    }
  }, [isGoogleSignedIn]); // Remove loadTasks from dependency array

  const loadTasks = async () => {
    if (!selectedDatabase) return;

    try {
      setError(null);
      const response = await fetch(`/api/notion/tasks?databaseId=${selectedDatabase.id}`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setTaskList(data.tasks || []);
      } else {
        const errorData = await response.json();

        // Handle token expiration specifically
        if (errorData.needsReauth) {
          setError("Your Notion connection has expired. Please reconnect your account.");
          setIsConnected(false);
          // Optionally, you could automatically trigger re-authentication here
        } else {
          setError(errorData.error || "Failed to load tasks");
        }
      }
    } catch (err) {
      console.error("Error loading tasks:", err);
      setError("Failed to load tasks");
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      setError(null);

      // Use redirect-based OAuth instead of popup
      const returnUrl = encodeURIComponent(window.location.href);
      window.location.href = `/api/gauth/start?returnUrl=${returnUrl}`;

      // Note: The page will redirect, so this code won't continue
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      setError(`Failed to start Google sign-in: ${error.message}`);
      setIsSigningIn(false);
    }
  };
  const handleGoogleSignOut = async () => {
    try {
      setError(null);

      // Clear server session
      await fetch("/api/gauth/logout", {
        method: "POST",
        credentials: "include",
      });

      // Reset all local state
      setIsGoogleSignedIn(false);
      setUserEmail(null);
      setPreviousEmail(null);
      setIsConnected(false);
      setTaskList([]);
      setSelectedDatabase(null);
      setDatabases([]);
      setShowDatabaseSelector(false);
    } catch (error: any) {
      console.error("Sign out error:", error);
      setError(`Failed to sign out: ${error.message}`);
    }
  };

  const selectDatabase = async (database: NotionDatabase) => {
    try {
      const response = await fetch("/api/notion/database-selection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          databaseId: database.id,
          databaseTitle: database.title,
        }),
      });

      if (response.ok) {
        setSelectedDatabase({
          id: database.id,
          title: database.title,
          selectedAt: new Date().toISOString(),
        });
        setShowDatabaseSelector(false);
        // Tasks will load automatically via useEffect
      } else {
        const errorData = await response.json();

        // Handle token expiration specifically
        if (errorData.needsReauth) {
          setError("Your Notion connection has expired. Please reconnect your account.");
          setIsConnected(false);
        } else {
          setError(errorData.error || "Failed to select database");
        }
      }
    } catch (err) {
      console.error("Error selecting database:", err);
      setError("Failed to select database");
    }
  };

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !selectedDatabase || isCreatingTask) return;

    setIsCreatingTask(true);
    try {
      const response = await fetch(`/api/notion/tasks?databaseId=${selectedDatabase.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          title: newTaskTitle.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTaskList((prev: Task[]) => [data.task, ...prev]);
        setNewTaskTitle("");
      } else {
        const errorData = await response.json();

        // Handle token expiration specifically
        if (errorData.needsReauth) {
          setError("Your Notion connection has expired. Please reconnect your account.");
          setIsConnected(false);
        } else {
          setError(errorData.error || "Failed to create task");
        }
      }
    } catch (err) {
      console.error("Error creating task:", err);
      setError("Failed to create task");
    } finally {
      setIsCreatingTask(false);
    }
  };

  const toggleTaskCompletion = async (taskId: string, currentCompleted: boolean) => {
    try {
      const response = await fetch(`/api/notion/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          completed: !currentCompleted,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTaskList((prev: Task[]) =>
          prev.map((task: Task) =>
            task.id === taskId ? { ...task, completed: data.task.completed } : task
          )
        );
      } else {
        const errorData = await response.json();

        // Handle token expiration specifically
        if (errorData.needsReauth) {
          setError("Your Notion connection has expired. Please reconnect your account.");
          setIsConnected(false);
        } else {
          setError(errorData.error || "Failed to update task");
        }
      }
    } catch (err) {
      console.error("Error updating task:", err);
      setError("Failed to update task");
    }
  };

  const loadDatabases = async () => {
    try {
      setError(null);
      const response = await fetch("/api/notion/databases", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setDatabases(data.databases || []);
        setShowDatabaseSelector(true);
      } else {
        const errorData = await response.json();

        // Handle token expiration specifically
        if (errorData.needsReauth) {
          setError("Your Notion connection has expired. Please reconnect your account.");
          setIsConnected(false);
        } else {
          setError(errorData.error || "Failed to load databases");
        }
      }
    } catch (err) {
      console.error("Error loading databases:", err);
      setError("Failed to load databases");
    }
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

  // notion database not connected
  if (!isConnected) {
    return (
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            userSelect: "none",
            marginBottom: "20px",
          }}
        >
          <img
            src="/icon.png"
            alt="Icon"
            style={{ width: 40, height: 40, marginRight: 12, userSelect: "none" }}
          />
          <h1
            style={{
              fontFamily: HeaderFont,
              fontSize: "32px",
              margin: 0,
              userSelect: "none",
            }}
          >
            Task List
          </h1>
        </div>

        {error && (
          <div
            style={{
              padding: "12px",
              background: "#fee",
              border: "1px solid #fcc",
              borderRadius: "6px",
              marginBottom: "16px",
              color: "#c00",
            }}
          >
            {error}
          </div>
        )}

        {!isGoogleSignedIn ? (
          <div style={{ textAlign: "center", padding: "20px" }}>
            {previousEmail ? (
              <>
                <p style={{ marginBottom: "10px" }}>
                  Welcome back! Continue as <strong>{previousEmail}</strong>?
                </p>
                <p style={{ marginBottom: "20px", fontSize: "14px", color: "#666" }}>
                  Your session has expired. Sign in again to continue.
                </p>
              </>
            ) : (
              <p style={{ marginBottom: "20px" }}>
                Sign in with Google to access your tasks and sync with Notion!
              </p>
            )}
            <div className="mt-4 text-center">
              <button
                onClick={handleGoogleSignIn}
                disabled={isSigningIn}
                className={`inline-flex items-center justify-center gap-2 bg-gray-200 text-white px-6 py-3 rounded-lg font-bold transition-opacity ${
                  isSigningIn ? "opacity-70 cursor-not-allowed" : "hover:bg-blue-700"
                }`}
                style={{
                  border: "1px solid #ccc", // Add a small border
                  textShadow: "0px 0px 2px #000",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <g>
                    <path
                      fill="#4285F4"
                      d="M21.805 12.217c0-.638-.057-1.252-.163-1.837H12v3.478h5.548a4.74 4.74 0 0 1-2.057 3.113v2.583h3.323c1.943-1.79 3.05-4.428 3.05-7.337z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 22c2.7 0 4.97-.89 6.627-2.418l-3.323-2.583c-.92.62-2.09.99-3.304.99-2.54 0-4.69-1.72-5.46-4.03H2.41v2.602A9.997 9.997 0 0 0 12 22z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M6.54 13.959A5.996 5.996 0 0 1 6.09 12c0-.682.12-1.342.33-1.959V7.44H2.41A9.997 9.997 0 0 0 2 12c0 1.57.38 3.05 1.05 4.36l3.49-2.401z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 6.58c1.47 0 2.78.51 3.81 1.51l2.86-2.86C16.97 3.89 14.7 3 12 3 7.58 3 3.73 5.81 2.41 7.44l3.49 2.601C7.31 8.3 9.46 6.58 12 6.58z"
                    />
                  </g>
                </svg>
                {isSigningIn ? "Signing in..." : previousEmail ? "Continue" : "Sign in with Google"}
              </button>
              {previousEmail && (
                <p style={{ marginTop: "10px", fontSize: "12px", color: "#666" }}>
                  Or{" "}
                  <button
                    onClick={() => {
                      setPreviousEmail(null);
                      handleGoogleSignIn();
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#007bff",
                      textDecoration: "underline",
                      cursor: "pointer",
                      fontSize: "12px",
                      padding: "0",
                    }}
                  >
                    sign in with a different account
                  </button>
                </p>
              )}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <p style={{ marginBottom: "10px" }}>Welcome, {userEmail}!</p>
            <p style={{ marginBottom: "20px" }}>Now connect your Notion workspace to sync tasks!</p>
            <button
              onClick={() => {
                const returnUrl = encodeURIComponent(window.location.href);
                window.location.href = `/api/notion/start?returnUrl=${returnUrl}`;
              }}
              className="inline-block bg-black text-white px-6 py-3 rounded-lg font-bold cursor-pointer transition-colors hover:bg-gray-900"
            >
              Connect to Notion
            </button>

            <p>After connecting, you will be able to sync your tasks between Google and Notion.</p>

            <button
              className="inline-block bg-black text-white px-6 py-3 rounded-lg font-bold cursor-pointer transition-colors hover:bg-red-700"
              onClick={() => {
                handleGoogleSignOut();
              }}
            >
              Log out from Google
            </button>
          </div>
        )}
      </div>
    );
  }

  if (showDatabaseSelector && databases.length > 0) {
    return (
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            userSelect: "none",
            marginBottom: "20px",
          }}
        >
          <img
            src="/icon.png"
            alt="App Icon"
            style={{ width: 40, height: 40, marginRight: 12, userSelect: "none" }}
          />
          <h1
            style={{
              fontFamily: HeaderFont,
              fontSize: "32px",
              margin: 0,
              userSelect: "none",
            }}
          >
            Select Database
          </h1>
        </div>
        <div>
          <p style={{ marginBottom: "20px" }}>
            Choose which Notion database to use for your tasks:
          </p>
          <div style={{ display: "grid", gap: "12px" }}>
            {databases.map((db: NotionDatabase) => (
              <button
                key={db.id}
                onClick={() => selectDatabase(db)}
                style={{
                  padding: "12px 16px",
                  border: "2px solid #ccc",
                  borderRadius: "8px",
                  background: "#fff",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = "#000";
                  e.currentTarget.style.background = "#f5f5f5";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = "#ccc";
                  e.currentTarget.style.background = "#fff";
                }}
              >
                <strong>{db.title}</strong>
                {db.url && (
                  <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>{db.url}</div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

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
