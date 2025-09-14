"""
Group Leaderboard API endpoints.
Provides group-specific leaderboard and ranking functionality using Redis ZSETs for efficient ranking.
Frontend should use these endpoints to access group leaderboards and rankings.

This router uses Redis ZSETs for O(log N) ranking operations instead of JSON sorting.
"""
import logging
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Dict, Any

from ..utils.redis_utils import RedisClient
from ..services.redis_leaderboard_service import RedisLeaderboardService
from ..services.username_resolution_service import get_username_resolution_service, UsernameResolutionService

# Configure logging
logger = logging.getLogger(__name__)

# Initialize router with updated prefix
router = APIRouter(prefix="/api/group-leaderboard", tags=["group-leaderboard"])

# Initialize Redis leaderboard service
leaderboard_service = RedisLeaderboardService()

@router.get("/top", response_model=List[Dict[str, Any]])
async def get_group_leaderboard_top(
    period: str = Query(default="daily", regex="^(daily|weekly|monthly|yearly)$"),
    limit: int = Query(default=10, ge=1, le=100),
    redis_client: RedisClient = Depends(lambda: RedisClient()),
    username_service: UsernameResolutionService = Depends(get_username_resolution_service)
):
    """
    Get top rankings for a group leaderboard period using Redis ZSETs for efficient ranking.
    
    This endpoint uses Redis ZSET operations for O(log N) performance instead of 
    loading and sorting JSON data in Python.
    """
    try:
        # Use Redis leaderboard service to get top users efficiently
        top_users = leaderboard_service.get_leaderboard(period, limit)
        
        if not top_users:
            return []
        
        # Get user information for all users in leaderboard using unified username resolution
        user_ids = [user_entry.user_id for user_entry in top_users]
        resolved_users = username_service.resolve_usernames(user_ids)
        
        # Return users with rank, user_id, display_name, score, and full stats
        result = []
        rank = 1
        for user_entry in top_users:
            resolved_user = resolved_users.get(user_entry.user_id)
            if resolved_user:  # Only include users that exist in Firestore
                result.append({
                    "rank": rank,
                    "user_id": user_entry.user_id,
                    "display_name": resolved_user.display_name,
                    "score": getattr(user_entry, f"{period}_pomo"),
                    "stats": {
                        "daily_pomo": user_entry.daily_pomo,
                        "weekly_pomo": user_entry.weekly_pomo, 
                        "monthly_pomo": user_entry.monthly_pomo,
                        "yearly_pomo": user_entry.yearly_pomo
                    }
                })
                rank += 1
            else:
                logger.warning(f"Excluding leaderboard entry for user {user_entry.user_id} - user not found in Firestore")
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting group leaderboard top: {e}")
        raise HTTPException(status_code=500, detail="Failed to get group leaderboard")

