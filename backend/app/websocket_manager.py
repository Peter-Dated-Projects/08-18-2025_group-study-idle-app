"""
WebSocket manager for real-time lobby events.
Handles WebSocket connections and broadcasts lobby events to connected clients.
"""
import json
import logging
from typing import Dict, List, Set
from fastapi import WebSocket
from pydantic import BaseModel

logger = logging.getLogger(__name__)

class LobbyEvent(BaseModel):
    """Structure for lobby events."""
    type: str  # "lobby"
    action: str  # "join", "leave", "disband"
    lobby_code: str
    user_id: str
    users: List[str] = []  # Updated user list

class GameEvent(BaseModel):
    """Structure for game events (future use)."""
    type: str  # "game"
    action: str
    lobby_code: str
    data: dict = {}

class ConnectionManager:
    """Manages WebSocket connections and broadcasts events."""
    
    def __init__(self):
        # Active connections: {user_id: websocket}
        self.active_connections: Dict[str, WebSocket] = {}
        # User lobby mapping: {user_id: lobby_code}
        self.user_lobbies: Dict[str, str] = {}
        # Lobby users mapping: {lobby_code: set(user_ids)}
        self.lobby_users: Dict[str, Set[str]] = {}
        
    async def connect(self, websocket: WebSocket, user_id: str):
        """Accept a new WebSocket connection."""
        await websocket.accept()
        
        # Disconnect existing connection if user reconnects
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].close()
            except Exception as e:
                logger.warning(f"Error closing existing connection for {user_id}: {e}")
        
        self.active_connections[user_id] = websocket
        logger.info(f"User {user_id} connected via WebSocket. Total connections: {len(self.active_connections)}")
        
    def disconnect(self, user_id: str):
        """Remove a WebSocket connection."""
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            
        # Remove from lobby mappings
        if user_id in self.user_lobbies:
            lobby_code = self.user_lobbies[user_id]
            del self.user_lobbies[user_id]
            
            if lobby_code in self.lobby_users:
                self.lobby_users[lobby_code].discard(user_id)
                if not self.lobby_users[lobby_code]:
                    del self.lobby_users[lobby_code]
                    
        logger.info(f"User {user_id} disconnected. Total connections: {len(self.active_connections)}")
    
    def add_user_to_lobby(self, user_id: str, lobby_code: str):
        """Track that a user joined a lobby."""
        self.user_lobbies[user_id] = lobby_code
        if lobby_code not in self.lobby_users:
            self.lobby_users[lobby_code] = set()
        self.lobby_users[lobby_code].add(user_id)
        
    def remove_user_from_lobby(self, user_id: str):
        """Track that a user left a lobby."""
        if user_id in self.user_lobbies:
            lobby_code = self.user_lobbies[user_id]
            del self.user_lobbies[user_id]
            
            if lobby_code in self.lobby_users:
                self.lobby_users[lobby_code].discard(user_id)
                if not self.lobby_users[lobby_code]:
                    del self.lobby_users[lobby_code]
                    
            return lobby_code
        return None
    
    async def send_personal_message(self, message: dict, user_id: str):
        """Send a message to a specific user."""
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error sending message to {user_id}: {e}")
                self.disconnect(user_id)
    
    async def broadcast_to_lobby(self, message: dict, lobby_code: str, exclude_user: str = None):
        """Send a message to all users in a specific lobby."""
        if lobby_code not in self.lobby_users:
            print(f"Lobby no longer active: {lobby_code}")
            return
        
        disconnected_users = []
        for user_id in self.lobby_users[lobby_code]:
            if exclude_user and user_id == exclude_user:
                continue
                
            if user_id in self.active_connections:
                try:
                    await self.active_connections[user_id].send_text(json.dumps(message))
                except Exception as e:
                    logger.error(f"Error broadcasting to {user_id}: {e}")
                    disconnected_users.append(user_id)
        
        # Clean up disconnected users
        for user_id in disconnected_users:
            self.disconnect(user_id)
    
    async def broadcast_lobby_event(self, event: LobbyEvent):
        """Broadcast a lobby event to all users in the lobby."""
        message = {
            "type": event.type,
            "action": event.action,
            "lobby_code": event.lobby_code,
            "user_id": event.user_id,
            "users": event.users
        }
        await self.broadcast_to_lobby(message, event.lobby_code)
        logger.info(f"Broadcasted {event.action} event for lobby {event.lobby_code}")
    
    def get_connection_count(self) -> int:
        """Get the number of active connections."""
        return len(self.active_connections)
    
    def get_lobby_users(self, lobby_code: str) -> List[str]:
        """Get all users in a specific lobby."""
        return list(self.lobby_users.get(lobby_code, set()))

# Global connection manager instance
manager = ConnectionManager()
