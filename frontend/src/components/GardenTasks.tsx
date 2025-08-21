import { useState, useEffect, useCallback } from "react";
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
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
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Monitor Google Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Auth state changed:", user ? user.email : "no user");

      if (user?.email) {
        console.log("User is signed in:", user.email);
        setIsGoogleSignedIn(true);
        setUserEmail(user.email);

        // Store user session via API
        try {
          const sessionId = generateSessionId();
          await storeUserSessionAPI(user.email, sessionId);
          console.log(`User authenticated: ${user.email} with session: ${sessionId}`);

          // Now check Notion auth status
          await checkAuthStatus();
        } catch (error) {
          console.error("Error storing user session:", error);
        }
      } else {
        console.log("No user signed in, clearing state");
        setIsGoogleSignedIn(false);
        setUserEmail(null);
        setIsConnected(false);
      }
    });

    // Check current auth state immediately (in case user is already signed in)
    console.log("Current auth user:", auth.currentUser);

    return () => unsubscribe();
  }, []);

  // Helper function to generate session ID
  function generateSessionId(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  // Load tasks when database is selected
  useEffect(() => {
    if (isConnected && selectedDatabase) {
      loadTasks();
    }
  }, [isConnected, selectedDatabase]);

  async function storeUserSessionAPI(userEmail: string, sessionId: string) {
    const response = await fetch("/api/auth/store-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        userId: userEmail,
        notionTokens: null,
        selectedDatabase: null,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    });
    if (!response.ok) throw new Error("Failed to store user session");
    return await response.json();
  }

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
      const response = await fetch(`/api/notion/tasks?databaseId=${selectedDatabase.id}`);

      if (response.ok) {
        const data = await response.json();
        setTaskList(data.tasks || []);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to load tasks");
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

      console.log("🔄 Starting Google sign-in popup...");
      console.log("Current domain:", window.location.origin);
      console.log("Firebase config authDomain:", process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN);
      console.log("Google OAuth Client ID:", process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID);

      // Use popup instead of redirect - this works without Firebase hosting
      const result = await signInWithPopup(auth, googleProvider);
      
      if (result?.user?.email) {
        console.log("✅ Popup sign-in successful:", result.user.email);
        // User state will be updated via onAuthStateChanged
      } else {
        console.log("⚠️ Sign-in completed but no user returned");
      }
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      
      // Handle specific popup errors
      if (error.code === "auth/popup-closed-by-user") {
        console.log("User closed the popup");
      } else if (error.code === "auth/popup-blocked") {
        setError("Popup was blocked. Please allow popups for this site and try again.");
      } else if (error.code === "auth/cancelled-popup-request") {
        console.log("Popup request was cancelled");
      } else {
        setError(`Failed to sign in with Google: ${error.message}`);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      setError(null);

      // Sign out from Firebase Auth
      await signOut(auth);

      // Reset all local state
      setIsGoogleSignedIn(false);
      setUserEmail(null);
      setIsConnected(false);
      setTaskList([]);
      setSelectedDatabase(null);
      setDatabases([]);
      setShowDatabaseSelector(false);

      console.log("User signed out successfully");
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
        setError("Failed to select database");
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
        setError(errorData.error || "Failed to create task");
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
        setError(errorData.error || "Failed to update task");
      }
    } catch (err) {
      console.error("Error updating task:", err);
      setError("Failed to update task");
    }
  };

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
            <p style={{ marginBottom: "20px" }}>
              Sign in with Google to access your tasks and sync with Notion!
            </p>
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
                {isSigningIn ? "Signing in..." : "Sign in with Google"}
              </button>
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

        {/*for debugging */}
        <div className="mt-4 text-center">
          <button
            onClick={() => {
              console.log("=== COMPREHENSIVE AUTH DEBUG ===");
              console.log("Firebase Auth State:");
              console.log("  Current User:", auth.currentUser);
              console.log("  User Email:", auth.currentUser?.email || "none");
              console.log("  User UID:", auth.currentUser?.uid || "none");
              console.log("");
              console.log("Component State:");
              console.log("  isGoogleSignedIn:", isGoogleSignedIn);
              console.log("  userEmail:", userEmail);
              console.log("  isConnected:", isConnected);
              console.log("  isSigningIn:", isSigningIn);
              console.log("");
              console.log("Session Storage:");
              console.log(
                "  google_auth_redirect:",
                sessionStorage.getItem("google_auth_redirect")
              );
              console.log("");
              console.log("Cookies (document.cookie):");
              console.log(document.cookie);
              console.log("");
              checkAuthStatus();
            }}
            style={{
              display: "inline-block",
              background: "#666",
              color: "#fff",
              padding: "8px 16px",
              border: "none",
              borderRadius: "6px",
              fontWeight: "normal",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            Debug: Full Auth Status
          </button>

          <button
            onClick={() => {
              checkAuthStatus();
            }}
            style={{
              display: "inline-block",
              background: "#666",
              color: "#fff",
              padding: "8px 16px",
              border: "none",
              borderRadius: "6px",
              fontWeight: "normal",
              cursor: "pointer",
              fontSize: "12px",
              marginLeft: "8px",
            }}
          >
            Debug: Check Auth Status
          </button>
        </div>
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
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          userSelect: "none",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
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
            Tasks
          </h1>
        </div>
        <button
          onClick={() => setShowDatabaseSelector(true)}
          style={{
            padding: "6px 12px",
            border: "1px solid #ccc",
            borderRadius: "6px",
            background: "#f5f5f5",
            cursor: "pointer",
            fontSize: "12px",
          }}
        >
          Change DB
        </button>
      </div>

      {selectedDatabase && (
        <div style={{ marginBottom: "16px", fontSize: "14px", color: "#666" }}>
          <strong>Database:</strong> {selectedDatabase.title}
        </div>
      )}

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

      {/* Add new task form */}
      <form onSubmit={createTask} style={{ marginBottom: "20px", display: "flex", gap: "8px" }}>
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="Add a new task..."
          style={{
            flex: 1,
            padding: "12px",
            border: "2px solid #ccc",
            borderRadius: "6px",
            fontSize: "16px",
          }}
          disabled={isCreatingTask}
        />
        <button
          type="submit"
          disabled={!newTaskTitle.trim() || isCreatingTask}
          style={{
            padding: "12px 20px",
            background: isCreatingTask ? "#ccc" : "#000",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: isCreatingTask ? "not-allowed" : "pointer",
            fontSize: "16px",
          }}
        >
          {isCreatingTask ? "Adding..." : "Add"}
        </button>
      </form>

      {/* Task list */}
      <div>
        {taskList.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
            <p>No tasks yet. Add your first task above!</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "8px" }}>
            {taskList.map((task: Task) => (
              <div
                key={task.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "12px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  background: task.completed ? "#f0f9f0" : "#fff",
                  gap: "12px",
                }}
              >
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => toggleTaskCompletion(task.id, task.completed)}
                  style={{
                    width: "18px",
                    height: "18px",
                    cursor: "pointer",
                  }}
                />
                <div style={{ flex: 1 }}>
                  <span
                    style={{
                      textDecoration: task.completed ? "line-through" : "none",
                      color: task.completed ? "#666" : "#000",
                      fontSize: "16px",
                    }}
                  >
                    {task.title}
                  </span>
                  {task.notionUrl && (
                    <div style={{ fontSize: "12px", marginTop: "4px" }}>
                      <a
                        href={task.notionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#666", textDecoration: "none" }}
                      >
                        Open in Notion →
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
