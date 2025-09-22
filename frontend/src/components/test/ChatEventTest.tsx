/**
 * Test component to verify real-time chat event system
 * This component demonstrates how the useChat hook with event system works
 */
import React, { useState, useEffect } from "react";
import { useChat } from "@/hooks/useChat";
import { useChatEvents } from "@/hooks/useEventSystem";
import { useSessionAuth } from "@/hooks/useSessionAuth";

interface ChatEventTestProps {
  lobbyCode: string;
}

export default function ChatEventTest({ lobbyCode }: ChatEventTestProps) {
  const { user } = useSessionAuth();
  const { messages, sendMessage, loading, sending, error } = useChat(lobbyCode);
  const { isConnected } = useChatEvents(lobbyCode);
  const [inputMessage, setInputMessage] = useState("");

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !user?.userId) return;

    const success = await sendMessage(lobbyCode, inputMessage, user.userId);
    if (success) {
      setInputMessage("");
    }
  };

  return (
    <div
      style={{
        padding: "20px",
        border: "1px solid #ccc",
        borderRadius: "8px",
        maxWidth: "500px",
        margin: "20px auto",
      }}
    >
      <h3>Chat Event Test - Lobby: {lobbyCode}</h3>

      {/* Connection Status */}
      <div style={{ marginBottom: "10px" }}>
        <strong>WebSocket Status:</strong>
        <span
          style={{
            color: isConnected ? "green" : "red",
            marginLeft: "8px",
          }}
        >
          {isConnected ? "Connected" : "Disconnected"}
        </span>
      </div>

      {/* Error Display */}
      {error && (
        <div
          style={{
            color: "red",
            marginBottom: "10px",
            padding: "8px",
            backgroundColor: "#ffe6e6",
            borderRadius: "4px",
          }}
        >
          Error: {error}
        </div>
      )}

      {/* Messages */}
      <div
        style={{
          height: "200px",
          overflowY: "auto",
          border: "1px solid #ddd",
          padding: "10px",
          marginBottom: "10px",
          backgroundColor: "#f9f9f9",
        }}
      >
        {loading ? (
          <div>Loading messages...</div>
        ) : messages.length === 0 ? (
          <div style={{ color: "#666" }}>
            No messages yet. Send a message to test real-time sync!
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              style={{
                marginBottom: "8px",
                padding: "8px",
                backgroundColor: msg.user_id === user?.userId ? "#e3f2fd" : "#f5f5f5",
                borderRadius: "4px",
              }}
            >
              <div style={{ fontSize: "0.8em", color: "#666" }}>
                {msg.username} • {new Date(msg.time_created).toLocaleTimeString()}
              </div>
              <div>{msg.content}</div>
            </div>
          ))
        )}
      </div>

      {/* Message Input */}
      <div style={{ display: "flex", gap: "8px" }}>
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
          placeholder="Type a message..."
          style={{
            flex: 1,
            padding: "8px",
            border: "1px solid #ddd",
            borderRadius: "4px",
          }}
          disabled={!isConnected || sending}
        />
        <button
          onClick={handleSendMessage}
          disabled={!inputMessage.trim() || !isConnected || sending}
          style={{
            padding: "8px 16px",
            backgroundColor: isConnected ? "#007bff" : "#ccc",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: isConnected ? "pointer" : "not-allowed",
          }}
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </div>

      {/* Instructions */}
      <div
        style={{
          marginTop: "15px",
          fontSize: "0.9em",
          color: "#666",
          backgroundColor: "#f0f8ff",
          padding: "10px",
          borderRadius: "4px",
        }}
      >
        <strong>How to test:</strong>
        <ul style={{ margin: "5px 0", paddingLeft: "20px" }}>
          <li>Open this page in multiple browser tabs/windows</li>
          <li>Use the same lobby code in all tabs</li>
          <li>Send messages in one tab - they should appear in all tabs in real-time</li>
          <li>Check that WebSocket status shows &quot;Connected&quot;</li>
        </ul>
      </div>
    </div>
  );
}
