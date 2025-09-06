"""
Lobby management endpoints.
Handles lobby creation, joining, and management functionality.
"""
import logging
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from auth_utils import require_authentication

# Configure logging
logger = logging.getLogger(__name__)

# Create the router
router = APIRouter(
    prefix="/api/hosting",
    tags=["lobbies"],
    responses={404: {"description": "Not found"}},
)

# ------------------------------------------------------------------ #
# Pydantic Models for Lobby endpoints
# ------------------------------------------------------------------ #

class LobbyCreateRequest(BaseModel):
    user_id: str

class LobbyCreateResponse(BaseModel):
    success: bool
    message: str
    code: str  # Changed from lobby_id to code to match frontend
    host: str
    users: list = []
    createdAt: str
    
class LobbyJoinRequest(BaseModel):
    user_id: str
    lobby_id: str
    
class LobbyJoinResponse(BaseModel):
    success: bool
    message: str
    code: str  # Changed from lobby_id to code to match frontend
    host: str
    users: list = []
    createdAt: str

class LobbyCloseRequest(BaseModel):
    user_id: str
    code: str

class LobbyCloseResponse(BaseModel):
    success: bool
    message: str


# ------------------------------------------------------------------ #
# Lobby endpoints
# ------------------------------------------------------------------ #

@router.post("/create", response_model=LobbyCreateResponse)
async def create_lobby(request: Request, create_request: LobbyCreateRequest):
    """Create a new lobby."""
    try:
        # Require authentication and get user ID
        user_id = require_authentication(request)
        
        # Validate that the user_id in request matches authenticated user
        if create_request.user_id != user_id:
            raise HTTPException(status_code=403, detail="User ID mismatch")
        
        # TODO: Implement lobby creation logic with Redis
        # This should:
        # 1. Generate a unique lobby code
        # 2. Store lobby data in Redis with expiration
        # 3. Add the host user to the lobby
        # 4. Return lobby details
        
        logger.info(f"Create lobby endpoint called by user: {user_id}")
        
        # Placeholder implementation
        placeholder_lobby_code = f"LBY{user_id[:6].upper()}"
        
        return LobbyCreateResponse(
            success=True,
            message="Lobby created successfully",
            code=placeholder_lobby_code,
            host=user_id,
            users=[],
            createdAt="2025-09-05T00:00:00Z"  # Placeholder
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating lobby: {e}")
        raise HTTPException(status_code=500, detail="Failed to create lobby")


@router.post("/join", response_model=LobbyJoinResponse)
async def join_lobby(request: Request, join_request: LobbyJoinRequest):
    """Join an existing lobby."""
    try:
        # Require authentication and get user ID
        user_id = require_authentication(request)
        
        # Validate that the user_id in request matches authenticated user
        if join_request.user_id != user_id:
            raise HTTPException(status_code=403, detail="User ID mismatch")
        
        if not join_request.lobby_id:
            raise HTTPException(status_code=400, detail="lobby_id is required")
        
        # TODO: Implement lobby joining logic with Redis
        # This should:
        # 1. Check if lobby exists and is active
        # 2. Add user to the lobby
        # 3. Return updated lobby details
        # 4. Handle lobby capacity limits
        
        logger.info(f"Join lobby endpoint called by user: {user_id} for lobby_id: {join_request.lobby_id}")
        
        return LobbyJoinResponse(
            success=True,
            message=f"Successfully joined lobby {join_request.lobby_id}",
            code=join_request.lobby_id,  # Use the lobby_id as the code
            host="placeholder_host",  # This should come from actual lobby data
            users=[],  # This should come from actual lobby data
            createdAt="2025-09-05T00:00:00Z"  # This should come from actual lobby data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error joining lobby: {e}")
        raise HTTPException(status_code=500, detail="Failed to join lobby")


@router.post("/end", response_model=LobbyCloseResponse)
async def close_lobby(request: Request, close_request: LobbyCloseRequest):
    """Close an existing lobby (host only)."""

    try:
        # Require authentication and get user ID
        user_id = require_authentication(request)
        
        # Validate that the user_id in request matches authenticated user
        if close_request.user_id != user_id:
            raise HTTPException(status_code=403, detail="User ID mismatch")
        
        # TODO: Implement lobby closing logic
        # This should:
        # 1. Verify the user is the host of the lobby
        # 2. Remove lobby from Redis
        # 3. Notify other users (if real-time notifications are implemented)
        
        logger.info(f"Close lobby endpoint called by user: {user_id} for lobby: {close_request.code}")
        
        return LobbyCloseResponse(
            success=True,
            message=f"Lobby {close_request.code} closed successfully"
        )
        
    except HTTPException:
        print("HTTP exception occurred while closing lobby")
        raise 
    except Exception as e:
        logger.error(f"Error closing lobby: {e}")
        raise HTTPException(status_code=500, detail="Failed to close lobby")


# ------------------------------------------------------------------ #
# Additional lobby endpoints can be added here
# ------------------------------------------------------------------ #

@router.get("/status/{lobby_id}")
async def get_lobby_status(request: Request, lobby_id: str):
    """Get current status of a lobby."""
    try:
        user_id = require_authentication(request)
        
        # TODO: Implement lobby status retrieval
        # Return lobby info, user list, etc.
        
        logger.info(f"Lobby status requested by user: {user_id} for lobby: {lobby_id}")
        
        return {
            "success": True,
            "lobby_id": lobby_id,
            "status": "active",
            "users": [],
            "host": user_id,
            "created_at": "2025-09-05T12:00:00Z"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting lobby status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get lobby status")


@router.get("/list")
async def list_user_lobbies(request: Request):
    """List lobbies the authenticated user is part of."""
    try:
        user_id = require_authentication(request)
        
        # TODO: Implement user lobby listing
        # Return lobbies where user is host or member
        
        logger.info(f"List lobbies requested by user: {user_id}")
        
        return {
            "success": True,
            "lobbies": []
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing lobbies: {e}")
        raise HTTPException(status_code=500, detail="Failed to list lobbies")
