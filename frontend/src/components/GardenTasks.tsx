import { useState, useEffect, useCallback } from "react";
import { HeaderFont } from "./utils";

import { googleSVG } from "./utils";

export const AUTH_TOKEN_KEY = "auth_token";

// Helper function to extract plain text from Notion rich text objects
const extractPlainText = (richTextArray: any): string => {
  if (!richTextArray || !Array.isArray(richTextArray)) {
    return "";
  }
  return richTextArray.map((textObj: any) => textObj.plain_text || "").join("");
};

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
  title: any[]; // Rich text array from Notion API
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

  // Notion Database states
  const [hasNotionDatabase, setHasNotionDatabase] = useState(false);
  const [isNotionConnected, setIsNotionConnected] = useState(false);

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
      // Check if user is authed
      const response = await fetch("/api/auth/session", {
        credentials: "include",
      });
      const data = await response.json();
      if (response.ok && data.success && data.userEmail) {
        setIsGoogleSignedIn(true);
        setUserEmail(data.userEmail);
        setPreviousEmail(null); // Clear previous email since we have an active session

        // Check notion status
        await checkNotionStatus();
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

  // Handle notion login
  const handleNotionLogin = async () => {
    try {
      setError(null);

      // Use redirect-based OAuth instead of popup
      const returnUrl = encodeURIComponent(window.location.href);
      window.location.href = `/api/notion/start?returnUrl=${returnUrl}`;

      // Note: The page will redirect, so this code won't continue
    } catch (error: any) {
      console.error("Notion sign-in error:", error);
      setError(`Failed to start Notion sign-in: ${error.message}`);
    }
  };

  // Load tasks when database is selected
  useEffect(() => {
    if (isNotionConnected && selectedDatabase) {
      loadTasks();
    }
  }, [isNotionConnected, selectedDatabase]);

  // Load databases when Notion is connected
  useEffect(() => {
    if (isNotionConnected) {
      loadDatabases();
    }
  }, [isNotionConnected]);

  const checkNotionStatus = useCallback(async () => {
    try {
      // Check if notion logged in
      const response = await fetch("/api/notion/session", {
        credentials: "include",
      });

      console.log(response);

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.hasValidTokens) {
          setIsNotionConnected(true);
          setIsLoading(false);

          // TODO - on bus
          // for now we do something else

          console.log("/api/notion/auth/check:", "Notion tokens found:", data.hasValidTokens);
        } else {
          setIsNotionConnected(false);
        }
      } else {
        setIsNotionConnected(false);
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      setIsNotionConnected(false);
    }
  }, [isGoogleSignedIn]); // Remove loadTasks from dependency array

  const loadDatabases = async () => {
    try {
      setError(null);
      const response = await fetch("/api/notion/databases", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setDatabases(data.databases || []);
      } else {
        const errorData = await response.json();

        // Handle token expiration specifically
        if (errorData.needsReauth) {
          setError("Your Notion connection has expired. Please reconnect your account.");
          setIsNotionConnected(false);
        } else {
          setError(errorData.error || "Failed to load databases");
        }
      }
    } catch (err) {
      console.error("Error loading databases:", err);
      setError("Failed to load databases");
    }
  };

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
          setIsNotionConnected(false);
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
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      // Reset all local state
      setIsGoogleSignedIn(false);
      setUserEmail(null);
      setPreviousEmail(null);
      setIsNotionConnected(false);
      setTaskList([]);
      setSelectedDatabase(null);
      setDatabases([]);
      setShowDatabaseSelector(false);
    } catch (error: any) {
      console.error("Sign out error:", error);
      setError(`Failed to sign out: ${error.message}`);
    }
  };

  const handleNotionLogout = async () => {
    try {
      setError(null);

      // Clear Notion tokens from server
      const response = await fetch("/api/notion/logout", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        // Reset only Notion-related local state, keep Google auth
        setIsNotionConnected(false);
        setTaskList([]);
        setSelectedDatabase(null);
        setDatabases([]);
        setShowDatabaseSelector(false);
        console.log("Successfully logged out of Notion");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to log out of Notion");
      }
    } catch (error: any) {
      console.error("Notion logout error:", error);
      setError(`Failed to log out of Notion: ${error.message}`);
    }
  };

  const selectDatabase = async (database: NotionDatabase) => {
    try {
      const plainTitle = extractPlainText(database.title);
      const response = await fetch("/api/notion/database-selection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          databaseId: database.id,
          databaseTitle: plainTitle,
        }),
      });

      if (response.ok) {
        setSelectedDatabase({
          id: database.id,
          title: plainTitle,
          selectedAt: new Date().toISOString(),
        });
        setShowDatabaseSelector(false);
        // Tasks will load automatically via useEffect
      } else {
        const errorData = await response.json();

        // Handle token expiration specifically
        if (errorData.needsReauth) {
          setError("Your Notion connection has expired. Please reconnect your account.");
          setIsNotionConnected(false);
        } else {
          setError(errorData.error || "Failed to select database");
        }
      }
    } catch (err) {
      console.error("Error selecting database:", err);
      setError("Failed to select database");
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
  } else {
    let bodyHTML;
    if (!isGoogleSignedIn) {
      bodyHTML = (
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
              {googleSVG}
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
      );
    } else {
      // Now we determine if Notion is logged in or not

      let notionHTML;
      if (!isNotionConnected) {
        notionHTML = (
          <div>
            <p style={{ marginBottom: "20px" }}>Now connect your Notion workspace to sync tasks!</p>
            <button
              onClick={() => handleNotionLogin()}
              className="inline-block bg-black text-white px-6 py-3 rounded-lg font-bold cursor-pointer transition-colors hover:bg-gray-900"
            >
              Connect to Notion
            </button>

            <p>After connecting, you will be able to sync your tasks between Google and Notion.</p>
          </div>
        );
      } else {
        notionHTML = (
          <div className="overflow-auto" style={{ maxHeight: "350px", paddingRight: "8px" }}>
            <p>Notion is logged in</p>

            <div>
              {databases.length > 0 ? (
                <div>
                  <h3 style={{ marginBottom: "15px", fontSize: "18px" }}>
                    Select a database to sync tasks:
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {databases.map((db: NotionDatabase) => (
                      <div
                        key={db.id}
                        onClick={() => selectDatabase(db)}
                        style={{
                          padding: "12px",
                          border: "1px solid #ddd",
                          borderRadius: "6px",
                          cursor: "pointer",
                          backgroundColor: selectedDatabase?.id === db.id ? "#e3f2fd" : "#f9f9f9",
                          transition: "background-color 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          if (selectedDatabase?.id !== db.id) {
                            e.currentTarget.style.backgroundColor = "#f0f0f0";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedDatabase?.id !== db.id) {
                            e.currentTarget.style.backgroundColor = "#f9f9f9";
                          }
                        }}
                      >
                        <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                          {extractPlainText(db.title)}
                        </div>
                        <div style={{ fontSize: "12px", color: "#666" }}>ID: {db.id}</div>
                        {db.url && (
                          <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                            <a
                              href={db.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: "#007bff", textDecoration: "underline" }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              View in Notion
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {selectedDatabase && (
                    <div
                      style={{
                        marginTop: "20px",
                        padding: "12px",
                        backgroundColor: "#e8f5e8",
                        borderRadius: "6px",
                      }}
                    >
                      <strong>Selected:</strong> {selectedDatabase.title}
                      <br />
                      <small>
                        Selected at: {new Date(selectedDatabase.selectedAt).toLocaleString()}
                      </small>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: "center", color: "#666", fontStyle: "italic" }}>
                  Loading databases...
                </div>
              )}
            </div>

            {/* Notion Logout Button */}
            <div style={{ marginTop: "20px", textAlign: "center" }}>
              <button
                onClick={handleNotionLogout}
                className="inline-block bg-red-600 text-white px-4 py-2 rounded-lg font-bold cursor-pointer transition-colors hover:bg-red-700"
                style={{ fontSize: "14px" }}
              >
                Log out of Notion
              </button>
            </div>
          </div>
        );
      }

      bodyHTML = (
        <div style={{ textAlign: "center", padding: "20px" }}>
          <p style={{ marginBottom: "10px" }}>Welcome, {userEmail}!</p>

          <div className="p-5 my-5 h-[30%]">{notionHTML}</div>

          <button
            className="inline-block bg-black text-white px-6 py-3 rounded-lg font-bold cursor-pointer transition-colors hover:bg-red-700"
            onClick={() => {
              handleGoogleSignOut();
            }}
          >
            Log out from Google
          </button>
        </div>
      );
    }

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

        {bodyHTML}

        {/* Floating Error Card */}
        {error && (
          <div
            style={{
              position: "fixed",
              bottom: "20px",
              left: "50%",
              transform: "translateX(-50%)",
              backgroundColor: "#fee",
              border: "2px solid #fcc",
              borderRadius: "12px",
              padding: "16px 20px",
              color: "#c00",
              fontSize: "14px",
              fontWeight: "500",
              boxShadow: "0 8px 25px rgba(0, 0, 0, 0.15)",
              zIndex: 1000,
              maxWidth: "90vw",
              minWidth: "300px",
              textAlign: "center",
              animation: "slideUp 0.3s ease-out",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#c00",
                  fontSize: "18px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  marginLeft: "12px",
                  padding: "0",
                  lineHeight: "1",
                }}
                title="Dismiss error"
              >
                ×
              </button>
            </div>
          </div>
        )}

        <style jsx>{`
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateX(-50%) translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateX(-50%) translateY(0);
            }
          }
        `}</style>
      </div>
    );
  }
}
