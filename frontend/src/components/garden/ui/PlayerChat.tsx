import React, { useState, useRef, useEffect } from "react";
import { ChatMessage } from "@/types/chat";
import {
  BORDERFILL,
  BORDERLINE,
  FONTCOLOR,
  PANELFILL,
  SECONDARY_TEXT,
  SUCCESS_COLOR,
  BodyFont,
  HeaderFont,
} from "@/components/constants";
import { useSessionAuth } from "@/hooks/useSessionAuth";
import { useChat } from "@/hooks/useChat";

interface PlayerChatProps {
  isInLobby?: boolean; // Whether the user is currently in a lobby
  lobbyCode?: string; // Current lobby code for clearing messages when switching lobbies
  onClearChat?: () => void; // Callback when lobby changes
}

export default function PlayerChat({ isInLobby = false, lobbyCode, onClearChat }: PlayerChatProps) {
  const { user } = useSessionAuth();
  const { messages, loading, sending, error, sendMessage, loadMessages, clearLocalMessages } =
    useChat(lobbyCode);
  const [isMinimized, setIsMinimized] = useState(true); // Initially collapsed
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [textareaHeight, setTextareaHeight] = useState(24); // Initial height

  // Clear messages and load new ones when lobby changes
  useEffect(() => {
    if (lobbyCode) {
      clearLocalMessages();
      setInputValue("");
      loadMessages(lobbyCode);
      if (onClearChat) {
        onClearChat();
      }
    }
  }, [lobbyCode, onClearChat, clearLocalMessages, loadMessages]);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Calculate textarea height based on content
  const calculateTextareaHeight = (value: string) => {
    const lines = value.split("\n").length;
    const lineHeight = 16; // Approximate line height
    const padding = 8; // Top and bottom padding
    const minHeight = 24;
    const maxHeight = 120; // Limit max height

    const calculatedHeight = Math.max(minHeight, Math.min(maxHeight, lines * lineHeight + padding));
    return calculatedHeight;
  };

  // Update textarea height when content changes
  useEffect(() => {
    if (textareaRef.current) {
      const newHeight = calculateTextareaHeight(inputValue);
      setTextareaHeight(newHeight);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [inputValue]);

  // Format time for display (simple format)
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Handle sending messages
  const handleSendMessage = async () => {
    if (inputValue.trim() && inputValue.length <= 255 && user && lobbyCode) {
      const username = user.userName || user.userEmail.split("@")[0]; // Fallback to email prefix
      const success = await sendMessage(lobbyCode, inputValue.trim(), username);
      if (success) {
        setInputValue("");
        setTextareaHeight(24); // Reset height
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
    // Allow Shift+Enter for new lines - textarea handles this automatically
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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
        pointerEvents: "none",
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
              pointerEvents: "auto", // Keep header interactive for collapse functionality
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
              pointerEvents: "none", // Make messages transparent to mouse events
            }}
          >
            {/* Loading state */}
            {loading && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  padding: "12px",
                  color: SECONDARY_TEXT,
                  fontFamily: BodyFont,
                  fontSize: "12px",
                }}
              >
                Loading messages...
              </div>
            )}

            {/* Error state */}
            {error && (
              <div
                style={{
                  padding: "8px",
                  backgroundColor: "rgba(255, 0, 0, 0.1)",
                  border: "1px solid rgba(255, 0, 0, 0.3)",
                  borderRadius: "4px",
                  color: "#cc0000",
                  fontFamily: BodyFont,
                  fontSize: "12px",
                  textAlign: "center",
                }}
              >
                {error}
              </div>
            )}

            {/* Messages */}
            {!loading &&
              messages.map((message, index) => (
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
                        fontSize: "13px", // Increased by 2px
                      }}
                    >
                      {message.username}
                    </span>
                    <span
                      style={{
                        color: SECONDARY_TEXT,
                        fontFamily: BodyFont,
                        fontSize: "13px", // Increased by 2px
                      }}
                    >
                      {formatTime(message.time_created)}
                    </span>
                  </div>

                  {/* Message content */}
                  <div
                    style={{
                      fontSize: "14px", // Increased by 2px
                      color: FONTCOLOR,
                      fontFamily: BodyFont,
                      lineHeight: "1.3",
                      wordWrap: "break-word",
                      paddingLeft: "4px",
                      whiteSpace: "pre-wrap", // Preserve newlines
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
              padding: "6px 8px",
              borderTop: `2px solid ${BORDERLINE}`,
              backgroundColor: `rgba(228, 190, 147, 1)`, // 25% opacity for BORDERFILL
              display: "flex",
              gap: "6px",
              alignItems: "flex-start", // Changed to flex-start to align button to top
              minHeight: `${textareaHeight + 12}px`, // Dynamic height based on textarea
              pointerEvents: "auto", // Keep input area interactive
            }}
          >
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={`Type a message... (${inputValue.length}/255)`}
              maxLength={255}
              style={{
                flex: 1,
                padding: "4px 6px",
                fontSize: "14px", // Increased by 2px
                fontFamily: BodyFont,
                backgroundColor: "rgba(253, 244, 232, 0.8)", // Higher opacity for better readability
                border: `2px solid ${BORDERLINE}`, // Slightly thicker border for better visibility
                borderRadius: "4px",
                color: FONTCOLOR,
                outline: "none",
                height: `${textareaHeight}px`,
                resize: "none", // Disable manual resize
                overflow: "hidden", // Hide scrollbar for cleaner look
              }}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || inputValue.length > 255 || sending}
              style={{
                padding: "4px 8px",
                fontSize: "14px", // Increased by 2px
                backgroundColor:
                  inputValue.trim() && inputValue.length <= 255 && !sending
                    ? SUCCESS_COLOR
                    : SECONDARY_TEXT,
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor:
                  inputValue.trim() && inputValue.length <= 255 && !sending ? "pointer" : "default",
                fontFamily: BodyFont,
                fontWeight: "bold",
                minWidth: "40px",
                height: "32px", // Fixed height, aligns to top
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {sending ? (
                <i className="fi fi-rr-time-quarter-past" style={{ fontSize: "14px" }} />
              ) : (
                <i className="fi fi-rr-paper-plane" style={{ fontSize: "14px" }} />
              )}
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
