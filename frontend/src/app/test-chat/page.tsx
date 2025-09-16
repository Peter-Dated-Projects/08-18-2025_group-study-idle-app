/**
 * Test page for real-time chat functionality
 * Navigate to /test-chat to access this page
 */
"use client";

import React, { useState } from "react";
import ChatEventTest from "@/components/test/ChatEventTest";
import { useSessionAuth } from "@/hooks/useSessionAuth";

export default function TestChatPage() {
  const { user, isLoading, isAuthenticated } = useSessionAuth();
  const [lobbyCode, setLobbyCode] = useState("test-lobby-123");

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          gap: "20px",
        }}
      >
        <h2>Authentication Required</h2>
        <p>You need to be logged in to test the chat functionality.</p>
        <a
          href="/auth/login"
          style={{
            padding: "10px 20px",
            backgroundColor: "#007bff",
            color: "white",
            textDecoration: "none",
            borderRadius: "4px",
          }}
        >
          Login
        </a>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f5f5f5",
        padding: "20px",
      }}
    >
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <h1 style={{ textAlign: "center", marginBottom: "30px" }}>Real-Time Chat Test</h1>

        <div
          style={{
            marginBottom: "20px",
            textAlign: "center",
          }}
        >
          <label style={{ marginRight: "10px" }}>Lobby Code:</label>
          <input
            type="text"
            value={lobbyCode}
            onChange={(e) => setLobbyCode(e.target.value)}
            style={{
              padding: "8px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "14px",
            }}
          />
        </div>

        <div
          style={{
            backgroundColor: "#e8f4fd",
            padding: "15px",
            borderRadius: "8px",
            marginBottom: "20px",
          }}
        >
          <p>
            <strong>Logged in as:</strong> {user?.userId}
          </p>
          <p style={{ margin: "5px 0 0 0", fontSize: "0.9em", color: "#666" }}>
            This test verifies that the real-time chat system works correctly with WebSocket events.
          </p>
        </div>

        <ChatEventTest lobbyCode={lobbyCode} />

        <div
          style={{
            marginTop: "30px",
            padding: "20px",
            backgroundColor: "white",
            borderRadius: "8px",
            border: "1px solid #ddd",
          }}
        >
          <h3>Test Instructions:</h3>
          <ol style={{ lineHeight: "1.6" }}>
            <li>
              <strong>Multiple Tabs Test:</strong> Open this page in 2+ browser tabs with the same
              lobby code
            </li>
            <li>
              <strong>Real-time Sync:</strong> Send a message in one tab - it should appear
              immediately in other tabs
            </li>
            <li>
              <strong>Connection Status:</strong> Verify all tabs show "Connected" WebSocket status
            </li>
            <li>
              <strong>Different Lobbies:</strong> Change the lobby code in one tab - messages should
              be isolated
            </li>
            <li>
              <strong>Reconnection:</strong> Close/reopen tabs - they should reconnect and sync
              messages
            </li>
          </ol>

          <h4 style={{ marginTop: "20px" }}>Expected Behavior:</h4>
          <ul style={{ lineHeight: "1.6" }}>
            <li>Messages appear in real-time across all tabs with the same lobby code</li>
            <li>Your own messages appear with blue background</li>
            <li>Other users' messages appear with gray background</li>
            <li>All messages include username and timestamp</li>
            <li>WebSocket connection status is shown and updates properly</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
