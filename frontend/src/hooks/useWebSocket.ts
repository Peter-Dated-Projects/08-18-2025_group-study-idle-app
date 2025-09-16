import { useEffect, useState, useCallback } from "react";
import { useSessionAuth } from "./useSessionAuth";
import WebSocketManager from "@/utils/WebSocketManager";

interface LobbyEvent {
  type: "lobby" | "game";
  action: "join" | "leave" | "disband";
  lobby_code: string;
  user_id: string;
  users: string[];
}

interface GameEvent {
  type: "game";
  action: string;
  game_id: string;
  data: Record<string, unknown>;
}

interface ChatEvent {
  type: "chat_message";
  action: "new_message" | "chat_cleared";
  lobby_code: string;
  user_id: string;
  username?: string;
  message?: {
    time_created: string;
    user_id: string;
    username: string;
    content: string;
  };
}

interface PomoBankEvent {
  type: "pomo_bank_update";
  action: "balance_changed";
  user_id: string;
  new_balance: number;
  old_balance: number;
  change_amount: number;
  reason: string;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  connectionCount: number;
  connectionError: string | null;
  sendMessage: (message: Record<string, unknown>) => void;
  onLobbyEvent: (handler: (event: LobbyEvent) => void) => void;
  onGameEvent: (handler: (event: GameEvent) => void) => void;
  onChatEvent: (handler: (event: ChatEvent) => void) => void;
  onPomoBankEvent: (handler: (event: PomoBankEvent) => void) => void;
  connect: () => void;
  disconnect: () => void;
  clearConnectionError: () => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const { user } = useSessionAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionCount, setConnectionCount] = useState(0);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Get the persistent WebSocket manager
  const wsManager = WebSocketManager.getInstance();

  // Update user ID in manager when user changes
  useEffect(() => {
    wsManager.setUserId(user?.userId || null);
  }, [user?.userId, wsManager]);

  // Subscribe to connection state changes
  useEffect(() => {
    const cleanup = wsManager.addConnectionStateListener(setIsConnected);
    return cleanup;
  }, [wsManager]);

  // Subscribe to connection count changes
  useEffect(() => {
    const cleanup = wsManager.addConnectionCountListener(setConnectionCount);
    return cleanup;
  }, [wsManager]);

  // Subscribe to connection error changes
  useEffect(() => {
    const cleanup = wsManager.addConnectionErrorListener(setConnectionError);
    return cleanup;
  }, [wsManager]);

  // Register this hook with the manager for lifecycle management
  useEffect(() => {
    const cleanup = wsManager.onHookMount();
    return cleanup;
  }, [wsManager]);

  const sendMessage = useCallback(
    (message: Record<string, unknown>) => {
      wsManager.sendMessage(message);
    },
    [wsManager]
  );

  const onLobbyEvent = useCallback(
    (handler: (event: LobbyEvent) => void) => {
      return wsManager.addLobbyEventHandler(handler);
    },
    [wsManager]
  );

  const onGameEvent = useCallback(
    (handler: (event: GameEvent) => void) => {
      return wsManager.addGameEventHandler(handler);
    },
    [wsManager]
  );

  const onChatEvent = useCallback(
    (handler: (event: ChatEvent) => void) => {
      return wsManager.addChatEventHandler(handler);
    },
    [wsManager]
  );

  const onPomoBankEvent = useCallback(
    (handler: (event: PomoBankEvent) => void) => {
      return wsManager.addPomoBankEventHandler(handler);
    },
    [wsManager]
  );

  const connect = useCallback(() => {
    wsManager.connect();
  }, [wsManager]);

  const disconnect = useCallback(() => {
    wsManager.disconnect();
  }, [wsManager]);

  const clearConnectionError = useCallback(() => {
    wsManager.clearConnectionError();
  }, [wsManager]);

  return {
    isConnected,
    connectionCount,
    connectionError,
    sendMessage,
    onLobbyEvent,
    onGameEvent,
    onChatEvent,
    onPomoBankEvent,
    connect,
    disconnect,
    clearConnectionError,
  };
}
