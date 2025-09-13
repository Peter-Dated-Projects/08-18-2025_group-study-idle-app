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

interface UseWebSocketReturn {
  isConnected: boolean;
  connectionCount: number;
  connectionError: string | null;
  sendMessage: (message: Record<string, unknown>) => void;
  onLobbyEvent: (handler: (event: LobbyEvent) => void) => void;
  onGameEvent: (handler: (event: GameEvent) => void) => void;
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

  const sendMessage = useCallback((message: Record<string, unknown>) => {
    wsManager.sendMessage(message);
  }, [wsManager]);

  const onLobbyEvent = useCallback((handler: (event: LobbyEvent) => void) => {
    return wsManager.addLobbyEventHandler(handler);
  }, [wsManager]);

  const onGameEvent = useCallback((handler: (event: GameEvent) => void) => {
    return wsManager.addGameEventHandler(handler);
  }, [wsManager]);

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
    connect,
    disconnect,
    clearConnectionError,
  };
}
