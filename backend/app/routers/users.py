"""
User information endpoints with Redis caching.
Handles retrieving user information with automatic cache management.
"""
import logging
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import List, Dict, Optional, Any

from ..services.user_service_firestore import get_user_service, UserService

# Configure logging
logger = logging.getLogger(__name__)

# Create the router
router = APIRouter(
    prefix="/api/users",
    tags=["users"],
    responses={404: {"description": "Not found"}},
)

# ------------------------------------------------------------------ #
# Pydantic Models for User endpoints
# ------------------------------------------------------------------ #

class UserInfo(BaseModel):
    user_id: str
    display_name: Optional[str] = None
    email: Optional[str] = None
    photo_url: Optional[str] = None
    created_at: Optional[str] = None
    last_login: Optional[str] = None
    provider: Optional[str] = None

class UsersRequest(BaseModel):
    user_ids: List[str]

class UsersInfoResponse(BaseModel):
    success: bool
    users: Dict[str, UserInfo]
    cache_stats: Optional[Dict[str, Any]] = None

class SingleUserResponse(BaseModel):
    success: bool
    user: Optional[UserInfo] = None

# ------------------------------------------------------------------ #
# User Information endpoints
# ------------------------------------------------------------------ #

@router.post("/info", response_model=UsersInfoResponse)
async def get_users_info(
    request: UsersRequest,
    background_tasks: BackgroundTasks,
    user_service: UserService = Depends(get_user_service)
):
    """
    Get user information for multiple users with Redis caching.
    User service now handles all caching internally.
    """
    try:
        if not request.user_ids:
            return UsersInfoResponse(success=True, users={})

        # Remove duplicates while preserving order
        unique_user_ids = list(dict.fromkeys(request.user_ids))
        
        # Get users info (user service handles caching internally)
        users_data = user_service.get_users_info(unique_user_ids)
        
        # Convert to UserInfo models
        users_info = {}
        for user_id, user_data in users_data.items():
            users_info[user_id] = UserInfo(**user_data)
        
        # Calculate cache stats for monitoring (approximate)
        cache_stats = {
            "total_requested": len(unique_user_ids),
            "cache_hits": "handled_internally",
            "cache_misses": "handled_internally", 
            "cache_hit_rate": "see_user_service_logs"
        }
        
        # Schedule cache cleanup in background
        background_tasks.add_task(user_service.cache_service.cleanup_expired_users)
        
        return UsersInfoResponse(
            success=True,
            users=users_info,
            cache_stats=cache_stats
        )
        
    except Exception as e:
        logger.error(f"Error in get_users_info endpoint: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
        
    except Exception as e:
        logger.error(f"Error getting users info: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/info/{user_id}", response_model=SingleUserResponse)
async def get_user_info(
    user_id: str,
    background_tasks: BackgroundTasks,
    user_service: UserService = Depends(get_user_service)
):
    """
    Get information for a single user with Redis caching.
    """
    try:
        # Use the user service (which handles caching internally)
        user_data = user_service.get_user_info(user_id)
        
        if user_data:
            user_info = UserInfo(**user_data)
            return SingleUserResponse(success=True, user=user_info)
        else:
            return SingleUserResponse(success=False, user=None)
            
    except Exception as e:
        logger.error(f"Error getting user info for {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/cache/cleanup")
async def cleanup_cache(
    background_tasks: BackgroundTasks,
    user_service: UserService = Depends(get_user_service)
):
    """
    Manually trigger cache cleanup for expired user data.
    This endpoint can be called periodically or manually for maintenance.
    """
    try:
        background_tasks.add_task(user_service.cache_service.cleanup_expired_users)
        return {"success": True, "message": "Cache cleanup initiated"}
    except Exception as e:
        logger.error(f"Error initiating cache cleanup: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/cache/stats")
async def get_cache_stats(
    user_service: UserService = Depends(get_user_service)
):
    """
    Get cache statistics and health information.
    """
    try:
        stats = user_service.cache_service.get_cache_stats()
        return {"success": True, "stats": stats}
    except Exception as e:
        logger.error(f"Error getting cache stats: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
