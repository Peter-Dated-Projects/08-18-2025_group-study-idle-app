"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface NotionDatabase {
  id: string;
  title: string;
  url?: string;
  created_time?: string;
  last_edited_time?: string;
}

export default function SelectDatabasePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspace");

  const [databases, setDatabases] = useState<NotionDatabase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDatabases();
  }, []);

  const loadDatabases = async () => {
    try {
      const response = await fetch("/api/notion/databases");
      if (response.ok) {
        const data = await response.json();
        setDatabases(data.databases || []);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to load databases");
      }
    } catch (err) {
      console.error("Error loading databases:", err);
      setError("Failed to load databases");
    } finally {
      setLoading(false);
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
        router.push("/");
      } else {
        setError("Failed to select database");
      }
    } catch (err) {
      console.error("Error selecting database:", err);
      setError("Failed to select database");
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <h1>Loading your Notion databases...</h1>
        <p>Please wait while we fetch your databases.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <h1>Error</h1>
        <p style={{ color: "red" }}>{error}</p>
        <button
          onClick={() => router.push("/")}
          style={{
            padding: "12px 24px",
            background: "#000",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: "800px",
        margin: "40px auto",
        padding: "40px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1 style={{ marginBottom: "20px" }}>Select a Database for Tasks</h1>
      <p style={{ marginBottom: "30px", color: "#666" }}>
        Choose which Notion database you'd like to use for managing your tasks.
        {workspaceId && ` Connected to workspace: ${workspaceId}`}
      </p>

      {databases.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <p>No databases found in your workspace.</p>
          <p style={{ color: "#666" }}>
            Create a database in Notion first, then refresh this page.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "16px" }}>
          {databases.map((db: NotionDatabase) => (
            <button
              key={db.id}
              onClick={() => selectDatabase(db)}
              style={{
                padding: "20px",
                border: "2px solid #ddd",
                borderRadius: "12px",
                background: "#fff",
                textAlign: "left",
                cursor: "pointer",
                transition: "all 0.2s",
                fontSize: "16px",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = "#000";
                e.currentTarget.style.background = "#f9f9f9";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = "#ddd";
                e.currentTarget.style.background = "#fff";
              }}
            >
              <div style={{ fontWeight: "bold", marginBottom: "8px" }}>{db.title}</div>
              {db.url && <div style={{ fontSize: "14px", color: "#666" }}>{db.url}</div>}
              {db.created_time && (
                <div style={{ fontSize: "12px", color: "#999", marginTop: "8px" }}>
                  Created: {new Date(db.created_time).toLocaleDateString()}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      <div style={{ marginTop: "40px", textAlign: "center" }}>
        <button
          onClick={() => router.push("/")}
          style={{
            padding: "12px 24px",
            background: "#f5f5f5",
            color: "#333",
            border: "1px solid #ccc",
            borderRadius: "6px",
            cursor: "pointer",
            marginRight: "12px",
          }}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
