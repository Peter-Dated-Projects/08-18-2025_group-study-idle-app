"""
Lobby management endpoints.
Handles lobby creation, joining, and management functionality.
"""
import logging
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from auth_utils import require_authentication
from lobby_service import (
    create_lobby as db_create_lobby, 
    get_lobby as db_get_lobby, 
    join_lobby as db_join_lobby, 
    leave_lobby as db_leave_lobby, 
    close_lobby as db_close_lobby
)

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

class LobbyLeaveRequest(BaseModel):
    user_id: str
    lobby_id: str

class LobbyLeaveResponse(BaseModel):
    success: bool
    message: str
    code: str
    users: list = []


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
        
        # Create lobby in database
        try:
            lobby = await db_create_lobby(user_id)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
        
        if not lobby:
            raise HTTPException(status_code=500, detail="Failed to create lobby")
        
        logger.info(f"Create lobby endpoint called by user: {user_id}")
        
        return LobbyCreateResponse(
            success=True,
            message="Lobby created successfully",
            code=lobby.code,
            host=lobby.host_user_id,
            users=lobby.users,
            createdAt=lobby.created_at.isoformat()
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
        
        # Join lobby in database
        try:
            lobby = await db_join_lobby(join_request.lobby_id, user_id)
        except Exception as e:
            raise HTTPException(status_code=404, detail=str(e))
        
        if not lobby:
            raise HTTPException(status_code=404, detail="Lobby not found")
        
        logger.info(f"Join lobby endpoint called by user: {user_id} for lobby_id: {join_request.lobby_id}")
        
        return LobbyJoinResponse(
            success=True,
            message=f"Successfully joined lobby {join_request.lobby_id}",
            code=lobby.code,
            host=lobby.host_user_id,
            users=lobby.users,
            createdAt=lobby.created_at.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error joining lobby: {e}")
        raise HTTPException(status_code=500, detail="Failed to join lobby")


@router.post("/leave", response_model=LobbyLeaveResponse)
async def leave_lobby(request: Request, leave_request: LobbyLeaveRequest):
    """Leave an existing lobby."""
    try:
        # Require authentication and get user ID
        user_id = require_authentication(request)
        
        # Validate that the user_id in request matches authenticated user
        if leave_request.user_id != user_id:
            raise HTTPException(status_code=403, detail="User ID mismatch")
        
        if not leave_request.lobby_id:
            raise HTTPException(status_code=400, detail="lobby_id is required")
        
        # Leave lobby in database
        try:
            lobby = await db_leave_lobby(leave_request.lobby_id, user_id)
        except Exception as e:
            # Check if it's a not found error vs other errors
            if "not found" in str(e).lower():
                raise HTTPException(status_code=404, detail=str(e))
            elif "not in lobby" in str(e).lower():
                raise HTTPException(status_code=400, detail=str(e))
            else:
                raise HTTPException(status_code=500, detail=str(e))
        
        if not lobby:
            raise HTTPException(status_code=404, detail="Lobby not found")
        
        logger.info(f"Leave lobby endpoint called by user: {user_id} for lobby_id: {leave_request.lobby_id}")
        
        return LobbyLeaveResponse(
            success=True,
            message=f"Successfully left lobby {leave_request.lobby_id}",
            code=lobby.code,
            users=lobby.users
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error leaving lobby: {e}")
        raise HTTPException(status_code=500, detail="Failed to leave lobby")


@router.post("/end", response_model=LobbyCloseResponse)
async def close_lobby(request: Request, close_request: LobbyCloseRequest):
    """Close an existing lobby (host only)."""

    try:
        # Require authentication and get user ID
        user_id = require_authentication(request)
        
        # Validate that the user_id in request matches authenticated user
        if close_request.user_id != user_id:
            raise HTTPException(status_code=403, detail="User ID mismatch")
        
        # Close lobby in database
        try:
            success = await db_close_lobby(close_request.code, user_id)
        except Exception as e:
            # Check if it's a permission error vs not found error
            if "Only the lobby host" in str(e):
                raise HTTPException(status_code=403, detail=str(e))
            elif "not found" in str(e):
                raise HTTPException(status_code=404, detail=str(e))
            else:
                raise HTTPException(status_code=500, detail=str(e))
        
        if not success:
            raise HTTPException(status_code=404, detail="Lobby not found or permission denied")
        
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
        
        # Get lobby from database
        lobby = db_get_lobby(lobby_id)
        
        if not lobby:
            raise HTTPException(status_code=404, detail="Lobby not found")
        
        # Check if user is in the lobby
        is_member = user_id in lobby.users
        is_host = lobby.host_user_id == user_id
        
        logger.info(f"Lobby status requested by user: {user_id} for lobby: {lobby_id}")
        
        return {
            "success": True,
            "code": lobby.code,
            "host": lobby.host_user_id,
            "users": lobby.users,
            "createdAt": lobby.created_at.isoformat(),
            "is_member": is_member,
            "is_host": is_host,
            "user_count": len(lobby.users)
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
