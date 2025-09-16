import { useEffect, useCallback, useRef } from "react";
import { useWebSocket } from "./useWebSocket";
import { ChatMessage } from "@/types/chat";

// Event types for the system
export interface ChatMessageEvent {
  type: "chat_message";
  action: "new_message" | "message_deleted" | "chat_cleared";
  lobby_code: string;
  user_id: string;
  username: string;
  message?: ChatMessage;
  timestamp: string;
}

export interface LobbyEvent {
  type: "lobby";
  action: "join" | "leave" | "disband" | "user_update";
  lobby_code: string;
  user_id: string;
  username?: string;
  users: string[];
  timestamp: string;
}

export interface UserPresenceEvent {
  type: "user_presence";
  action: "online" | "offline" | "typing_start" | "typing_end";
  lobby_code?: string;
  user_id: string;
  username: string;
  timestamp: string;
}

export type GameEvent = {
  type: "game";
  action: string;
  game_id: string;
  user_id: string;
  data: Record<string, unknown>;
  timestamp: string;
};

export type SystemEvent = ChatMessageEvent | LobbyEvent | UserPresenceEvent | GameEvent;

// Event handler types
export type EventHandler<T extends SystemEvent> = (event: T) => void;
export type ChatMessageEventHandler = EventHandler<ChatMessageEvent>;
export type LobbyEventHandler = EventHandler<LobbyEvent>;
export type UserPresenceEventHandler = EventHandler<UserPresenceEvent>;
export type GameEventHandler = EventHandler<GameEvent>;

// Main event system hook
interface UseEventSystemReturn {
  // Event subscription methods
  onChatMessage: (handler: ChatMessageEventHandler) => () => void;
  onLobbyEvent: (handler: LobbyEventHandler) => () => void;
  onUserPresence: (handler: UserPresenceEventHandler) => () => void;
  onGameEvent: (handler: GameEventHandler) => () => void;
  onAnyEvent: (handler: EventHandler<SystemEvent>) => () => void;

  // Event emission methods
  emitChatMessage: (event: Omit<ChatMessageEvent, "timestamp">) => void;
  emitLobbyEvent: (event: Omit<LobbyEvent, "timestamp">) => void;
  emitUserPresence: (event: Omit<UserPresenceEvent, "timestamp">) => void;
  emitGameEvent: (event: Omit<GameEvent, "timestamp">) => void;

  // Connection status
  isConnected: boolean;
  connectionError: string | null;
}

