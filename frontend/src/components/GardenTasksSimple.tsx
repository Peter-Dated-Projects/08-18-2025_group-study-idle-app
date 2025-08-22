"use client";

import { useState, useEffect, useCallback } from "react";
import { HeaderFont } from "./utils";
import { useRouter } from "next/navigation";

interface Task {
  id: string;
  title: string;
  completed: boolean;
  notionUrl?: string;
  createdTime?: string;
  lastEditedTime?: string;
}

export default function GardenTasksSimple() {
  const [isLoading, setIsLoading] = useState(true);
  const [taskList, setTaskList] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [selectedDatabase, setSelectedDatabase] = useState<{ id: string; title: string } | null>(
    null
  );
  const router = useRouter();

  // Load user info and tasks on component mount
  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    try {
      // Get user info
      const authResponse = await fetch("/api/auth/session", {
        credentials: "include",
      });
      const authData = await authResponse.json();

      if (authResponse.ok && authData.success && authData.userEmail) {
        setUserEmail(authData.userEmail);
        setUserName(authData.userName || null);
        await loadTasks();
      } else {
        // Not authenticated, redirect to login
        router.push("/login");
      }
    } catch (error) {
      console.error("Error loading user info:", error);
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  };

  const loadTasks = async () => {
    // For now, we'll load tasks based on the selected database in the session
    // You would need to implement the task loading logic here
    try {
      setError(null);
      // This would be replaced with actual task loading from your selected database
      setTaskList([
        { id: "1", title: "Sample Task 1", completed: false },
        { id: "2", title: "Sample Task 2", completed: true },
      ]);
    } catch (err) {
      console.error("Error loading tasks:", err);
      setError("Failed to load tasks");
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

      // Redirect to login
      router.push("/login");
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
        // Redirect to login to re-setup
        router.push("/login");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to log out of Notion");
      }
    } catch (error: any) {
      console.error("Notion logout error:", error);
      setError(`Failed to log out of Notion: ${error.message}`);
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
            color: "#333", // Add explicit dark color
          }}
        >
          Task List
        </h1>
      </div>

      {/* User Info and Controls */}
      <div style={{ marginBottom: "20px", textAlign: "center" }}>
        <p style={{ marginBottom: "10px", fontSize: "14px", color: "#333" }}>
          Signed in as: <strong>{userName || userEmail}</strong>
        </p>
        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <button
            onClick={handleNotionLogout}
            className="inline-block bg-orange-600 text-white px-3 py-1 rounded font-bold cursor-pointer transition-colors hover:bg-orange-700"
            style={{ fontSize: "12px" }}
          >
            Reconnect Notion
          </button>
          <button
            onClick={handleGoogleSignOut}
            className="inline-block bg-red-600 text-white px-3 py-1 rounded font-bold cursor-pointer transition-colors hover:bg-red-700"
            style={{ fontSize: "12px" }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Task List Content */}
      <div style={{ padding: "10px" }}>
        <h3 style={{ marginBottom: "15px", color: "#333" }}>Your Tasks</h3>

        {taskList.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {taskList.map((task) => (
              <div
                key={task.id}
                style={{
                  padding: "10px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  backgroundColor: task.completed ? "#f0f8ff" : "#fff",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => {
                      // Handle task completion toggle
                      const updatedTasks = taskList.map((t) =>
                        t.id === task.id ? { ...t, completed: !t.completed } : t
                      );
                      setTaskList(updatedTasks);
                    }}
                  />
                  <span
                    style={{
                      textDecoration: task.completed ? "line-through" : "none",
                      color: task.completed ? "#666" : "#333",
                    }}
                  >
                    {task.title}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", color: "#666", fontStyle: "italic", padding: "20px" }}>
            No tasks found. Tasks will appear here once you sync with your Notion database.
          </div>
        )}
      </div>

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
