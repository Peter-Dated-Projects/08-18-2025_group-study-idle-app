"""
Redis-based lobby management endpoints.
Handles lobby creation, joining, and management functionality using Redis with RedisJSON.
"""
import logging
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from auth_utils import require_authentication
from lobby_service_redis import (
    create_lobby as redis_create_lobby, 
    get_lobby as redis_get_lobby, 
    join_lobby as redis_join_lobby, 
    leave_lobby as redis_leave_lobby, 
    close_lobby as redis_close_lobby,
    list_all_lobbies,
    get_lobby_count,
    health_check
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

class LobbyHealthResponse(BaseModel):
    status: str
    redis_ping: bool
    redis_json_operations: bool
    total_lobbies: int
    timestamp: str
    error: str = None

# ------------------------------------------------------------------ #
# Lobby endpoints
# ------------------------------------------------------------------ #

@router.post("/create", response_model=LobbyCreateResponse)
async def create_lobby(request: Request, create_request: LobbyCreateRequest):
    """Create a new lobby using Redis."""
    try:
        # Require authentication and get user ID
        user_id = require_authentication(request)
        
        # Validate that the user_id in request matches authenticated user
        if create_request.user_id != user_id:
            raise HTTPException(status_code=403, detail="User ID mismatch")
        
        # Create lobby in Redis
        try:
            lobby_data = await redis_create_lobby(user_id)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
        
        if not lobby_data:
            raise HTTPException(status_code=500, detail="Failed to create lobby")
        
        logger.info(f"Create lobby endpoint called by user: {user_id}")
        
        return LobbyCreateResponse(
            success=True,
            message="Lobby created successfully",
            code=lobby_data.code,
            host=lobby_data.host_user_id,
            users=lobby_data.users,
            createdAt=lobby_data.created_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating lobby: {e}")
        raise HTTPException(status_code=500, detail="Failed to create lobby")


@router.post("/join", response_model=LobbyJoinResponse)
async def join_lobby(request: Request, join_request: LobbyJoinRequest):
    """Join an existing lobby using Redis."""
    try:
        # Require authentication and get user ID
        user_id = require_authentication(request)
        
        # Validate that the user_id in request matches authenticated user
        if join_request.user_id != user_id:
            raise HTTPException(status_code=403, detail="User ID mismatch")
        
        if not join_request.lobby_id:
            raise HTTPException(status_code=400, detail="lobby_id is required")
        
        # Join lobby in Redis
        try:
            lobby_data = await redis_join_lobby(join_request.lobby_id, user_id)
        except Exception as e:
            raise HTTPException(status_code=404, detail=str(e))
        
        if not lobby_data:
            raise HTTPException(status_code=404, detail="Lobby not found")
        
        logger.info(f"Join lobby endpoint called by user: {user_id} for lobby_id: {join_request.lobby_id}")
        
        return LobbyJoinResponse(
            success=True,
            message=f"Successfully joined lobby {join_request.lobby_id}",
            code=lobby_data.code,
            host=lobby_data.host_user_id,
            users=lobby_data.users,
            createdAt=lobby_data.created_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error joining lobby: {e}")
        raise HTTPException(status_code=500, detail="Failed to join lobby")


@router.post("/leave", response_model=LobbyLeaveResponse)
async def leave_lobby(request: Request, leave_request: LobbyLeaveRequest):
    """Leave an existing lobby using Redis."""
    try:
        # Require authentication and get user ID
        user_id = require_authentication(request)
        
        # Validate that the user_id in request matches authenticated user
        if leave_request.user_id != user_id:
            raise HTTPException(status_code=403, detail="User ID mismatch")
        
        if not leave_request.lobby_id:
            raise HTTPException(status_code=400, detail="lobby_id is required")
        
        # Leave lobby in Redis
        try:
            lobby_data = await redis_leave_lobby(leave_request.lobby_id, user_id)
        except Exception as e:
            # Check if it's a not found error vs other errors
            if "not found" in str(e).lower():
                raise HTTPException(status_code=404, detail=str(e))
            elif "not in lobby" in str(e).lower():
                raise HTTPException(status_code=400, detail=str(e))
            else:
                raise HTTPException(status_code=500, detail=str(e))
        
        if not lobby_data:
            raise HTTPException(status_code=404, detail="Lobby not found")
        
        logger.info(f"Leave lobby endpoint called by user: {user_id} for lobby_id: {leave_request.lobby_id}")
        
        return LobbyLeaveResponse(
            success=True,
            message=f"Successfully left lobby {leave_request.lobby_id}",
            code=lobby_data.code,
            users=lobby_data.users
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error leaving lobby: {e}")
        raise HTTPException(status_code=500, detail="Failed to leave lobby")


@router.post("/end", response_model=LobbyCloseResponse)
async def close_lobby(request: Request, close_request: LobbyCloseRequest):
    """Close an existing lobby (host only) using Redis."""

    try:
        # Require authentication and get user ID
        user_id = require_authentication(request)
        
        # Validate that the user_id in request matches authenticated user
        if close_request.user_id != user_id:
            raise HTTPException(status_code=403, detail="User ID mismatch")
        
        # Close lobby in Redis
        try:
            success = await redis_close_lobby(close_request.code, user_id)
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
        raise 
    except Exception as e:
        logger.error(f"Error closing lobby: {e}")
        raise HTTPException(status_code=500, detail="Failed to close lobby")


# ------------------------------------------------------------------ #
# Additional Redis-based lobby endpoints
# ------------------------------------------------------------------ #

@router.get("/status/{lobby_id}")
async def get_lobby_status(request: Request, lobby_id: str):
    """Get current status of a lobby using Redis."""
    try:
        user_id = require_authentication(request)
        
        # Get lobby from Redis
        lobby_data = redis_get_lobby(lobby_id)
        
        if not lobby_data:
            raise HTTPException(status_code=404, detail="Lobby not found")
        
        # Check if user is in the lobby
        is_member = user_id in lobby_data.users
        is_host = lobby_data.host_user_id == user_id
        
        logger.info(f"Lobby status requested by user: {user_id} for lobby: {lobby_id}")
        
        return {
            "success": True,
            "code": lobby_data.code,
            "host": lobby_data.host_user_id,
            "users": lobby_data.users,
            "createdAt": lobby_data.created_at,
            "status": lobby_data.status,
            "is_member": is_member,
            "is_host": is_host,
            "user_count": len(lobby_data.users)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting lobby status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get lobby status")


@router.get("/list")
async def list_user_lobbies(request: Request):
    """List lobbies the authenticated user is part of using Redis."""
    try:
        user_id = require_authentication(request)
        
        # Get all lobbies and filter by user membership
        all_lobbies = list_all_lobbies()
        user_lobbies = []
        
        for lobby_data in all_lobbies:
            if user_id in lobby_data.users:
                user_lobbies.append({
                    "code": lobby_data.code,
                    "host": lobby_data.host_user_id,
                    "users": lobby_data.users,
                    "createdAt": lobby_data.created_at,
                    "status": lobby_data.status,
                    "is_host": lobby_data.host_user_id == user_id,
                    "user_count": len(lobby_data.users)
                })
        
        logger.info(f"List lobbies requested by user: {user_id}, found {len(user_lobbies)} lobbies")
        
        return {
            "success": True,
            "lobbies": user_lobbies
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing lobbies: {e}")
        raise HTTPException(status_code=500, detail="Failed to list lobbies")


@router.get("/admin/all")
async def list_all_lobbies_admin(request: Request):
    """
    List all active lobbies (admin endpoint) using Redis.
    Note: This should be protected with proper admin authentication in production.
    """
    try:
        user_id = require_authentication(request)
        logger.info(f"Admin list all lobbies requested by user: {user_id}")
        
        # Get all lobbies from Redis
        all_lobbies = list_all_lobbies()
        
        lobbies_data = []
        for lobby_data in all_lobbies:
            lobbies_data.append({
                "code": lobby_data.code,
                "host": lobby_data.host_user_id,
                "users": lobby_data.users,
                "createdAt": lobby_data.created_at,
                "status": lobby_data.status,
                "user_count": len(lobby_data.users)
            })
        
        return {
            "success": True,
            "total_lobbies": len(lobbies_data),
            "lobbies": lobbies_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing all lobbies: {e}")
        raise HTTPException(status_code=500, detail="Failed to list all lobbies")


@router.get("/admin/stats")
async def get_lobby_stats(request: Request):
    """Get lobby system statistics using Redis."""
    try:
        user_id = require_authentication(request)
        logger.info(f"Admin lobby stats requested by user: {user_id}")
        
        total_lobbies = get_lobby_count()
        all_lobbies = list_all_lobbies()
        
        # Calculate statistics
        total_users = sum(len(lobby.users) for lobby in all_lobbies)
        average_users_per_lobby = total_users / total_lobbies if total_lobbies > 0 else 0
        
        # Count lobbies by status
        status_counts = {}
        for lobby in all_lobbies:
            status = lobby.status
            status_counts[status] = status_counts.get(status, 0) + 1
        
        return {
            "success": True,
            "total_lobbies": total_lobbies,
            "total_users": total_users,
            "average_users_per_lobby": round(average_users_per_lobby, 2),
            "status_distribution": status_counts
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting lobby stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get lobby stats")


@router.get("/health", response_model=LobbyHealthResponse)
async def lobby_system_health():
    """Check the health of the Redis-based lobby system."""
    try:
        health_data = health_check()
        
        return LobbyHealthResponse(**health_data)
        
    except Exception as e:
        logger.error(f"Error checking lobby system health: {e}")
        return LobbyHealthResponse(
            status="unhealthy",
            redis_ping=False,
            redis_json_operations=False,
            total_lobbies=0,
            timestamp="",
            error=str(e)
        )
