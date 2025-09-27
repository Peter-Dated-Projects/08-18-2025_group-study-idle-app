import React, { useState, useRef, useEffect } from "react";
import { ChatMessage } from "@/types/chat";
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
    <div className="p-1 h-full w-full flex flex-col justify-end pointer-events-none">
      <div
        className={`w-full bg-[#fdf4e8]/25 backdrop-blur-sm border-4 border-[#a0622d] rounded-lg flex flex-col overflow-hidden pointer-events-auto relative transition-all duration-300 justify-end ${
          isMinimized ? "h-auto" : "h-full"
        }`}
      >
        {/* Chat Header - Only show when expanded, clickable to collapse */}
        {!isMinimized && (
          <div
            onClick={handleHeaderClick}
            className="px-3 py-2 bg-[#e4be93ff] border-b-2 border-[#a0622d] flex items-center gap-2 min-h-[36px] transition-all duration-300 cursor-pointer pointer-events-auto hover:bg-[#d3ae83]"
          >
            <i className="fi fi-rr-comment-dots text-[#2c1810] text-sm" />
            <span className="font-falling-sky text-sm font-bold text-[#2c1810] transition-opacity duration-300">
              Lobby Chat
            </span>
            <div className="ml-auto w-2 h-2 rounded-full bg-[#5cb370] transition-opacity duration-300" />
          </div>
        )}

        {/* Messages Container - Hidden when minimized */}
        {!isMinimized && (
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5 min-h-0 pointer-events-none"
          >
            {/* Loading state */}
            {loading && (
              <div className="flex justify-center items-center py-3 text-[#7a6b57] text-xs">
                Loading messages...
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="p-2 bg-red-100 border border-red-300 rounded text-red-700 text-xs text-center">
                {error}
              </div>
            )}

            {/* Messages */}
            {!loading &&
              messages.map((message, index) => (
                <div key={index} className="flex flex-col gap-0.5">
                  {/* Message header with user and time */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-[#2c1810] font-bold text-sm">
                      {message.username}
                    </span>
                    <span className="text-[#7a6b57] text-sm">
                      {formatTime(message.time_created)}
                    </span>
                  </div>

                  {/* Message content */}
                  <div className="text-sm text-[#2c1810] leading-tight break-words pl-1 whitespace-pre-wrap">
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
            className="px-2 py-1.5 border-t-2 border-[#a0622d] bg-[#e4be93ff] flex gap-1.5 items-start pointer-events-auto"
            style={{ minHeight: `${textareaHeight + 12}px` }}
          >
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={`Type a message... (${inputValue.length}/255)`}
              maxLength={255}
              className="flex-1 px-1.5 py-1 text-sm bg-[#fdf4e8]/80 border-2 border-[#a0622d] rounded text-[#2c1810] outline-none resize-none overflow-hidden"
              style={{ height: `${textareaHeight}px` }}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || inputValue.length > 255 || sending}
              className={`px-2 py-1 text-sm border-none rounded cursor-pointer font-bold min-w-[40px] h-8 flex items-center justify-center ${
                inputValue.trim() && inputValue.length <= 255 && !sending
                  ? "bg-[#5cb370] text-white hover:bg-[#4a9c5a]"
                  : "bg-[#7a6b57] text-white cursor-default"
              }`}
            >
              {sending ? (
                <i className="fi fi-rr-time-quarter-past text-sm" />
              ) : (
                <i className="fi fi-rr-paper-plane text-sm" />
              )}
            </button>
          </div>
        )}

        {/* Collapsed Bar - Only show when minimized, clickable to expand */}
        {isMinimized && (
          <div
            onClick={handleHeaderClick}
            className="px-3 py-1.5 bg-[#e4be93ff] flex items-center gap-2 min-h-[28px] transition-all duration-300 cursor-pointer border-t border-[#a0622d] hover:bg-[#d3ae83]"
          >
            <i className="fi fi-rr-comment-dots text-[#2c1810] text-xs" />
            <span className="font-falling-sky text-xs font-bold text-[#2c1810] transition-opacity duration-300">
              Lobby Chat
            </span>
            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#5cb370] transition-opacity duration-300" />
            <i className="fi fi-rr-angle-up text-[#2c1810] text-xs ml-1" />
          </div>
        )}
      </div>
    </div>
  );
}