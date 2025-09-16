"""
Chat endpoints for lobby-based messaging using Redis Streams.
Handles sending and retrieving chat messages for lobbies.
"""
import logging
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List

from ..auth_utils import require_authentication
from ..services.chat_service import (
    add_chat_message,
    get_chat_messages,
    clear_chat_messages,
    get_chat_info as get_chat_stream_info,
    CHAT_MESSAGE_MAX_LENGTH
)
from ..websocket_manager import manager, ChatEvent

# Configure logging
logger = logging.getLogger(__name__)

# Create the router
router = APIRouter(
    prefix="/api/chat",
    tags=["chat"],
    responses={404: {"description": "Not found"}},
)

# ------------------------------------------------------------------ #
# Pydantic Models for Chat endpoints
# ------------------------------------------------------------------ #

class ChatMessageResponse(BaseModel):
    time_created: str
    user_id: str
    username: str
    content: str

class SendMessageRequest(BaseModel):
    lobby_code: str
    content: str

class SendMessageResponse(BaseModel):
    success: bool
    message: str
    chat_message: ChatMessageResponse = None

class GetMessagesResponse(BaseModel):
    success: bool
    messages: List[ChatMessageResponse]
    lobby_code: str

class ClearMessagesRequest(BaseModel):
    lobby_code: str

class ClearMessagesResponse(BaseModel):
    success: bool
    message: str

class ChatInfoResponse(BaseModel):
    success: bool
    lobby_code: str
    exists: bool
    message_count: int
    last_message_id: str = None
    ttl_seconds: int

# ------------------------------------------------------------------ #
# Chat Endpoints
# ------------------------------------------------------------------ #

@router.post("/send", response_model=SendMessageResponse)
async def send_message(request: Request, send_request: SendMessageRequest):
    """Send a chat message to a lobby."""
    try:
        # Require authentication and get user ID
        user_id = require_authentication(request)
        
        # Validate input
        if not send_request.lobby_code:
            raise HTTPException(status_code=400, detail="lobby_code is required")
        
        if not send_request.content or not send_request.content.strip():
            raise HTTPException(status_code=400, detail="message content is required")
        
        if len(send_request.content) > CHAT_MESSAGE_MAX_LENGTH:
            raise HTTPException(
                status_code=400, 
                detail=f"message content exceeds maximum length of {CHAT_MESSAGE_MAX_LENGTH} characters"
            )
        
        # Get username from request headers (set by frontend)
        username = request.headers.get("X-Username", "Unknown User")
        
        # Add message to chat
        chat_message = await add_chat_message(
            lobby_code=send_request.lobby_code,
            user_id=user_id,
            username=username,
            content=send_request.content.strip()
        )
        
        if not chat_message:
            raise HTTPException(status_code=500, detail="Failed to send message")
        
        # Broadcast the message to other users in the lobby
        await manager.broadcast_chat_event(ChatEvent(
            type="chat_message",
            action="new_message",
            lobby_code=send_request.lobby_code,
            user_id=user_id,
            username=username,
            message={
                "time_created": chat_message.time_created,
                "user_id": chat_message.user_id,
                "username": chat_message.username,
                "content": chat_message.content
            }
        ))
        
        logger.info(f"Chat message sent by user {user_id} to lobby {send_request.lobby_code}")
        
        return SendMessageResponse(
            success=True,
            message="Message sent successfully",
            chat_message=ChatMessageResponse(
                time_created=chat_message.time_created,
                user_id=chat_message.user_id,
                username=chat_message.username,
                content=chat_message.content
            )
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending chat message: {e}")
        raise HTTPException(status_code=500, detail="Failed to send message")


@router.get("/messages/{lobby_code}", response_model=GetMessagesResponse)
async def get_messages(request: Request, lobby_code: str, start_id: str = "-", count: int = 50):
    """Get chat messages for a lobby."""
    try:
        # Require authentication (user must be authenticated to read messages)
        require_authentication(request)
        
        # Validate input
        if not lobby_code:
            raise HTTPException(status_code=400, detail="lobby_code is required")
        
        if count <= 0 or count > 100:
            raise HTTPException(status_code=400, detail="count must be between 1 and 100")
        
        # Get messages from chat service
        messages = await get_chat_messages(
            lobby_code=lobby_code,
            start_id=start_id,
            count=count
        )
        
        # Convert to response format
        message_responses = [
            ChatMessageResponse(
                time_created=msg.time_created,
                user_id=msg.user_id,
                username=msg.username,
                content=msg.content
            )
            for msg in messages
        ]
        
        logger.debug(f"Retrieved {len(message_responses)} messages for lobby {lobby_code}")
        
        return GetMessagesResponse(
            success=True,
            messages=message_responses,
            lobby_code=lobby_code
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting chat messages for lobby {lobby_code}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve messages")


@router.delete("/clear", response_model=ClearMessagesResponse)
async def clear_messages(request: Request, clear_request: ClearMessagesRequest):
    """Clear all chat messages for a lobby. (For host/admin use)"""
    try:
        # Require authentication
        user_id = require_authentication(request)
        
        # Validate input
        if not clear_request.lobby_code:
            raise HTTPException(status_code=400, detail="lobby_code is required")
        
        # TODO: Add authorization check to ensure user is host of the lobby
        # For now, any authenticated user can clear messages
        
        # Clear messages
        success = await clear_chat_messages(clear_request.lobby_code)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to clear messages")
        
        # Get username from request headers
        username = request.headers.get("X-Username", "Unknown User")
        
        # Broadcast chat cleared event to all users in the lobby
        await manager.broadcast_chat_event(ChatEvent(
            type="chat_message",
            action="chat_cleared",
            lobby_code=clear_request.lobby_code,
            user_id=user_id,
            username=username
        ))
        
        logger.info(f"Chat messages cleared for lobby {clear_request.lobby_code} by user {user_id}")
        
        return ClearMessagesResponse(
            success=True,
            message="Chat messages cleared successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error clearing chat messages for lobby {clear_request.lobby_code}: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear messages")


@router.get("/info/{lobby_code}", response_model=ChatInfoResponse)
async def get_chat_info(request: Request, lobby_code: str):
    """Get information about a lobby's chat stream."""
    try:
        # Require authentication
        require_authentication(request)
        
        # Validate input
        if not lobby_code:
            raise HTTPException(status_code=400, detail="lobby_code is required")
        
        # Get chat info
        info = await get_chat_stream_info(lobby_code)
        
        return ChatInfoResponse(
            success=True,
            lobby_code=lobby_code,
            exists=info['exists'],
            message_count=info['length'],
            last_message_id=info['last_message_id'],
            ttl_seconds=info['ttl']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting chat info for lobby {lobby_code}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get chat info")