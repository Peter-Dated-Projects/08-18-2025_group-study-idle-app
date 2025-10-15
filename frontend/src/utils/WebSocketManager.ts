// Global WebSocket manager to maintain persistent connections across component re-mounts
import { WEBSOCKET_URL, BACKEND_URL } from "@/config/api";

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

type EventHandler<T> = (event: T) => void;

class WebSocketManager {
  private ws: WebSocket | null = null;
  private userId: string | null = null;
  private isConnected = false;
  private connectionCount = 0;
  private connectionError: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private hookRefCount = 0; // Track how many hooks are using this manager

  // Event handlers
  private lobbyEventHandlers: EventHandler<LobbyEvent>[] = [];
  private gameEventHandlers: EventHandler<GameEvent>[] = [];
  private chatEventHandlers: EventHandler<ChatEvent>[] = [];
  private pomoBankEventHandlers: EventHandler<PomoBankEvent>[] = [];

  // State change listeners
  private connectionStateListeners: Array<(isConnected: boolean) => void> = [];
  private connectionCountListeners: Array<(count: number) => void> = [];
  private connectionErrorListeners: Array<(error: string | null) => void> = [];

  // Singleton instance
  private static instance: WebSocketManager | null = null;

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  private constructor() {
    // Private constructor for singleton pattern
  }

  setUserId(userId: string | null) {
    if (this.userId !== userId) {
      this.userId = userId;

      // Reconnect with new user ID if we had a connection
      if (userId && this.ws) {
        this.disconnect();
        this.connect();
      } else if (userId && !this.ws) {
        this.connect();
      } else if (!userId) {
        this.disconnect();
      }
    }
  }

  connect() {
    if (!this.userId) {

      return;
    }

    // Don't reconnect if already connected with same user
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {

      return;
    }

    // Close existing connection if any
    if (this.ws) {
      this.ws.close();
    }

    // Convert HTTP backend URL to WebSocket URL
    const wsUrl = WEBSOCKET_URL + `/ws?user_id=${encodeURIComponent(this.userId)}`;

    const ws = new WebSocket(wsUrl);
    this.ws = ws;

    ws.onopen = () => {

      this.isConnected = true;
      this.connectionError = null;
      this.reconnectAttempts = 0;

      this.notifyConnectionStateListeners(true);
      this.notifyConnectionErrorListeners(null);

      // Send ping to get connection count
      ws.send(JSON.stringify({ type: "ping" }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Handle pong response
        if (data.type === "pong") {

          this.connectionCount = data.connections || 0;
          this.notifyConnectionCountListeners(this.connectionCount);
          return;
        }

        // Handle system messages
        if (data.type === "system") {

          return;
        }

        // Handle lobby events
        if (data.type === "lobby") {
          const lobbyEvent = data as LobbyEvent;

          this.lobbyEventHandlers.forEach((handler) => handler(lobbyEvent));
        }

        // Handle game events
        if (data.type === "game") {
          const gameEvent = data as GameEvent;

          this.gameEventHandlers.forEach((handler) => handler(gameEvent));
        }

        // Handle chat events
        if (data.type === "chat_message") {
          const chatEvent = data as ChatEvent;

          this.chatEventHandlers.forEach((handler) => handler(chatEvent));
        }

        // Handle pomo bank events
        if (data.type === "pomo_bank_update") {
          const pomoBankEvent = data as PomoBankEvent;

          this.pomoBankEventHandlers.forEach((handler) => handler(pomoBankEvent));
        }

        // Log unhandled message types
        if (
          !["pong", "system", "lobby", "game", "chat_message", "pomo_bank_update"].includes(
            data.type
          )
        ) {
          console.warn("❓ WebSocket: Unknown message type", data);
        }
      } catch (error) {
        console.error("❌ WebSocket: Error parsing message", error);
      }
    };

    ws.onclose = (event) => {

      this.isConnected = false;
      this.ws = null;
      this.notifyConnectionStateListeners(false);

      // Attempt to reconnect if not manually closed
      if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

        this.connectionError = `Connection lost. Reconnecting... (${this.reconnectAttempts + 1}/${
          this.maxReconnectAttempts
        })`;
        this.notifyConnectionErrorListeners(this.connectionError);

        this.reconnectTimeout = setTimeout(() => {
          this.reconnectAttempts++;
          this.connect();
        }, delay);
      } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {

        this.connectionError =
          "Server is unreachable. Please check your connection and try refreshing the page.";
        this.notifyConnectionErrorListeners(this.connectionError);
      }
    };

    ws.onerror = (error) => {
      console.error("❌ WebSocket: Connection error", error);
    };
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close(1000, "Manual disconnect");
      this.ws = null;
    }

