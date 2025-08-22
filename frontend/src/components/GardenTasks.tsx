import { useState, useEffect } from "react";
import { HeaderFont } from "./utils";
import { useNotionFilters } from "@/hooks/useNotionFilters";

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
  completed?: boolean;
  status?: string;
  dueDate?: string;
  priority?: string;
  assignee?: any;
  notionUrl?: string;
  createdTime?: string;
  lastEditedTime?: string;
  archived?: boolean;
}

interface DatabasePage {
  id: string;
  title: string;
  properties?: Record<string, any>;
  notionUrl?: string;
  createdTime?: string;
  lastEditedTime?: string;
  archived?: boolean;
  icon?: any;
  cover?: any;
}

interface SelectedDatabase {
  id: string;
  title: string;
  selectedAt: string;
}

export default function GardenTasks() {
  const [isLoading, setIsLoading] = useState(true);
  const [taskList, setTaskList] = useState<Task[]>([]);
  const [pageList, setPageList] = useState<DatabasePage[]>([]);
  const [isTaskDatabase, setIsTaskDatabase] = useState(false);
  const [selectedDatabase, setSelectedDatabase] = useState<SelectedDatabase | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter system integration
  const {
    filterOptions,
    currentFilter,
    setFilter,
    applyCommonFilter,
    loadFilterOptions,
    isLoadingFilters,
    error: filterError,
  } = useNotionFilters();

  const [showFilterOptions, setShowFilterOptions] = useState(false);

  // Auth states - simplified
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  // Check if user is authenticated (both Google and Notion)
  useEffect(() => {
    checkAuthentication();
  }, []);

  // Load default database on startup after authentication
  useEffect(() => {
    if (isAuthenticated && !selectedDatabase) {
      loadDefaultDatabase();
    }
  }, [isAuthenticated, selectedDatabase]);

  // Listen for database change events from other components
  useEffect(() => {
    const handleDatabaseChange = (event: CustomEvent) => {
      console.log("Database changed:", event.detail);
      setSelectedDatabase({
        id: event.detail.databaseId,
        title: event.detail.databaseTitle,
        selectedAt: new Date().toISOString(),
      });
    };

    window.addEventListener("databaseChanged", handleDatabaseChange as EventListener);

    return () => {
      window.removeEventListener("databaseChanged", handleDatabaseChange as EventListener);
    };
  }, []);

  // Load tasks/pages when database is selected or filter changes
  useEffect(() => {
    if (isAuthenticated && selectedDatabase) {
      loadTasksOrPages();
    }
  }, [isAuthenticated, selectedDatabase, currentFilter]);

  // Load filter options when database changes
  useEffect(() => {
    if (selectedDatabase) {
      loadFilterOptions(selectedDatabase.id);
    }
  }, [selectedDatabase, loadFilterOptions]);

  const loadDefaultDatabase = async () => {
    try {
      // Use the enabled databases endpoint for GardenTasks (only Firestore-enabled databases)
      const response = await fetch("/api/notion/databases/enabled", {
        credentials: "include",
      });

      if (!response.ok) {
        console.error("Failed to load enabled databases for default selection");
        setError("Failed to load available databases. Please try refreshing.");
        return;
      }

      const data = await response.json();
      const databases = data.databases || [];

      if (databases.length > 0) {
        // Select the first database as default
        const defaultDb = databases[0];
        const selectedDb = {
          id: defaultDb.id,
          title: defaultDb.title?.[0]?.plain_text || defaultDb.title || "Untitled Database",
          selectedAt: new Date().toISOString(),
        };

        setSelectedDatabase(selectedDb);
        console.log("Default enabled database selected:", selectedDb.title);
      } else {
        // No enabled databases available - user needs to duplicate template
        setError(
          data.message ||
            "No databases found. Please duplicate a template from your Notion integration to get started."
        );
        console.log("No enabled databases available for user");
      }
    } catch (error) {
      console.error("Error loading default database:", error);
      setError("Error loading databases. Please try refreshing the page.");
    }
  };

  const checkAuthentication = async () => {
    try {
      // Check Google auth
      const googleResponse = await fetch("/api/auth/session", {
        credentials: "include",
      });

      if (!googleResponse.ok) {
        redirectToLogin();
        return;
      }

      const googleData = await googleResponse.json();
      if (!googleData.success || !googleData.userEmail) {
        redirectToLogin();
        return;
      }

      // Check Notion auth
      const notionResponse = await fetch("/api/notion/session", {
        credentials: "include",
      });

      if (!notionResponse.ok) {
        redirectToLogin();
        return;
      }

      const notionData = await notionResponse.json();
      if (!notionData.success || !notionData.hasValidTokens) {
        redirectToLogin();
        return;
      }

      // Both are authenticated
      setUserEmail(googleData.userEmail);
      setUserName(googleData.userName || null);
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Authentication check failed:", error);
      redirectToLogin();
    } finally {
      setIsLoading(false);
    }
  };

  const redirectToLogin = () => {
    window.location.href = "/login";
  };

  const loadTasksOrPages = async () => {
    if (!selectedDatabase) return;

    try {
      setError(null);

      // Build query URL with filter if present
      let queryUrl = `/api/notion/tasks?databaseId=${selectedDatabase.id}`;
      if (currentFilter) {
        const filterParam = encodeURIComponent(JSON.stringify(currentFilter));
        queryUrl += `&filter=${filterParam}`;
      }

      const response = await fetch(queryUrl, {
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();

        if (errorData.needsReauth) {
          // Check if this is a Notion token issue or a complete auth failure
          if (errorData.error?.includes("Notion")) {
            // This is a Notion-specific issue - don't redirect to login
            setError(
              "Notion connection expired. Please reconnect to Notion to access your databases."
            );
            setTaskList([]);
            setPageList([]);
            return;
          } else if (
            errorData.error?.includes("session") ||
            errorData.error?.includes("authenticated")
          ) {
            // This is a complete session failure - redirect to login
            redirectToLogin();
            return;
          }
        }

        // For other errors, show them without redirecting
        throw new Error(errorData.error || "Failed to load data");
      }

      const data = await response.json();

      if (data.is_task_database) {
        setIsTaskDatabase(true);
        setTaskList(data.tasks || []);
        setPageList([]);
      } else {
        setIsTaskDatabase(false);
        setPageList(data.pages || []);
        setTaskList([]);
      }
    } catch (err) {
      console.error("Error loading data:", err);
      setError(`Failed to load data: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      await fetch("/api/notion/logout", { method: "POST", credentials: "include" });
      redirectToLogin();
    } catch (error) {
      console.error("Logout error:", error);
      redirectToLogin();
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

  // If not authenticated, this shouldn't show (should redirect), but just in case
  if (!isAuthenticated) {
    return (
      <div style={{ textAlign: "center", padding: "20px" }}>
        <p>Redirecting to login...</p>
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

      <div style={{ textAlign: "center", padding: "20px" }}>
        <p style={{ marginBottom: "10px" }}>Welcome, {userName || userEmail}!</p>

        <div className="p-5 my-5">
          <div className="overflow-auto" style={{ maxHeight: "500px", paddingRight: "8px" }}>
            {selectedDatabase ? (
              <div>
                <div
                  style={{
                    marginBottom: "20px",
                    padding: "12px",
                    backgroundColor: "#e8f5e8",
                    borderRadius: "6px",
                  }}
                >
                  <strong>Current Database:</strong> {selectedDatabase.title}
                  <br />
                  <small>
                    Selected at: {new Date(selectedDatabase.selectedAt).toLocaleString()}
                  </small>
                </div>

                {/* Filter Controls */}
                <div
                  style={{
                    marginTop: "20px",
                    padding: "12px",
                    backgroundColor: "#f8f9fa",
                    borderRadius: "6px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "10px",
                    }}
                  >
                    <h4 style={{ margin: 0, fontSize: "16px" }}>Filters</h4>
                    <button
                      onClick={() => setShowFilterOptions(!showFilterOptions)}
                      style={{
                        background: "none",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        padding: "4px 8px",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      {showFilterOptions ? "Hide" : "Show"} Options
                    </button>
                  </div>

                  {currentFilter && (
                    <div style={{ marginBottom: "10px", fontSize: "12px", color: "#666" }}>
                      <strong>Active Filter:</strong>{" "}
                      {JSON.stringify(currentFilter).length > 100
                        ? JSON.stringify(currentFilter).substring(0, 100) + "..."
                        : JSON.stringify(currentFilter)}
                      <button
                        onClick={() => setFilter(null)}
                        style={{
                          marginLeft: "8px",
                          background: "none",
                          border: "none",
                          color: "#dc3545",
                          fontSize: "12px",
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  )}

                  {showFilterOptions && (
                    <div style={{ borderTop: "1px solid #ddd", paddingTop: "10px" }}>
                      {isLoadingFilters ? (
                        <div style={{ textAlign: "center", color: "#666", fontSize: "14px" }}>
                          Loading filter options...
                        </div>
                      ) : (
                        <div>
                          {/* Quick Filter Buttons */}
                          <div style={{ marginBottom: "15px" }}>
                            <div
                              style={{
                                fontSize: "14px",
                                fontWeight: "bold",
                                marginBottom: "8px",
                              }}
                            >
                              Quick Filters:
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                              {filterOptions.some(
                                (opt) =>
                                  opt.name.toLowerCase().includes("completed") ||
                                  opt.name.toLowerCase().includes("done")
                              ) && (
                                <button
                                  onClick={() => {
                                    const completedProp = filterOptions.find(
                                      (opt) =>
                                        opt.name.toLowerCase().includes("completed") ||
                                        opt.name.toLowerCase().includes("done")
                                    );
                                    if (completedProp) {
                                      applyCommonFilter("incomplete", completedProp.property);
                                    }
                                  }}
                                  style={{
                                    padding: "4px 8px",
                                    fontSize: "12px",
                                    backgroundColor: "#007bff",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                  }}
                                >
                                  Incomplete Only
                                </button>
                              )}
                              {filterOptions.some((opt) =>
                                opt.name.toLowerCase().includes("priority")
                              ) && (
                                <button
                                  onClick={() => {
                                    const priorityProp = filterOptions.find((opt) =>
                                      opt.name.toLowerCase().includes("priority")
                                    );
                                    if (priorityProp) {
                                      applyCommonFilter("priority", priorityProp.property, "High");
                                    }
                                  }}
                                  style={{
                                    padding: "4px 8px",
                                    fontSize: "12px",
                                    backgroundColor: "#dc3545",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                  }}
                                >
                                  High Priority
                                </button>
                              )}
                              {filterOptions.some(
                                (opt) =>
                                  opt.name.toLowerCase().includes("due") ||
                                  opt.name.toLowerCase().includes("date")
                              ) && (
                                <button
                                  onClick={() => {
                                    const dueProp = filterOptions.find(
                                      (opt) =>
                                        opt.name.toLowerCase().includes("due") ||
                                        opt.name.toLowerCase().includes("date")
                                    );
                                    if (dueProp) {
                                      applyCommonFilter("dueSoon", dueProp.property);
                                    }
                                  }}
                                  style={{
                                    padding: "4px 8px",
                                    fontSize: "12px",
                                    backgroundColor: "#28a745",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                  }}
                                >
                                  Due Soon
                                </button>
                              )}
                              <button
                                onClick={() => applyCommonFilter("recentlyCreated")}
                                style={{
                                  padding: "4px 8px",
                                  fontSize: "12px",
                                  backgroundColor: "#17a2b8",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                }}
                              >
                                Recently Created
                              </button>
                            </div>
                          </div>

                          {/* Available Properties */}
                          {filterOptions.length > 0 && (
                            <div style={{ fontSize: "12px", color: "#666" }}>
                              <strong>Available properties:</strong>{" "}
                              {filterOptions.map((opt) => opt.name).join(", ")}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Data Display */}
                <div
                  style={{
                    marginTop: "20px",
                    padding: "12px",
                    backgroundColor: "#ffffff",
                    borderRadius: "6px",
                    border: "1px solid #ddd",
                  }}
                >
                  <h4 style={{ margin: "0 0 15px 0", fontSize: "16px" }}>
                    {isTaskDatabase ? "Tasks" : "Pages"}
                    <span style={{ fontSize: "12px", color: "#666", fontWeight: "normal" }}>
                      ({isTaskDatabase ? taskList.length : pageList.length} items)
                    </span>
                  </h4>

                  <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                    {isTaskDatabase ? (
                      taskList.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {taskList.map((task: Task) => (
                            <div
                              key={task.id}
                              style={{
                                padding: "8px 12px",
                                border: "1px solid #eee",
                                borderRadius: "4px",
                                backgroundColor: task.completed ? "#f8f9fa" : "#ffffff",
                                opacity: task.archived ? 0.6 : 1,
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <input
                                  type="checkbox"
                                  checked={task.completed || false}
                                  readOnly
                                  style={{ margin: 0 }}
                                />
                                <div style={{ flex: 1 }}>
                                  <div
                                    style={{
                                      fontWeight: "500",
                                      textDecoration: task.completed ? "line-through" : "none",
                                      color: task.completed ? "#666" : "#333",
                                    }}
                                  >
                                    {task.title}
                                  </div>
                                  <div style={{ fontSize: "11px", color: "#666" }}>
                                    {task.status && <span>Status: {task.status} • </span>}
                                    {task.priority && <span>Priority: {task.priority} • </span>}
                                    {task.dueDate && (
                                      <span>
                                        Due: {new Date(task.dueDate).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {task.notionUrl && (
                                  <a
                                    href={task.notionUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      color: "#007bff",
                                      fontSize: "11px",
                                      textDecoration: "underline",
                                    }}
                                  >
                                    View
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div
                          style={{
                            textAlign: "center",
                            color: "#666",
                            fontStyle: "italic",
                            padding: "20px",
                          }}
                        >
                          No tasks found
                          {currentFilter && (
                            <div style={{ fontSize: "12px", marginTop: "5px" }}>
                              Try adjusting your filters
                            </div>
                          )}
                        </div>
                      )
                    ) : pageList.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {pageList.map((page: DatabasePage) => (
                          <div
                            key={page.id}
                            style={{
                              padding: "8px 12px",
                              border: "1px solid #eee",
                              borderRadius: "4px",
                              backgroundColor: "#ffffff",
                              opacity: page.archived ? 0.6 : 1,
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              {page.icon && (
                                <span style={{ fontSize: "16px" }}>
                                  {page.icon.type === "emoji" ? page.icon.emoji : "📄"}
                                </span>
                              )}
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: "500", color: "#333" }}>{page.title}</div>
                                <div style={{ fontSize: "11px", color: "#666" }}>
                                  Created: {new Date(page.createdTime || "").toLocaleDateString()}
                                  {page.lastEditedTime && (
                                    <span>
                                      {" "}
                                      • Edited: {new Date(page.lastEditedTime).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {page.notionUrl && (
                                <a
                                  href={page.notionUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    color: "#007bff",
                                    fontSize: "11px",
                                    textDecoration: "underline",
                                  }}
                                >
                                  View
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div
                        style={{
                          textAlign: "center",
                          color: "#666",
                          fontStyle: "italic",
                          padding: "20px",
                        }}
                      >
                        No pages found
                        {currentFilter && (
                          <div style={{ fontSize: "12px", marginTop: "5px" }}>
                            Try adjusting your filters
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{ textAlign: "center", color: "#666", fontStyle: "italic", padding: "40px" }}
              >
                Please select a database to view tasks and pages.
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="inline-block bg-red-600 text-white px-6 py-3 rounded-lg font-bold cursor-pointer transition-colors hover:bg-red-700"
        >
          Logout
        </button>
      </div>

      {/* Floating Error Card */}
      {(error || filterError) && (
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
            <span>{error || filterError}</span>
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
