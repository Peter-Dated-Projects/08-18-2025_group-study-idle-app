import { useState, useEffect, useCallback } from "react";
import { ChatMessage } from "@/types/chat";
import { useChatEvents } from "./useEventSystem";

interface UseChatReturn {
  messages: ChatMessage[];
  loading: boolean;
  sending: boolean;
  error: string | null;
  sendMessage: (lobbyCode: string, content: string, username: string) => Promise<boolean>;
  loadMessages: (lobbyCode: string) => Promise<void>;
  clearMessages: (lobbyCode: string) => Promise<void>;
  clearLocalMessages: () => void;
}

export function useChat(lobbyCode?: string): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use event system for real-time updates
  const { onMessage, onChatCleared, broadcastNewMessage, isConnected } = useChatEvents(lobbyCode);

  // Listen for new messages from other users
  useEffect(() => {
    if (!lobbyCode) return;

    const handleNewMessage = (message: ChatMessage) => {
      setMessages((prev) => {
        // Check if we already have this message to prevent duplicates
        // Use a combination of user_id, content, and timestamp as unique identifier
        const exists = prev.some(
          (msg) =>
            msg.user_id === message.user_id &&
            msg.content === message.content &&
            msg.time_created === message.time_created
        );
        if (exists) return prev;
        return [...prev, message];
      });
    };

    const handleChatCleared = () => {
      setMessages([]);
    };

    const unsubscribeMessage = onMessage(handleNewMessage);
    const unsubscribeCleared = onChatCleared(handleChatCleared);

    return () => {
      unsubscribeMessage();
      unsubscribeCleared();
    };
  }, [lobbyCode, onMessage, onChatCleared]);

  const clearLocalMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const loadMessages = useCallback(async (lobbyCode: string) => {
    if (!lobbyCode) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/chat/messages/${encodeURIComponent(lobbyCode)}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setMessages(data.messages || []);
      } else {
        setError(data.message || "Failed to load messages");
      }
    } catch (err) {
      setError("Failed to load messages");
      console.error("Error loading messages:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const sendMessage = useCallback(
    async (lobbyCode: string, content: string, username: string): Promise<boolean> => {
      if (!lobbyCode || !content.trim()) return false;

      setSending(true);
      setError(null);

      try {
        const response = await fetch("/api/chat/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            lobby_code: lobbyCode,
            content: content.trim(),
            username: username,
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          // Add the new message to the local state
          if (data.chat_message) {
            setMessages((prev) => [...prev, data.chat_message]);

            // Broadcast the message to other users in the lobby
            broadcastNewMessage(data.chat_message, username);
          }
          return true;
        } else {
          setError(data.message || "Failed to send message");
          return false;
        }
      } catch (err) {
        setError("Failed to send message");
        console.error("Error sending message:", err);
        return false;
      } finally {
        setSending(false);
      }
    },
    [broadcastNewMessage]
  );

  const clearMessages = useCallback(async (lobbyCode: string) => {
    if (!lobbyCode) return;

    try {
      const response = await fetch("/api/chat/clear", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lobby_code: lobbyCode,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessages([]);
      } else {
        setError(data.message || "Failed to clear messages");
      }
    } catch (err) {
      setError("Failed to clear messages");
      console.error("Error clearing messages:", err);
    }
  }, []);

  return {
    messages,
    loading,
    sending,
    error,
    sendMessage,
    loadMessages,
    clearMessages,
    clearLocalMessages,
  };
}
