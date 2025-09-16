import React, { useState, useRef, useEffect } from "react";
import { ChatMessage } from "@/types/chat";
import {
  BORDERFILL,
  BORDERLINE,
  FONTCOLOR,
  PANELFILL,
  SECONDARY_TEXT,
  BodyFont,
  HeaderFont,
} from "@/components/constants";

interface PlayerChatProps {
  isInLobby?: boolean; // Whether the user is currently in a lobby
  // Future: onSendMessage?: (message: string) => void;
  // Future: isConnected?: boolean;
}

export default function PlayerChat({ isInLobby = false }: PlayerChatProps) {
  const [isMinimized, setIsMinimized] = useState(true); // Initially collapsed
  const [messages, setMessages] = useState<ChatMessage[]>([
    // Mock data for demonstration
    {
      time_created: new Date(Date.now() - 300000), // 5 minutes ago
      user_id: "user123",
      content: "Hey everyone! Ready for the study session?",
    },
    {
      time_created: new Date(Date.now() - 120000), // 2 minutes ago
      user_id: "user456",
      content: "Absolutely! Let's focus on chapter 3 today.",
    },
    {
      time_created: new Date(Date.now() - 30000), // 30 seconds ago
      user_id: "user789",
      content: "Sounds good! I'll start my pomodoro timer in 2 minutes.",
    },
  ]);

  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Format time for display (simple format)
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Get display name from user_id (simplified for now)
  const getDisplayName = (userId: string) => {
    // In the future, this would map to actual user names
    const userMap: { [key: string]: string } = {
      user123: "Alex",
      user456: "Jordan",
      user789: "Taylor",
    };
    return userMap[userId] || "Player";
  };

  // Handle sending messages (placeholder for future functionality)
  const handleSendMessage = () => {
    if (inputValue.trim() && inputValue.length <= 255) {
      const newMessage: ChatMessage = {
        time_created: new Date(),
        user_id: "current_user", // Will be replaced with actual user ID
        content: inputValue.trim(),
      };
      setMessages((prev) => [...prev, newMessage]);
      setInputValue("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= 255) {
      setInputValue(value);
    }
  };

  // Handle header click to toggle collapsed state
  const handleHeaderClick = () => {
    setIsMinimized(!isMinimized);
  };

  // Don't render chat if user is not in a lobby
  if (!isInLobby) {
    return null;
  }

  return (
    <div
      className="p-1"
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end", // This ensures content aligns to bottom
      }}
    >
      <div
        style={{
          width: "100%",
          backgroundColor: "rgb(253, 244, 232, 0.25)", // 25% opacity
          backdropFilter: "blur(2px)",
          border: `4px solid ${BORDERLINE}`, // Thicker border for better visibility
          borderRadius: "8px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          pointerEvents: "auto",
          position: "relative",
          transition: "all 0.3s ease",
          justifyContent: "flex-end",
          height: isMinimized ? "auto" : "100%",
          // Remove marginTop: "auto" as it's now handled by parent flexbox
        }}
      >
        {/* Chat Header - Only show when expanded, clickable to collapse */}
        {!isMinimized && (
          <div
            onClick={handleHeaderClick}
            style={{
              padding: "8px 12px",
              backgroundColor: `rgb(228, 190, 147)`, // 25% opacity for BORDERFILL
              borderBottom: `2px solid ${BORDERLINE}`,
              display: "flex",
              alignItems: "center",
              gap: "8px",
              minHeight: "36px",
              transition: "all 0.3s ease",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = `rgba(211, 174, 131, 1)`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = `rgba(228, 190, 147, 1)`;
            }}
          >
            <i
              className="fi fi-rr-comment-dots"
              style={{
                color: FONTCOLOR,
                fontSize: "14px",
              }}
            />
            <span
              style={{
                fontFamily: HeaderFont,
                fontSize: "14px",
                fontWeight: "bold",
                color: FONTCOLOR,
                transition: "opacity 0.3s ease",
              }}
            >
              Lobby Chat
            </span>
            <div
              style={{
                marginLeft: "auto",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#5cb370", // SUCCESS_COLOR for "online" status
                transition: "opacity 0.3s ease",
              }}
            />
          </div>
        )}

        {/* Messages Container - Hidden when minimized */}
        {!isMinimized && (
          <div
            ref={chatContainerRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "8px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              minHeight: 0, // Important for flex scrolling
              justifyContent: "flex-end", // Justify content to bottom
            }}
          >
            {messages.map((message, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                }}
              >
                {/* Message header with user and time */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "11px",
                  }}
                >
                  <span
                    style={{
                      color: FONTCOLOR,
                      fontWeight: "bold",
                      fontFamily: BodyFont,
                    }}
                  >
                    {getDisplayName(message.user_id)}
                  </span>
                  <span
                    style={{
                      color: SECONDARY_TEXT,
                      fontFamily: BodyFont,
                    }}
                  >
                    {formatTime(message.time_created)}
                  </span>
                </div>

                {/* Message content */}
                <div
                  style={{
                    fontSize: "12px",
                    color: FONTCOLOR,
                    fontFamily: BodyFont,
                    lineHeight: "1.3",
                    wordWrap: "break-word",
                    paddingLeft: "4px",
                  }}
                >
                  {message.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Chat Input - Hidden when minimized */}
        {!isMinimized && (
          <div
            style={{
              padding: "6px 8px", // Reduced padding for shorter height
              borderTop: `2px solid ${BORDERLINE}`,
              backgroundColor: `rgba(228, 190, 147, 1)`, // 25% opacity for BORDERFILL
              display: "flex",
              gap: "6px",
              alignItems: "center",
              minHeight: "32px", // Shorter minimum height
            }}
          >
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={`Type a message... (${inputValue.length}/255)`}
              maxLength={255}
              style={{
                flex: 1,
                padding: "4px 6px", // Reduced padding
                fontSize: "12px",
                fontFamily: BodyFont,
                backgroundColor: "rgba(253, 244, 232, 0.8)", // Higher opacity for better readability
                border: `2px solid ${BORDERLINE}`, // Slightly thicker border for better visibility
                borderRadius: "4px",
                color: FONTCOLOR,
                outline: "none",
                height: "24px", // Fixed shorter height
              }}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || inputValue.length > 255}
              style={{
                padding: "4px 8px", // Reduced padding
                fontSize: "12px",
                backgroundColor:
                  inputValue.trim() && inputValue.length <= 255 ? BORDERLINE : SECONDARY_TEXT,
                color: PANELFILL,
                border: "none",
                borderRadius: "4px",
                cursor: inputValue.trim() && inputValue.length <= 255 ? "pointer" : "default",
                fontFamily: BodyFont,
                fontWeight: "bold",
                minWidth: "45px", // Slightly smaller
                height: "24px", // Fixed shorter height
              }}
            >
              Send
            </button>
          </div>
        )}

        {/* Collapsed Bar - Only show when minimized, clickable to expand */}
        {isMinimized && (
          <div
            onClick={handleHeaderClick}
            style={{
              padding: "6px 12px",
              backgroundColor: `rgba(228, 190, 147, 1)`, // 25% opacity for BORDERFILL
              display: "flex",
              alignItems: "center",
              gap: "8px",
              minHeight: "28px", // Smaller height for collapsed state
              transition: "all 0.3s ease",
              cursor: "pointer",
              borderTop: `1px solid ${BORDERLINE}`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = `rgba(213, 173, 127, 1)`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = `rgba(228, 190, 147, 1)`;
            }}
          >
            <i
              className="fi fi-rr-comment-dots"
              style={{
                color: FONTCOLOR,
                fontSize: "12px",
              }}
            />
            <span
              style={{
                fontFamily: HeaderFont,
                fontSize: "12px",
                fontWeight: "bold",
                color: FONTCOLOR,
                transition: "opacity 0.3s ease",
              }}
            >
              Lobby Chat
            </span>
            <div
              style={{
                marginLeft: "auto",
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: "#5cb370", // SUCCESS_COLOR for "online" status
                transition: "opacity 0.3s ease",
              }}
            />
            <i
              className="fi fi-rr-angle-up"
              style={{
                color: FONTCOLOR,
                fontSize: "10px",
                marginLeft: "4px",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
