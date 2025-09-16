"""
Chat service for lobby-based messaging using Redis Streams.
Each lobby has its own Redis stream for temporary chat storage.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
import logging

from ..utils.redis_utils import redis_client

logger = logging.getLogger(__name__)

# Constants
CHAT_MESSAGE_MAX_LENGTH = 255
CHAT_STREAM_TTL_SECONDS = 24 * 60 * 60  # 24 hours
MAX_MESSAGES_PER_LOBBY = 100  # Limit messages per lobby to prevent memory issues


class ChatMessage:
    """Chat message data structure."""
    
    def __init__(self, time_created: str, user_id: str, username: str, content: str):
        self.time_created = time_created
        self.user_id = user_id
        self.username = username
        self.content = content[:CHAT_MESSAGE_MAX_LENGTH]  # Enforce max length
    
    def to_dict(self) -> Dict[str, str]:
        """Convert to dictionary for Redis storage."""
        return {
            'time_created': self.time_created,
            'user_id': self.user_id,
            'username': self.username,
            'content': self.content
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, str]) -> 'ChatMessage':
        """Create from dictionary retrieved from Redis."""
        return cls(
            time_created=data['time_created'],
            user_id=data['user_id'],
            username=data['username'],
            content=data['content']
        )


def _get_chat_stream_key(lobby_code: str) -> str:
    """Get the Redis stream key for a lobby's chat."""
    return f"chat:{lobby_code}"


async def add_chat_message(
    lobby_code: str, 
    user_id: str, 
    username: str, 
    content: str
) -> Optional[ChatMessage]:
    """
    Add a chat message to a lobby's stream.
    
    Args:
        lobby_code: The lobby code
        user_id: ID of the user sending the message
        username: Username of the sender
        content: Message content (will be truncated to max length)
    
    Returns:
        ChatMessage if successful, None if failed
    """
    try:
        # Validate input
        if not lobby_code or not user_id or not username or not content.strip():
            logger.warning("Invalid chat message parameters")
            return None
        
        # Create message
        message = ChatMessage(
            time_created=datetime.utcnow().isoformat() + "Z",
            user_id=user_id,
            username=username,
            content=content.strip()
        )
        
        stream_key = _get_chat_stream_key(lobby_code)
        
        # Add message to Redis stream
        message_id = redis_client.client.xadd(
            stream_key,
            message.to_dict(),
            maxlen=MAX_MESSAGES_PER_LOBBY,
            approximate=True  # Allow Redis to optimize trimming
        )
        
        # Set TTL for the stream (renewed with each message)
        redis_client.client.expire(stream_key, CHAT_STREAM_TTL_SECONDS)
        
        logger.info(f"Added chat message {message_id} to lobby {lobby_code}")
        return message
        
    except Exception as e:
        logger.error(f"Failed to add chat message to lobby {lobby_code}: {e}")
        return None


async def get_chat_messages(
    lobby_code: str, 
    start_id: str = "-",
    count: int = 50
) -> List[ChatMessage]:
    """
    Get chat messages from a lobby's stream.
    
    Args:
        lobby_code: The lobby code
        start_id: Stream ID to start from ("-" for beginning, "+" for end)
        count: Maximum number of messages to retrieve
    
    Returns:
        List of ChatMessage objects
    """
    try:
        stream_key = _get_chat_stream_key(lobby_code)
        
        # Check if stream exists
        if not redis_client.client.exists(stream_key):
            logger.debug(f"Chat stream does not exist for lobby {lobby_code}")
            return []
        
        # Get messages from stream
        messages = redis_client.client.xrange(
            stream_key,
            min=start_id,
            max="+",
            count=count
        )
        
        # Convert to ChatMessage objects
        chat_messages = []
        for message_id, fields in messages:
            try:
                chat_message = ChatMessage.from_dict(fields)
                chat_messages.append(chat_message)
            except Exception as e:
                logger.warning(f"Failed to parse chat message {message_id}: {e}")
                continue
        
        logger.debug(f"Retrieved {len(chat_messages)} messages from lobby {lobby_code}")
        return chat_messages
        
    except Exception as e:
        logger.error(f"Failed to get chat messages for lobby {lobby_code}: {e}")
        return []


async def clear_chat_messages(lobby_code: str) -> bool:
    """
    Clear all chat messages for a lobby by deleting the stream.
    
    Args:
        lobby_code: The lobby code
    
    Returns:
        True if successful, False otherwise
    """
    try:
        stream_key = _get_chat_stream_key(lobby_code)
        
        # Delete the entire stream
        deleted = redis_client.client.delete(stream_key)
        
        if deleted:
            logger.info(f"Cleared chat messages for lobby {lobby_code}")
        else:
            logger.debug(f"No chat messages to clear for lobby {lobby_code}")
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to clear chat messages for lobby {lobby_code}: {e}")
        return False


async def get_chat_info(lobby_code: str) -> Dict[str, Any]:
    """
    Get information about a lobby's chat stream.
    
    Args:
        lobby_code: The lobby code
    
    Returns:
        Dictionary with stream info (length, last_message_id, etc.)
    """
    try:
        stream_key = _get_chat_stream_key(lobby_code)
        
        # Check if stream exists
        if not redis_client.client.exists(stream_key):
            return {
                'exists': False,
                'length': 0,
                'last_message_id': None,
                'ttl': 0
            }
        
        # Get stream info
        info = redis_client.client.xinfo_stream(stream_key)
        ttl = redis_client.client.ttl(stream_key)
        
        return {
            'exists': True,
            'length': info['length'],
            'last_message_id': info.get('last-generated-id'),
            'ttl': ttl if ttl > 0 else 0
        }
        
    except Exception as e:
        logger.error(f"Failed to get chat info for lobby {lobby_code}: {e}")
        return {
            'exists': False,
            'length': 0,
            'last_message_id': None,
            'ttl': 0
        }