    this.isConnected = false;
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto-reconnect
    this.notifyConnectionStateListeners(false);
  }

  sendMessage(message: Record<string, unknown>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket: Cannot send message, not connected");
    }
  }

  // Event handler management
  addLobbyEventHandler(handler: EventHandler<LobbyEvent>): () => void {
    this.lobbyEventHandlers.push(handler);
    return () => {
      const index = this.lobbyEventHandlers.indexOf(handler);
      if (index > -1) {
        this.lobbyEventHandlers.splice(index, 1);
      }
    };
  }

  addGameEventHandler(handler: EventHandler<GameEvent>): () => void {
    this.gameEventHandlers.push(handler);
    return () => {
      const index = this.gameEventHandlers.indexOf(handler);
      if (index > -1) {
        this.gameEventHandlers.splice(index, 1);
      }
    };
  }

  addChatEventHandler(handler: EventHandler<ChatEvent>): () => void {
    this.chatEventHandlers.push(handler);
    return () => {
      const index = this.chatEventHandlers.indexOf(handler);
      if (index > -1) {
        this.chatEventHandlers.splice(index, 1);
      }
    };
  }

  addPomoBankEventHandler(handler: EventHandler<PomoBankEvent>): () => void {
    this.pomoBankEventHandlers.push(handler);
    return () => {
      const index = this.pomoBankEventHandlers.indexOf(handler);
      if (index > -1) {
        this.pomoBankEventHandlers.splice(index, 1);
      }
    };
  }

  // State change listener management
  addConnectionStateListener(listener: (isConnected: boolean) => void): () => void {
    this.connectionStateListeners.push(listener);
    // Immediately call with current state
    listener(this.isConnected);

    return () => {
      const index = this.connectionStateListeners.indexOf(listener);
      if (index > -1) {
        this.connectionStateListeners.splice(index, 1);
      }
    };
  }

  addConnectionCountListener(listener: (count: number) => void): () => void {
    this.connectionCountListeners.push(listener);
    // Immediately call with current state
    listener(this.connectionCount);

    return () => {
      const index = this.connectionCountListeners.indexOf(listener);
      if (index > -1) {
        this.connectionCountListeners.splice(index, 1);
      }
    };
  }

  addConnectionErrorListener(listener: (error: string | null) => void): () => void {
    this.connectionErrorListeners.push(listener);
    // Immediately call with current state
    listener(this.connectionError);

    return () => {
      const index = this.connectionErrorListeners.indexOf(listener);
      if (index > -1) {
        this.connectionErrorListeners.splice(index, 1);
      }
    };
  }

  // Private notification methods
  private notifyConnectionStateListeners(isConnected: boolean) {
    this.connectionStateListeners.forEach((listener) => listener(isConnected));
  }

  private notifyConnectionCountListeners(count: number) {
    this.connectionCountListeners.forEach((listener) => listener(count));
  }

  private notifyConnectionErrorListeners(error: string | null) {
    this.connectionErrorListeners.forEach((listener) => listener(error));
  }

  // Getters for current state
  getIsConnected(): boolean {
    return this.isConnected;
  }

  getConnectionCount(): number {
    return this.connectionCount;
  }

  getConnectionError(): string | null {
    return this.connectionError;
  }

  clearConnectionError() {
    this.connectionError = null;
    this.notifyConnectionErrorListeners(null);
  }

  // Start periodic ping (only once, managed internally)
  private startPeriodicPing() {
    if (this.pingInterval) return; // Already started

    this.pingInterval = setInterval(() => {
      if (this.isConnected) {
        this.sendMessage({ type: "ping" });
      }
    }, 30000); // Ping every 30 seconds
  }

  private stopPeriodicPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  // Hook lifecycle management
  onHookMount(): () => void {
    this.hookRefCount++;

    // Start ping when first hook mounts
    if (this.hookRefCount === 1) {
      this.startPeriodicPing();
    }

    // Return cleanup function
    return () => {
      this.hookRefCount--;

      // Stop ping when last hook unmounts
      if (this.hookRefCount === 0) {
        this.stopPeriodicPing();
      }
    };
  }
}

export default WebSocketManager;
