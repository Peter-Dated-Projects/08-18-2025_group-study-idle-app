"""
Redis Leaderboard API endpoints.
High-performance leaderboard operations using Redis cache as middleware.
Frontend should ONLY use these endpoints, never direct PostgreSQL access.
"""
import logging
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import List, Optional

from ..services.redis_leaderboard_service import redis_leaderboard_service
from ..services.username_resolution_service import get_username_resolution_service, UsernameResolutionService

# Configure logging
logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter(prefix="/api/redis-leaderboard", tags=["redis-leaderboard"])

# ------------------------------------------------------------------ #
# Pydantic models for request/response
# ------------------------------------------------------------------ #

class PomoUpdateRequest(BaseModel):
    user_id: str
    count: int = 1  # Number of pomodoros to add (default 1)

class UserStatsResponse(BaseModel):
    user_id: str
    daily_pomo: int
    weekly_pomo: int
    monthly_pomo: int
    yearly_pomo: int
    updated_at: Optional[str] = None
    cached_at: str

class LeaderboardEntryResponse(BaseModel):
    user_id: str
    display_name: Optional[str] = None
    score: int
    rank: int
    daily_pomo: int = 0
    weekly_pomo: int = 0
    monthly_pomo: int = 0
    yearly_pomo: int = 0

class LeaderboardResponse(BaseModel):
    success: bool
    period: str
    total_entries: int
    entries: List[LeaderboardEntryResponse]
    cached: bool = True

class UserRankResponse(BaseModel):
    user_id: str
    period: str
    rank: Optional[int]
    score: int
    total_users: int

class PomoUpdateResponse(BaseModel):
    success: bool
    message: str
    user_stats: Optional[UserStatsResponse] = None

class CacheStatusResponse(BaseModel):
    redis_connected: bool
    cache_status: str
    total_cached_users: int

# ------------------------------------------------------------------ #
# Dependency functions
# ------------------------------------------------------------------ #

def check_redis_connection():
    """Dependency to check Redis connection."""
    if not redis_leaderboard_service.ping_redis():
        raise HTTPException(
            status_code=503, 
            detail="Redis cache service unavailable"
        )

# ------------------------------------------------------------------ #
# API endpoints
# ------------------------------------------------------------------ #

