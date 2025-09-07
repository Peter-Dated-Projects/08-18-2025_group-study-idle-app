"""
Redis-based lobby service module for handling lobby operations with RedisJSON.
This replaces the PostgreSQL-based lobby system with a Redis-based one.
"""
import secrets
import string
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from ..websocket_manager import manager, LobbyEvent
from ..utils.redis_json_utils import redis_json_client

# Configure logging
logger = logging.getLogger(__name__)

# ------------------------------------------------------------------ #
# Constants
# ------------------------------------------------------------------ #

LOBBY_KEY_PREFIX = "lobby:"
LOBBY_CODE_SET = "lobby_codes"
LOBBY_TTL_SECONDS = 24 * 60 * 60  # 24 hours

# ------------------------------------------------------------------ #
# Data Models
# ------------------------------------------------------------------ #

class LobbyData:
    """
    Data class representing a lobby stored in Redis.
    """
    def __init__(self, code: str, host_user_id: str, users: List[str] = None, 
                 created_at: str = None, status: str = "active"):
        self.code = code
        self.host_user_id = host_user_id
        self.users = users or [host_user_id]
        self.created_at = created_at or datetime.now(timezone.utc).isoformat()
        self.status = status
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for Redis storage."""
        return {
            "code": self.code,
            "host_user_id": self.host_user_id,
            "users": self.users,
            "created_at": self.created_at,
            "status": self.status
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'LobbyData':
        """Create LobbyData from dictionary retrieved from Redis."""
        return cls(
            code=data.get("code", ""),
            host_user_id=data.get("host_user_id", ""),
            users=data.get("users", []),
            created_at=data.get("created_at", ""),
            status=data.get("status", "active")
        )
    
    def __repr__(self):
        return f"LobbyData(code={self.code}, host={self.host_user_id}, users={len(self.users)})"

# ------------------------------------------------------------------ #
# Helper Functions
# ------------------------------------------------------------------ #

def _get_lobby_key(code: str) -> str:
    """Get the Redis key for a lobby."""
    return f"{LOBBY_KEY_PREFIX}{code}"

def generate_lobby_code() -> str:
    """Generate a unique 16-character lobby code."""
    # Use uppercase letters and numbers for readability
    characters = string.ascii_uppercase + string.digits
    # Remove potentially confusing characters
    characters = characters.replace('0', '').replace('O', '').replace('1', '').replace('I', '')
    
    # Generate 16-character code
    return ''.join(secrets.choice(characters) for _ in range(16))

async def _broadcast_lobby_event(event: LobbyEvent):
    """
    Helper function to safely broadcast lobby events.
    
    Args:
        event: The lobby event to broadcast
    """
    try:
        await manager.broadcast_lobby_event(event)
    except Exception as e:
        logger.warning(f"Failed to broadcast lobby event: {e}")

def _add_code_to_set(code: str) -> bool:
    """Add lobby code to the set of active codes."""
    try:
        redis_json_client.client.sadd(LOBBY_CODE_SET, code)
        return True
    except Exception as e:
        logger.error(f"Failed to add code {code} to set: {e}")
        return False

def _remove_code_from_set(code: str) -> bool:
    """Remove lobby code from the set of active codes."""
    try:
        redis_json_client.client.srem(LOBBY_CODE_SET, code)
        return True
    except Exception as e:
        logger.error(f"Failed to remove code {code} from set: {e}")
        return False

def _code_exists_in_set(code: str) -> bool:
    """Check if code exists in the active codes set."""
    try:
        return bool(redis_json_client.client.sismember(LOBBY_CODE_SET, code))
    except Exception as e:
        logger.error(f"Failed to check code {code} existence: {e}")
        return False

# ------------------------------------------------------------------ #
# Lobby Service Functions
# ------------------------------------------------------------------ #

async def create_lobby(host_id: str) -> Optional[LobbyData]:
    """
    Create a new lobby with a unique code.
    
    Args:
        host_id: The user ID of the lobby host
        
    Returns:
        LobbyData object if successful, None if failed
        
    Raises:
        Exception: With user-friendly error message
    """
    try:
        # Generate unique code
        max_attempts = 10
        code = None
        
        for attempt in range(max_attempts):
            temp_code = generate_lobby_code()
            
            # Check if code already exists in the set (faster than checking Redis keys)
            if not _code_exists_in_set(temp_code):
                code = temp_code
                break
                
            if attempt == max_attempts - 1:
                logger.error("Failed to generate unique lobby code after maximum attempts")
                raise Exception("Unable to generate unique lobby code. Please try again.")
        
        # Create new lobby data
        lobby_data = LobbyData(
            code=code,
            host_user_id=host_id,
            users=[host_id]  # Host automatically joins the lobby
        )
        
        # Store lobby in Redis with JSON
        lobby_key = _get_lobby_key(code)
        success = redis_json_client.json_set(
            lobby_key, 
            '.', 
            lobby_data.to_dict(), 
            expire_seconds=LOBBY_TTL_SECONDS
        )
        
        if not success:
            logger.error(f"Failed to store lobby {code} in Redis")
            raise Exception("Failed to create lobby in database")
        
        # Add code to the active codes set
        _add_code_to_set(code)
        
        # Add user to WebSocket lobby tracking
        manager.add_user_to_lobby(host_id, code)
        
        # Broadcast join event for the host
        event = LobbyEvent(
            type="lobby",
            action="join",
            lobby_code=code,
            user_id=host_id,
            users=lobby_data.users
        )
        await _broadcast_lobby_event(event)
        
        logger.info(f"Created lobby {code} hosted by {host_id}")
        return lobby_data
        
    except Exception as e:
        logger.error(f"Error creating lobby: {e}")
        if "Unable to generate unique lobby code" in str(e):
            raise e  # Re-raise user-friendly error
        raise Exception("Database error occurred while creating lobby")

def get_lobby(code: str) -> Optional[LobbyData]:
    """
    Get lobby by code.
    
    Args:
        code: The lobby code
        
    Returns:
        LobbyData object if found, None otherwise
    """
    try:
        lobby_key = _get_lobby_key(code)
        lobby_dict = redis_json_client.json_get(lobby_key)
        
        if lobby_dict is None:
            return None
            
        return LobbyData.from_dict(lobby_dict)
    except Exception as e:
        logger.error(f"Error getting lobby {code}: {e}")
        return None

async def join_lobby(code: str, user_id: str) -> Optional[LobbyData]:
    """
    Add a user to an existing lobby.
    
    Args:
        code: The lobby code
        user_id: The user ID to add
        
    Returns:
        Updated LobbyData object if successful, None if failed
        
    Raises:
        Exception: With user-friendly error message
    """
    try:
        lobby_key = _get_lobby_key(code)
        
        # Check if lobby exists
        if not redis_json_client.json_exists(lobby_key):
            logger.warning(f"Lobby {code} not found")
            raise Exception(f"Lobby with code '{code}' not found")
        
        # Get current users list
        current_users = redis_json_client.json_get(lobby_key, '.users', [])
        
        # Check if user is already in the lobby
        if user_id not in current_users:
            # Add user to the users array
            redis_json_client.json_array_append(lobby_key, '.users', user_id)
            
            # Add user to WebSocket lobby tracking
            manager.add_user_to_lobby(user_id, code)
            
            # Get updated lobby data
            lobby_dict = redis_json_client.json_get(lobby_key)
            lobby_data = LobbyData.from_dict(lobby_dict)
            
            # Broadcast join event to all users in the lobby
            event = LobbyEvent(
                type="lobby",
                action="join",
                lobby_code=code,
                user_id=user_id,
                users=lobby_data.users
            )
            await _broadcast_lobby_event(event)
            
            logger.info(f"User {user_id} joined lobby {code}")
        else:
            logger.info(f"User {user_id} already in lobby {code}")
            # Still return the lobby data
            lobby_dict = redis_json_client.json_get(lobby_key)
            lobby_data = LobbyData.from_dict(lobby_dict)
        
        return lobby_data
        
    except Exception as e:
        logger.error(f"Error joining lobby {code}: {e}")
        if "not found" in str(e):
            raise e  # Re-raise user-friendly error
        raise Exception("Database error occurred while joining lobby")

async def leave_lobby(code: str, user_id: str) -> Optional[LobbyData]:
    """
    Remove a user from a lobby.
    
    Args:
        code: The lobby code
        user_id: The user ID to remove
        
    Returns:
        Updated LobbyData object if successful
        
    Raises:
        Exception: With user-friendly error message
    """
    try:
        lobby_key = _get_lobby_key(code)
        
        # Check if lobby exists
        if not redis_json_client.json_exists(lobby_key):
            logger.warning(f"Lobby {code} not found")
            raise Exception(f"Lobby {code} not found")
        
        # Get current users list
        current_users = redis_json_client.json_get(lobby_key, '.users', [])
        
        # Check if user is in the lobby
        if user_id not in current_users:
            logger.warning(f"User {user_id} not in lobby {code}")
            raise Exception(f"User is not in lobby {code}")
        
        # Find and remove the user from the array
        user_index = redis_json_client.json_array_index(lobby_key, '.users', user_id)
        if user_index >= 0:
            # Remove the user at the found index
            redis_json_client.json_array_pop(lobby_key, '.users', user_index)
        
        # Remove user from WebSocket lobby tracking
        manager.remove_user_from_lobby(user_id)
        
        # Get updated lobby data
        lobby_dict = redis_json_client.json_get(lobby_key)
        lobby_data = LobbyData.from_dict(lobby_dict)
        
        # Broadcast leave event to remaining users in the lobby
        event = LobbyEvent(
            type="lobby",
            action="leave",
            lobby_code=code,
            user_id=user_id,
            users=lobby_data.users
        )
        await _broadcast_lobby_event(event)
        
        logger.info(f"User {user_id} left lobby {code}")
        return lobby_data
        
    except Exception as e:
        logger.error(f"Error leaving lobby {code}: {e}")
        if "not found" in str(e) or "not in lobby" in str(e):
            raise e  # Re-raise user-friendly errors
        raise Exception("Database error occurred while leaving lobby")

async def close_lobby(code: str, host_id: str) -> bool:
    """
    Delete a lobby (host only).
    
    Args:
        code: The lobby code
        host_id: The user ID of the requester (must be host)
        
    Returns:
        True if successful, False if failed
        
    Raises:
        Exception: With user-friendly error message
    """
    try:
        lobby_key = _get_lobby_key(code)
        
        # Get lobby data to verify host and get users
        lobby_dict = redis_json_client.json_get(lobby_key)
        if lobby_dict is None:
            logger.warning(f"Lobby {code} not found")
            raise Exception(f"Lobby with code '{code}' not found")
        
        lobby_data = LobbyData.from_dict(lobby_dict)
        
        # Verify the requester is the host
        if lobby_data.host_user_id != host_id:
            logger.warning(f"User {host_id} tried to close lobby {code} but is not the host")
            raise Exception("Only the lobby host can close the lobby")
        
        # Get all users for the disband event
        users_to_notify = lobby_data.users.copy()
        
        # Remove all users from WebSocket lobby tracking
        for user_id in users_to_notify:
            manager.remove_user_from_lobby(user_id)
        
        # Broadcast disband event to all users in the lobby
        event = LobbyEvent(
            type="lobby",
            action="disband",
            lobby_code=code,
            user_id=host_id,
            users=[]  # Empty since lobby is disbanded
        )
        await _broadcast_lobby_event(event)
        
        # Remove lobby from Redis and codes set
        redis_json_client.json_del(lobby_key)
        _remove_code_from_set(code)
        
        logger.info(f"Lobby {code} closed by host {host_id}")
        return True
        
    except Exception as e:
        logger.error(f"Error closing lobby {code}: {e}")
        if "not found" in str(e) or "Only the lobby host" in str(e):
            raise e  # Re-raise user-friendly error
        raise Exception("Database error occurred while closing lobby")

def get_lobby_users(code: str) -> List[str]:
    """
    Get list of user IDs in a lobby.
    
    Args:
        code: The lobby code
        
    Returns:
        List of user IDs, empty list if lobby not found
    """
    try:
        lobby_key = _get_lobby_key(code)
        users = redis_json_client.json_get(lobby_key, '.users', [])
        return users
    except Exception as e:
        logger.error(f"Error getting lobby users for {code}: {e}")
        return []

def list_all_lobbies() -> List[LobbyData]:
    """
    Get all active lobbies (for admin/debugging purposes).
    
    Returns:
        List of LobbyData objects
    """
    try:
        # Get all lobby codes from the set
        codes = redis_json_client.client.smembers(LOBBY_CODE_SET)
        lobbies = []
        
        for code in codes:
            lobby_data = get_lobby(code)
            if lobby_data:
                lobbies.append(lobby_data)
            else:
                # Clean up orphaned code from set
                _remove_code_from_set(code)
        
        return lobbies
    except Exception as e:
        logger.error(f"Error listing all lobbies: {e}")
        return []

def get_lobby_count() -> int:
    """
    Get the total number of active lobbies.
    
    Returns:
        Number of active lobbies
    """
    try:
        return redis_json_client.client.scard(LOBBY_CODE_SET)
    except Exception as e:
        logger.error(f"Error getting lobby count: {e}")
        return 0

# ------------------------------------------------------------------ #
# Health Check Functions
# ------------------------------------------------------------------ #

def health_check() -> Dict[str, Any]:
    """
    Perform a health check on the Redis lobby system.
    
    Returns:
        Dictionary with health status information
    """
    try:
        # Test Redis connectivity
        redis_ping = redis_json_client.ping()
        
        # Test RedisJSON functionality
        test_key = "health_check_test"
        test_data = {"test": True, "timestamp": datetime.now(timezone.utc).isoformat()}
        
        # Test JSON set/get/delete
        json_set_success = redis_json_client.json_set(test_key, '.', test_data, expire_seconds=60)
        json_get_success = redis_json_client.json_get(test_key) == test_data
        json_del_success = redis_json_client.json_del(test_key)
        
        # Get lobby statistics
        total_lobbies = get_lobby_count()
        
        return {
            "status": "healthy" if all([redis_ping, json_set_success, json_get_success, json_del_success]) else "unhealthy",
            "redis_ping": redis_ping,
            "redis_json_operations": json_set_success and json_get_success and json_del_success,
            "total_lobbies": total_lobbies,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