@router.get("/rank/{user_id}")
async def get_user_rank_in_group(
    user_id: str,
    period: str = Query(default="daily", regex="^(daily|weekly|monthly|yearly)$"),
    redis_client: RedisClient = Depends(lambda: RedisClient())
):
    """
    Get a specific user's rank in the group leaderboard using efficient Redis ZSET ranking.
    
    Uses Redis ZREVRANK for O(1) rank lookup instead of scanning entire JSON.
    """
    try:
        # Use Redis ZSET for efficient rank lookup
        leaderboard_key = leaderboard_service._get_leaderboard_key(period)
        rank = redis_client.client.zrevrank(leaderboard_key, user_id)
        
        if rank is None:
            # User not found in leaderboard
            return {
                "user_id": user_id,
                "rank": None,
                "score": 0,
                "total_users": redis_client.client.zcard(leaderboard_key),
                "period": period
            }
        
        # Get user's score from ZSET
        score = redis_client.client.zscore(leaderboard_key, user_id)
        total_users = redis_client.client.zcard(leaderboard_key)
        
        # Get full user stats from Redis leaderboard service
        user_stats = leaderboard_service.get_user_details(user_id)
        
        return {
            "user_id": user_id,
            "rank": rank + 1,  # ZREVRANK is 0-indexed, convert to 1-indexed
            "score": int(score) if score else 0,
            "total_users": total_users,
            "period": period,
            "stats": user_stats if user_stats else {
                "daily_pomo": 0,
                "weekly_pomo": 0,
                "monthly_pomo": 0, 
                "yearly_pomo": 0
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting user rank in group: {e}")
        raise HTTPException(status_code=500, detail="Failed to get user rank")

@router.get("/around/{user_id}")
async def get_group_leaderboard_around_user(
    user_id: str,
    period: str = Query(default="daily", regex="^(daily|weekly|monthly|yearly)$"),
    range_size: int = Query(default=5, ge=1, le=20),
    redis_client: RedisClient = Depends(lambda: RedisClient()),
    username_service: UsernameResolutionService = Depends(get_username_resolution_service)
):
    """
    Get leaderboard rankings around a specific user using efficient Redis ZSET range operations.
    
    Returns users ranked above and below the target user for context.
    Uses Redis ZREVRANGE for efficient range queries.
    """
    try:
        # Get user's rank first
        leaderboard_key = leaderboard_service._get_leaderboard_key(period)
        user_rank = redis_client.client.zrevrank(leaderboard_key, user_id)
        
        if user_rank is None:
            # User not in leaderboard, return top users instead
            top_users = leaderboard_service.get_leaderboard(period, range_size * 2)
            
            # Get user information for top users using unified username resolution
            user_ids = [user_entry.user_id for user_entry in top_users]
            resolved_users = username_service.resolve_usernames(user_ids)
            
            users_around = []
            rank = 1
            for user_entry in top_users:
                resolved_user = resolved_users.get(user_entry.user_id)
                if resolved_user:  # Only include users that exist in Firestore
                    users_around.append({
                        "rank": rank,
                        "user_id": user_entry.user_id,
                        "display_name": resolved_user.display_name,
                        "score": getattr(user_entry, f"{period}_pomo")
                    })
                    rank += 1
                else:
                    logger.warning(f"Excluding leaderboard entry for user {user_entry.user_id} - user not found in Firestore")
            
            return {
                "user_id": user_id,
                "user_rank": None,
                "period": period,
                "users_around": users_around
            }
        
        # Calculate range around user
        start_rank = max(0, user_rank - range_size)
        end_rank = min(redis_client.client.zcard(leaderboard_key) - 1, user_rank + range_size)
        
        # Get users in range using efficient ZSET operations
        users_in_range = redis_client.client.zrevrange(
            leaderboard_key, 
            start_rank, 
            end_rank, 
            withscores=True
        )
        
        # Get user information for all users in range using unified username resolution
        user_ids_in_range = [uid for uid, score in users_in_range]
        resolved_users = username_service.resolve_usernames(user_ids_in_range)
        
        # Format result with ranks, scores, and display names
        result_users = []
        rank_counter = start_rank + 1
        for uid, score in users_in_range:
            resolved_user = resolved_users.get(uid)
            if resolved_user:  # Only include users that exist in Firestore
                result_users.append({
                    "rank": rank_counter,
                    "user_id": uid,
                    "display_name": resolved_user.display_name,
                    "score": int(score),
                    "is_target": uid == user_id
                })
                rank_counter += 1
            else:
                logger.warning(f"Excluding leaderboard entry for user {uid} - user not found in Firestore")
        
        return {
            "user_id": user_id,
            "user_rank": user_rank + 1,  # Convert to 1-indexed
            "period": period,
            "range_start": start_rank + 1,
            "range_end": end_rank + 1,
            "users_around": result_users
        }
        
    except Exception as e:
        logger.error(f"Error getting leaderboard around user: {e}")
        raise HTTPException(status_code=500, detail="Failed to get leaderboard around user")

@router.get("/compare")
async def compare_group_members(
    user_ids: str = Query(..., description="Comma-separated list of user IDs to compare"),
    period: str = Query(default="daily", regex="^(daily|weekly|monthly|yearly)$"),
    redis_client: RedisClient = Depends(lambda: RedisClient()),
    username_service: UsernameResolutionService = Depends(get_username_resolution_service)
):
    """
    Compare multiple group members' rankings and scores using efficient Redis ZSET operations.
    
    Gets rank and score for each user without loading entire leaderboard.
    Uses Redis ZREVRANK and ZSCORE for O(1) per-user lookups.
    """
    try:
        # Parse user IDs
        user_id_list = [uid.strip() for uid in user_ids.split(",") if uid.strip()]
        if not user_id_list:
            raise HTTPException(status_code=400, detail="No valid user IDs provided")
        
        if len(user_id_list) > 20:
            raise HTTPException(status_code=400, detail="Maximum 20 users can be compared at once")
        
        # Get leaderboard key
        leaderboard_key = leaderboard_service._get_leaderboard_key(period)
        total_users = redis_client.client.zcard(leaderboard_key)
        
        # Get user information for all users using unified username resolution
        resolved_users = username_service.resolve_usernames(user_id_list)
        
        # Get rank and score for each user efficiently
        comparison_results = []
        for user_id in user_id_list:
            resolved_user = resolved_users.get(user_id)
            if resolved_user:  # Only include users that exist in Firestore
                rank = redis_client.client.zrevrank(leaderboard_key, user_id)
                score = redis_client.client.zscore(leaderboard_key, user_id)
                
                # Get full user stats
                user_stats = leaderboard_service.get_user_details(user_id)
                
                comparison_results.append({
                    "user_id": user_id,
                    "display_name": resolved_user.display_name,
                    "rank": rank + 1 if rank is not None else None,
                    "score": int(score) if score else 0,
                    "stats": user_stats if user_stats else {
                        "daily_pomo": 0,
                        "weekly_pomo": 0,
                        "monthly_pomo": 0,
                        "yearly_pomo": 0
                    }
                })
            else:
                logger.warning(f"Excluding user {user_id} from comparison - user not found in Firestore")
        
        # Sort by rank (None ranks go to end)
        comparison_results.sort(key=lambda x: x["rank"] if x["rank"] is not None else float('inf'))
        
        return {
            "period": period,
            "total_users": total_users,
            "compared_users": comparison_results,
            "comparison_count": len(comparison_results)  # Count of users actually found in Firestore
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error comparing group members: {e}")
        raise HTTPException(status_code=500, detail="Failed to compare group members")

@router.get("/stats")
async def get_group_leaderboard_stats(
    redis_client: RedisClient = Depends(lambda: RedisClient())
):
    """
    Get overall statistics about the group leaderboard across all periods.
    
    Shows total users, ZSET cardinalities, and basic metrics.
    """
    try:
        stats = {}
        periods = ["daily", "weekly", "monthly", "yearly"]
        
        for period in periods:
            leaderboard_key = leaderboard_service._get_leaderboard_key(period)
            cardinality = redis_client.client.zcard(leaderboard_key)
            
            if cardinality > 0:
                # Get top and bottom scores
                top_score = redis_client.client.zrevrange(leaderboard_key, 0, 0, withscores=True)
                bottom_score = redis_client.client.zrange(leaderboard_key, 0, 0, withscores=True)
                
                stats[period] = {
                    "total_users": cardinality,
                    "top_score": int(top_score[0][1]) if top_score else 0,
                    "bottom_score": int(bottom_score[0][1]) if bottom_score else 0,
                    "zset_key": leaderboard_key
                }
            else:
                stats[period] = {
                    "total_users": 0,
                    "top_score": 0,
                    "bottom_score": 0,
                    "zset_key": leaderboard_key
                }
        
        return {
            "leaderboard_stats": stats,
            "total_periods": len(periods)
        }
        
    except Exception as e:
        logger.error(f"Error getting group leaderboard stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get leaderboard stats")