@router.post("/update", response_model=PomoUpdateResponse, dependencies=[Depends(check_redis_connection)])
async def update_pomodoro_count(request: PomoUpdateRequest):
    """
    Update pomodoro count for a user via Redis cache.
    This is the ONLY endpoint the frontend should use for updates.
    """
    try:
        # Update via Redis service (updates both PostgreSQL and cache)
        success = redis_leaderboard_service.update_user_score(
            request.user_id, 
            request.count
        )
        
        if not success:
            raise HTTPException(
                status_code=500, 
                detail="Failed to update pomodoro count"
            )
        
        # Get updated user stats
        user_details = redis_leaderboard_service.get_user_details(request.user_id)
        
        user_stats = UserStatsResponse(
            user_id=user_details["user_id"],
            daily_pomo=user_details["daily_pomo"],
            weekly_pomo=user_details["weekly_pomo"],
            monthly_pomo=user_details["monthly_pomo"],
            yearly_pomo=user_details["yearly_pomo"],
            updated_at=user_details.get("updated_at"),
            cached_at=user_details["cached_at"]
        )
        
        return PomoUpdateResponse(
            success=True,
            message=f"Added {request.count} pomodoro(s) for user {request.user_id}",
            user_stats=user_stats
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating pomodoro count: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/user/{user_id}", response_model=UserStatsResponse, dependencies=[Depends(check_redis_connection)])
async def get_user_stats(user_id: str):
    """
    Get user pomodoro statistics from Redis cache.
    Frontend should use this instead of PostgreSQL queries.
    """
    try:
        user_details = redis_leaderboard_service.get_user_details(user_id)
        
        if not user_details:
            raise HTTPException(status_code=404, detail="User not found")
        
        return UserStatsResponse(
            user_id=user_details["user_id"],
            daily_pomo=user_details["daily_pomo"],
            weekly_pomo=user_details["weekly_pomo"],
            monthly_pomo=user_details["monthly_pomo"],
            yearly_pomo=user_details["yearly_pomo"],
            updated_at=user_details.get("updated_at"),
            cached_at=user_details["cached_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user stats: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{period}", response_model=LeaderboardResponse, dependencies=[Depends(check_redis_connection)])
async def get_leaderboard(
    period: str, 
    limit: int = Query(default=10, ge=1, le=100, description="Number of entries to return (1-100)"),
    username_service: UsernameResolutionService = Depends(get_username_resolution_service)
):
    """
    Get leaderboard for specified period from Redis cache.
    This is the PRIMARY endpoint for frontend leaderboard queries.
    
    Args:
        period: "daily", "weekly", "monthly", or "yearly"
        limit: Maximum number of entries (1-100, default 10)
    """
    try:
        if period not in ["daily", "weekly", "monthly", "yearly"]:
            raise HTTPException(
                status_code=400, 
                detail="Invalid period. Must be: daily, weekly, monthly, or yearly"
            )
        
        # Get leaderboard from Redis cache
        entries = redis_leaderboard_service.get_leaderboard(period, limit)
        
        # Get user information for all entries using unified username resolution
        user_ids = [entry.user_id for entry in entries]
        resolved_users = username_service.resolve_usernames(user_ids)
        
        # Convert to response format with resolved user information
        response_entries = []
        for entry in entries:
            resolved_user = resolved_users.get(entry.user_id)
            if resolved_user:  # Only include entries for users that exist in Firestore
                response_entries.append(LeaderboardEntryResponse(
                    user_id=entry.user_id,
                    display_name=resolved_user.display_name,
                    score=entry.score,
                    rank=entry.rank,
                    daily_pomo=entry.daily_pomo,
                    weekly_pomo=entry.weekly_pomo,
                    monthly_pomo=entry.monthly_pomo,
                    yearly_pomo=entry.yearly_pomo
                ))
            else:
                logger.warning(f"Excluding leaderboard entry for user {entry.user_id} - user not found in Firestore")
        
        return LeaderboardResponse(
            success=True,
            period=period,
            total_entries=len(response_entries),
            entries=response_entries,
            cached=True
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting leaderboard: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/user/{user_id}/rank/{period}", response_model=UserRankResponse, dependencies=[Depends(check_redis_connection)])
async def get_user_rank(user_id: str, period: str):
    """
    Get user's rank in specified leaderboard period from Redis cache.
    """
    try:
        if period not in ["daily", "weekly", "monthly", "yearly"]:
            raise HTTPException(
                status_code=400,
                detail="Invalid period. Must be: daily, weekly, monthly, or yearly"
            )
        
        # Get user's rank
        rank = redis_leaderboard_service.get_user_rank(user_id, period)
        
        # Get user's score
        user_details = redis_leaderboard_service.get_user_details(user_id)
        score = user_details.get(f"{period}_pomo", 0) if user_details else 0
        
        # Get total number of users (approximate from leaderboard size)
        leaderboard_key = redis_leaderboard_service._get_leaderboard_key(period)
        total_users = redis_leaderboard_service.redis_client.client.zcard(leaderboard_key)
        
        return UserRankResponse(
            user_id=user_id,
            period=period,
            rank=rank,
            score=score,
            total_users=total_users
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user rank: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# ------------------------------------------------------------------ #
# Administrative endpoints
# ------------------------------------------------------------------ #

@router.post("/admin/sync", dependencies=[Depends(check_redis_connection)])
async def sync_cache_from_database():
    """
    Administrative endpoint to sync Redis cache from PostgreSQL.
    Use this to refresh cache data.
    """
    try:
        synced_count = redis_leaderboard_service.sync_all_users_to_cache()
        
        return {
            "success": True,
            "message": f"Synced {synced_count} users to Redis cache",
            "synced_users": synced_count
        }
        
    except Exception as e:
        logger.error(f"Error syncing cache: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/admin/reset/{period}", dependencies=[Depends(check_redis_connection)])
async def reset_period_leaderboard(period: str):
    """
    Administrative endpoint to reset leaderboard for specified period.
    Updates both PostgreSQL and Redis cache.
    """
    try:
        if period not in ["daily", "weekly", "monthly"]:
            raise HTTPException(
                status_code=400,
                detail="Invalid period. Can only reset: daily, weekly, monthly"
            )
        
        success = redis_leaderboard_service.reset_period_leaderboard(period)
        
        if not success:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to reset {period} leaderboard"
            )
        
        return {
            "success": True,
            "message": f"Reset {period} leaderboard successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resetting leaderboard: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/admin/cache", dependencies=[Depends(check_redis_connection)])
async def clear_cache():
    """
    Administrative endpoint to clear all Redis cache data.
    Use with caution - will force reload from PostgreSQL on next access.
    """
    try:
        success = redis_leaderboard_service.clear_cache()
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to clear cache")
        
        return {
            "success": True,
            "message": "Cleared all leaderboard cache data"
        }
        
    except Exception as e:
        logger.error(f"Error clearing cache: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/admin/status", response_model=CacheStatusResponse)
async def get_cache_status():
    """
    Administrative endpoint to check cache status and Redis connectivity.
    """
    try:
        redis_connected = redis_leaderboard_service.ping_redis()
        
        if not redis_connected:
            return CacheStatusResponse(
                redis_connected=False,
                cache_status="Redis unavailable",
                total_cached_users=0
            )
        
        # Count cached users
        user_pattern = redis_leaderboard_service.USER_DETAILS_KEY.format(user_id="*")
        user_keys = redis_leaderboard_service.redis_client.client.keys(user_pattern)
        total_cached_users = len(user_keys)
        
        return CacheStatusResponse(
            redis_connected=True,
            cache_status="Active",
            total_cached_users=total_cached_users
        )
        
    except Exception as e:
        logger.error(f"Error getting cache status: {e}")
        return CacheStatusResponse(
            redis_connected=False,
            cache_status=f"Error: {str(e)}",
            total_cached_users=0
        )
