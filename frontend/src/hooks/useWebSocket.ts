import { useEffect, useRef, useState, useCallback } from "react";
import { useSessionAuth } from "./useSessionAuth";

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
  sendMessage: (message: Record<string, unknown>) => void;
  onLobbyEvent: (handler: (event: LobbyEvent) => void) => void;
  onGameEvent: (handler: (event: GameEvent) => void) => void;
  connect: () => void;
  disconnect: () => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const { user } = useSessionAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionCount, setConnectionCount] = useState(0);
  const lobbyEventHandlersRef = useRef<((event: LobbyEvent) => void)[]>([]);
  const gameEventHandlersRef = useRef<((event: GameEvent) => void)[]>([]);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!user?.userId) {
      console.log("WebSocket: No user available for connection");
      return;
    }

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
    }

    const wsUrl = `ws://localhost:8080/ws?user_id=${encodeURIComponent(user.userId)}`;
    console.log("WebSocket: Connecting to", wsUrl);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("🟢 WebSocket: Connection established");
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;

      // Send ping to get connection count
      ws.send(JSON.stringify({ type: "ping" }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("🔵 WebSocket: Received message", data);

        // Handle pong response
        if (data.type === "pong") {
          console.log("📡 WebSocket: Pong received, connections:", data.connections);
          setConnectionCount(data.connections || 0);
          return;
        }

        // Handle system messages
        if (data.type === "system") {
          console.log("⚙️ WebSocket: System message", data);
          return;
        }

        // Handle lobby events
        if (data.type === "lobby") {
          const lobbyEvent = data as LobbyEvent;
          console.log(
            `🏠 WebSocket: Lobby event - ${lobbyEvent.action.toUpperCase()} in lobby ${
              lobbyEvent.lobby_code
            }`,
            lobbyEvent
          );
          lobbyEventHandlersRef.current.forEach((handler) => handler(lobbyEvent));
        }

        // Handle game events
        if (data.type === "game") {
          const gameEvent = data as GameEvent;
          console.log(`🎮 WebSocket: Game event - ${gameEvent.action.toUpperCase()}`, gameEvent);
          gameEventHandlersRef.current.forEach((handler) => handler(gameEvent));
        }

        // Log unhandled message types
        if (!["pong", "system", "lobby", "game"].includes(data.type)) {
          console.warn("❓ WebSocket: Unknown message type", data);
        }
      } catch (error) {
        console.error("❌ WebSocket: Error parsing message", error);
      }
    };

    ws.onclose = (event) => {
      console.log(`🔴 WebSocket: Connection closed (code: ${event.code}, reason: ${event.reason})`);
      setIsConnected(false);
      wsRef.current = null;

      // Attempt to reconnect if not manually closed
      if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        console.log(
          `🔄 WebSocket: Reconnecting in ${delay}ms (attempt ${
            reconnectAttemptsRef.current + 1
          }/${maxReconnectAttempts})`
        );

        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++;
          connect();
        }, delay);
      } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
        console.log("❌ WebSocket: Max reconnection attempts reached");
      }
    };

    ws.onerror = (error) => {
      console.error("❌ WebSocket: Connection error", error);
    };
  }, [user?.userId]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, "Manual disconnect");
      wsRef.current = null;
    }

    setIsConnected(false);
    reconnectAttemptsRef.current = maxReconnectAttempts; // Prevent auto-reconnect
  }, []);

  const sendMessage = useCallback((message: Record<string, unknown>) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket: Cannot send message, not connected");
    }
  }, []);

  const onLobbyEvent = useCallback((handler: (event: LobbyEvent) => void) => {
    lobbyEventHandlersRef.current.push(handler);

    // Return cleanup function
    return () => {
      const index = lobbyEventHandlersRef.current.indexOf(handler);
      if (index > -1) {
        lobbyEventHandlersRef.current.splice(index, 1);
      }
    };
  }, []);

  const onGameEvent = useCallback((handler: (event: GameEvent) => void) => {
    gameEventHandlersRef.current.push(handler);

    // Return cleanup function
    return () => {
      const index = gameEventHandlersRef.current.indexOf(handler);
      if (index > -1) {
        gameEventHandlersRef.current.splice(index, 1);
      }
    };
  }, []);

  // Auto-connect when user is available
  useEffect(() => {
    if (user?.userId) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [user?.userId, connect, disconnect]);

  // Periodic ping to maintain connection and get stats
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      sendMessage({ type: "ping" });
    }, 30000); // Ping every 30 seconds

    return () => clearInterval(interval);
  }, [isConnected, sendMessage]);

  return {
    isConnected,
    connectionCount,
    sendMessage,
    onLobbyEvent,
    onGameEvent,
    connect,
    disconnect,
  };
}
