"""
Subscription API endpoints for checking user paid status.
Provides fast subscription status checks with Redis caching and ArangoDB fallback.
"""
import logging
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any

from ..auth_utils import require_authentication
from ..services.subscription_service import get_subscription_service, SubscriptionService

# Configure logging
logger = logging.getLogger(__name__)

# Create the router
router = APIRouter(
    prefix="/api/subscription",
    tags=["subscription"],
    responses={404: {"description": "Not found"}},
)

# ------------------------------------------------------------------ #
# Pydantic Models for Subscription endpoints
# ------------------------------------------------------------------ #

class SubscriptionStatusResponse(BaseModel):
    success: bool
    user_id: str
    is_paid: bool
    provider: Optional[str] = None
    last_updated: Optional[str] = None
    source: str  # 'cache', 'database', or 'default'
    cached_at: Optional[str] = None
    error: Optional[str] = None

class CacheInvalidationResponse(BaseModel):
    success: bool
    user_id: str
    message: str

class CacheStatsResponse(BaseModel):
    cache_prefix: str
    cache_ttl_seconds: int
    arangodb_available: bool
    redis_available: bool
    error: Optional[str] = None

# ------------------------------------------------------------------ #
# Subscription Status Endpoints
# ------------------------------------------------------------------ #

@router.get("/status/{user_id}", response_model=SubscriptionStatusResponse)
async def get_subscription_status(
    user_id: str,
    subscription_service: SubscriptionService = Depends(get_subscription_service)
):
    """
    Get user subscription status with Redis caching and ArangoDB fallback.
    
    This endpoint implements a two-tier caching strategy:
    1. First checks Redis cache for fast response
    2. If not cached, fetches from ArangoDB
    3. Updates Redis cache with the fresh data
    4. Returns subscription status
    
    Args:
        user_id: The user ID to check subscription status for
        
    Returns:
        SubscriptionStatusResponse with subscription details and cache metadata
    """
    try:
        logger.info(f"Subscription status request for user: {user_id}")
        
        # Check if service is available
        if not subscription_service.is_available():
            logger.error("Subscription service is not available")
            raise HTTPException(
                status_code=503,
                detail="Subscription service is temporarily unavailable"
            )
        
        # Get subscription status (with caching)
        result = subscription_service.get_user_subscription_status(user_id)
        
        logger.info(f"Subscription status retrieved for user {user_id}: is_paid={result.get('is_paid')}, source={result.get('source')}")
        
        return SubscriptionStatusResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting subscription status for user {user_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error while checking subscription status"
        )

@router.get("/status", response_model=SubscriptionStatusResponse)
async def get_authenticated_user_subscription_status(
    request: Request,
    subscription_service: SubscriptionService = Depends(get_subscription_service)
):
    """
    Get subscription status for the authenticated user.
    
    This endpoint automatically determines the user ID from the authentication cookie
    and returns their subscription status.
    
    Returns:
        SubscriptionStatusResponse with subscription details for the authenticated user
    """
    try:
        # Require authentication and get user ID from cookie
        user_id = require_authentication(request)
        
        logger.info(f"Authenticated subscription status request for user: {user_id}")
        
        # Check if service is available
        if not subscription_service.is_available():
            logger.error("Subscription service is not available")
            raise HTTPException(
                status_code=503,
                detail="Subscription service is temporarily unavailable"
            )
        
        # Get subscription status (with caching)
        result = subscription_service.get_user_subscription_status(user_id)
        
        logger.info(f"Authenticated subscription status retrieved for user {user_id}: is_paid={result.get('is_paid')}, source={result.get('source')}")
        
        return SubscriptionStatusResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting authenticated user subscription status: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error while checking subscription status"
        )

# ------------------------------------------------------------------ #
# Cache Management Endpoints
# ------------------------------------------------------------------ #

@router.delete("/cache/{user_id}", response_model=CacheInvalidationResponse)
async def invalidate_user_subscription_cache(
    user_id: str,
    subscription_service: SubscriptionService = Depends(get_subscription_service)
):
    """
    Invalidate cached subscription status for a specific user.
    
    This endpoint is useful when a user's subscription status changes
    and you need to force a fresh lookup from the database.
    
    Args:
        user_id: The user ID to invalidate cache for
        
    Returns:
        CacheInvalidationResponse with operation result
    """
    try:
        logger.info(f"Cache invalidation request for user: {user_id}")
        
        success = subscription_service.invalidate_user_subscription_cache(user_id)
        
        if success:
            message = f"Cache invalidated successfully for user {user_id}"
            logger.info(message)
        else:
            message = f"Failed to invalidate cache for user {user_id}"
            logger.warning(message)
        
        return CacheInvalidationResponse(
            success=success,
            user_id=user_id,
            message=message
        )
        
    except Exception as e:
        logger.error(f"Error invalidating cache for user {user_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error while invalidating cache"
        )

@router.delete("/cache", response_model=CacheInvalidationResponse)
async def invalidate_authenticated_user_subscription_cache(
    request: Request,
    subscription_service: SubscriptionService = Depends(get_subscription_service)
):
    """
    Invalidate cached subscription status for the authenticated user.
    
    Returns:
        CacheInvalidationResponse with operation result
    """
    try:
        # Require authentication and get user ID from cookie
        user_id = require_authentication(request)
        
        logger.info(f"Authenticated cache invalidation request for user: {user_id}")
        
        success = subscription_service.invalidate_user_subscription_cache(user_id)
        
        if success:
            message = f"Cache invalidated successfully for authenticated user {user_id}"
            logger.info(message)
        else:
            message = f"Failed to invalidate cache for authenticated user {user_id}"
            logger.warning(message)
        
        return CacheInvalidationResponse(
            success=success,
            user_id=user_id,
            message=message
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error invalidating cache for authenticated user: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error while invalidating cache"
        )

# ------------------------------------------------------------------ #
# Administrative Endpoints
# ------------------------------------------------------------------ #

@router.get("/admin/cache/stats", response_model=CacheStatsResponse)
async def get_subscription_cache_statistics(
    subscription_service: SubscriptionService = Depends(get_subscription_service)
):
    """
    Get statistics about the subscription cache system.
    
    Returns:
        CacheStatsResponse with cache configuration and availability status
    """
    try:
        logger.info("Cache statistics request")
        
        stats = subscription_service.get_cache_statistics()
        
        return CacheStatsResponse(**stats)
        
    except Exception as e:
        logger.error(f"Error getting cache statistics: {e}")
        return CacheStatsResponse(
            cache_prefix="unknown",
            cache_ttl_seconds=0,
            arangodb_available=False,
            redis_available=False,
            error=str(e)
        )

@router.get("/admin/health")
async def subscription_service_health_check(
    subscription_service: SubscriptionService = Depends(get_subscription_service)
):
    """
    Health check endpoint for the subscription service.
    
    Returns:
        Dictionary with service health status
    """
    try:
        is_available = subscription_service.is_available()
        stats = subscription_service.get_cache_statistics()
        
        return {
            "service": "subscription",
            "status": "healthy" if is_available else "degraded",
            "available": is_available,
            "redis_available": stats.get("redis_available", False),
            "arangodb_available": stats.get("arangodb_available", False),
            "cache_ttl_seconds": stats.get("cache_ttl_seconds", 0)
        }
        
    except Exception as e:
        logger.error(f"Error in subscription service health check: {e}")
        return {
            "service": "subscription",
            "status": "unhealthy",
            "available": False,
            "error": str(e)
        }
