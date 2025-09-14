"""
Username Resolution Service API endpoints.
Provides monitoring and management endpoints for the centralized username resolution service.
"""
import logging
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any

from ..services.username_resolution_service import get_username_resolution_service, UsernameResolutionService

# Configure logging
logger = logging.getLogger(__name__)

# Create the router
router = APIRouter(
    prefix="/api/username-resolution",
    tags=["username-resolution"],
    responses={404: {"description": "Not found"}},
)

@router.get("/cache-stats")
async def get_cache_stats(
    username_service: UsernameResolutionService = Depends(get_username_resolution_service)
) -> Dict[str, Any]:
    """
    Get statistics about the username resolution cache.
    
    Returns information about cached users, fallback entries, cache TTL settings, etc.
    """
    try:
        stats = username_service.get_cache_stats()
        return {
            "success": True,
            "cache_stats": stats
        }
    except Exception as e:
        logger.error(f"Error getting cache stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get cache statistics")

@router.post("/invalidate-cache/{user_id}")
async def invalidate_user_cache(
    user_id: str,
    username_service: UsernameResolutionService = Depends(get_username_resolution_service)
) -> Dict[str, Any]:
    """
    Invalidate all cached data for a specific user.
    
    Useful when user data has changed and caches need to be refreshed.
    """
    try:
        username_service.invalidate_user_cache(user_id)
        return {
            "success": True,
            "message": f"Cache invalidated for user {user_id}"
        }
    except Exception as e:
        logger.error(f"Error invalidating cache for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to invalidate user cache")

@router.get("/resolve/{user_id}")
async def resolve_single_user(
    user_id: str,
    username_service: UsernameResolutionService = Depends(get_username_resolution_service)
) -> Dict[str, Any]:
    """
    Resolve a single user for testing/debugging purposes.
    
    Shows the full resolution process and result for a user.
    """
    try:
        resolved_user = username_service.resolve_username(user_id)
        if resolved_user is None:
            return {
                "success": True,
                "resolved_user": None,
                "message": f"User {user_id} not found in Firestore"
            }
        
        return {
            "success": True,
            "resolved_user": {
                "user_id": resolved_user.user_id,
                "display_name": resolved_user.display_name,
                "email": resolved_user.email,
                "photo_url": resolved_user.photo_url,
                "created_at": resolved_user.created_at,
                "last_login": resolved_user.last_login,
                "provider": resolved_user.provider
            }
        }
    except Exception as e:
        logger.error(f"Error resolving user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to resolve user")