export function useEventSystem(): UseEventSystemReturn {
  const {
    isConnected,
    connectionError,
    sendMessage,
    onLobbyEvent: onWSLobbyEvent,
    onChatEvent: onWSChatEvent,
  } = useWebSocket();

  // Store event handlers using refs to prevent stale closures
  const chatMessageHandlers = useRef<Set<ChatMessageEventHandler>>(new Set());
  const lobbyEventHandlers = useRef<Set<LobbyEventHandler>>(new Set());
  const userPresenceHandlers = useRef<Set<UserPresenceEventHandler>>(new Set());
  const gameEventHandlers = useRef<Set<GameEventHandler>>(new Set());
  const anyEventHandlers = useRef<Set<EventHandler<SystemEvent>>>(new Set());

  // Process incoming WebSocket messages and route to appropriate handlers
  const processIncomingEvent = useCallback((rawEvent: any) => {
    try {
      // Add timestamp if not present
      const event: SystemEvent = {
        ...rawEvent,
        timestamp: rawEvent.timestamp || new Date().toISOString(),
      };

      // Route to specific event handlers
      switch (event.type) {
        case "chat_message":
          chatMessageHandlers.current.forEach((handler) => handler(event as ChatMessageEvent));
          break;
        case "lobby":
          lobbyEventHandlers.current.forEach((handler) => handler(event as LobbyEvent));
          break;
        case "user_presence":
          userPresenceHandlers.current.forEach((handler) => handler(event as UserPresenceEvent));
          break;
        case "game":
          gameEventHandlers.current.forEach((handler) => handler(event as GameEvent));
          break;
      }

      // Also call any-event handlers
      anyEventHandlers.current.forEach((handler) => handler(event));
    } catch (error) {
      console.error("Error processing incoming event:", error, rawEvent);
    }
  }, []);

  // Subscribe to WebSocket lobby events and route them through our system
  useEffect(() => {
    const cleanup = onWSLobbyEvent((wsEvent) => {
      // Convert WebSocket lobby event to our system event format
      const systemEvent: LobbyEvent = {
        type: "lobby",
        action: wsEvent.action,
        lobby_code: wsEvent.lobby_code,
        user_id: wsEvent.user_id,
        users: wsEvent.users,
        timestamp: new Date().toISOString(),
      };
      processIncomingEvent(systemEvent);
    });

    return cleanup;
  }, [onWSLobbyEvent, processIncomingEvent]);

  // Subscribe to WebSocket chat events and route them through our system
  useEffect(() => {
    const cleanup = onWSChatEvent((wsEvent) => {
      // Convert WebSocket chat event to our system event format
      const systemEvent: ChatMessageEvent = {
        type: "chat_message",
        action: wsEvent.action,
        lobby_code: wsEvent.lobby_code,
        user_id: wsEvent.user_id,
        username: wsEvent.username || "Unknown User",
        message: wsEvent.message,
        timestamp: new Date().toISOString(),
      };

      // Route to chat message handlers directly
      chatMessageHandlers.current.forEach((handler) => handler(systemEvent));

      // Also call any-event handlers
      anyEventHandlers.current.forEach((handler) => handler(systemEvent));
    });

    return cleanup;
  }, [onWSChatEvent]);

  // Event subscription methods
  const onChatMessage = useCallback((handler: ChatMessageEventHandler) => {
    chatMessageHandlers.current.add(handler);
    return () => {
      chatMessageHandlers.current.delete(handler);
    };
  }, []);

  const onLobbyEvent = useCallback((handler: LobbyEventHandler) => {
    lobbyEventHandlers.current.add(handler);
    return () => {
      lobbyEventHandlers.current.delete(handler);
    };
  }, []);

  const onUserPresence = useCallback((handler: UserPresenceEventHandler) => {
    userPresenceHandlers.current.add(handler);
    return () => {
      userPresenceHandlers.current.delete(handler);
    };
  }, []);

  const onGameEvent = useCallback((handler: GameEventHandler) => {
    gameEventHandlers.current.add(handler);
    return () => {
      gameEventHandlers.current.delete(handler);
    };
  }, []);

  const onAnyEvent = useCallback((handler: EventHandler<SystemEvent>) => {
    anyEventHandlers.current.add(handler);
    return () => {
      anyEventHandlers.current.delete(handler);
    };
  }, []);

  // Event emission methods
  const emitChatMessage = useCallback(
    (event: Omit<ChatMessageEvent, "timestamp">) => {
      const fullEvent: ChatMessageEvent = {
        ...event,
        timestamp: new Date().toISOString(),
      };
      sendMessage(fullEvent as unknown as Record<string, unknown>);
    },
    [sendMessage]
  );

  const emitLobbyEvent = useCallback(
    (event: Omit<LobbyEvent, "timestamp">) => {
      const fullEvent: LobbyEvent = {
        ...event,
        timestamp: new Date().toISOString(),
      };
      sendMessage(fullEvent as unknown as Record<string, unknown>);
    },
    [sendMessage]
  );

  const emitUserPresence = useCallback(
    (event: Omit<UserPresenceEvent, "timestamp">) => {
      const fullEvent: UserPresenceEvent = {
        ...event,
        timestamp: new Date().toISOString(),
      };
      sendMessage(fullEvent as unknown as Record<string, unknown>);
    },
    [sendMessage]
  );

  const emitGameEvent = useCallback(
    (event: Omit<GameEvent, "timestamp">) => {
      const fullEvent: GameEvent = {
        ...event,
        timestamp: new Date().toISOString(),
      };
      sendMessage(fullEvent as unknown as Record<string, unknown>);
    },
    [sendMessage]
  );

  return {
    // Event subscription methods
    onChatMessage,
    onLobbyEvent,
    onUserPresence,
    onGameEvent,
    onAnyEvent,

    // Event emission methods
    emitChatMessage,
    emitLobbyEvent,
    emitUserPresence,
    emitGameEvent,

    // Connection status
    isConnected,
    connectionError,
  };
}

// Specialized hooks for specific event types

/**
 * Hook specifically for chat message events in a lobby
 */
export function useChatEvents(lobbyCode: string | undefined) {
  const { onChatMessage, emitChatMessage, isConnected } = useEventSystem();

  const onMessage = useCallback(
    (handler: (message: ChatMessage) => void) => {
      return onChatMessage((event) => {
        if (event.lobby_code === lobbyCode && event.action === "new_message" && event.message) {
          handler(event.message);
        }
      });
    },
    [onChatMessage, lobbyCode]
  );

  const onChatCleared = useCallback(
    (handler: () => void) => {
      return onChatMessage((event) => {
        if (event.lobby_code === lobbyCode && event.action === "chat_cleared") {
          handler();
        }
      });
    },
    [onChatMessage, lobbyCode]
  );

  const broadcastNewMessage = useCallback(
    (message: ChatMessage, username: string) => {
      if (!lobbyCode) return;

      emitChatMessage({
        type: "chat_message",
        action: "new_message",
        lobby_code: lobbyCode,
        user_id: message.user_id,
        username: username,
        message: message,
      });
    },
    [emitChatMessage, lobbyCode]
  );

  const broadcastChatCleared = useCallback(
    (userId: string, username: string) => {
      if (!lobbyCode) return;

      emitChatMessage({
        type: "chat_message",
        action: "chat_cleared",
        lobby_code: lobbyCode,
        user_id: userId,
        username: username,
      });
    },
    [emitChatMessage, lobbyCode]
  );

  return {
    onMessage,
    onChatCleared,
    broadcastNewMessage,
    broadcastChatCleared,
    isConnected,
  };
}

/**
 * Hook specifically for lobby events
 */
export function useLobbyEvents(lobbyCode: string | undefined) {
  const { onLobbyEvent, emitLobbyEvent, isConnected } = useEventSystem();

  const onUserJoined = useCallback(
    (handler: (userId: string, username: string, users: string[]) => void) => {
      return onLobbyEvent((event) => {
        if (event.lobby_code === lobbyCode && event.action === "join") {
          handler(event.user_id, event.username || event.user_id, event.users);
        }
      });
    },
    [onLobbyEvent, lobbyCode]
  );

  const onUserLeft = useCallback(
    (handler: (userId: string, username: string, users: string[]) => void) => {
      return onLobbyEvent((event) => {
        if (event.lobby_code === lobbyCode && event.action === "leave") {
          handler(event.user_id, event.username || event.user_id, event.users);
        }
      });
    },
    [onLobbyEvent, lobbyCode]
  );

  const onLobbyDisbanded = useCallback(
    (handler: (hostId: string) => void) => {
      return onLobbyEvent((event) => {
        if (event.lobby_code === lobbyCode && event.action === "disband") {
          handler(event.user_id);
        }
      });
    },
    [onLobbyEvent, lobbyCode]
  );

  return {
    onUserJoined,
    onUserLeft,
    onLobbyDisbanded,
    isConnected,
  };
}

/**
 * Hook for user presence/typing indicators
 */
export function useUserPresence(lobbyCode: string | undefined, userId: string | undefined) {
  const { onUserPresence, emitUserPresence, isConnected } = useEventSystem();

  const onUserTyping = useCallback(
    (handler: (userId: string, username: string, isTyping: boolean) => void) => {
      return onUserPresence((event) => {
        if (
          event.lobby_code === lobbyCode &&
          (event.action === "typing_start" || event.action === "typing_end")
        ) {
          handler(event.user_id, event.username, event.action === "typing_start");
        }
      });
    },
    [onUserPresence, lobbyCode]
  );

  const startTyping = useCallback(
    (username: string) => {
      if (!lobbyCode || !userId) return;

      emitUserPresence({
        type: "user_presence",
        action: "typing_start",
        lobby_code: lobbyCode,
        user_id: userId,
        username: username,
      });
    },
    [emitUserPresence, lobbyCode, userId]
  );

  const stopTyping = useCallback(
    (username: string) => {
      if (!lobbyCode || !userId) return;

      emitUserPresence({
        type: "user_presence",
        action: "typing_end",
        lobby_code: lobbyCode,
        user_id: userId,
        username: username,
      });
    },
    [emitUserPresence, lobbyCode, userId]
  );

  return {
    onUserTyping,
    startTyping,
    stopTyping,
    isConnected,
  };
}
