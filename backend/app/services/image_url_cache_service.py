"""
Image URL Cache Service for caching MinIO presigned URLs in Redis.
Reduces MinIO API calls and improves performance.
"""

import logging
from typing import Optional
from datetime import timedelta

try:
    from ..utils.redis_utils import RedisClient
except ImportError:
    from app.utils.redis_utils import RedisClient

logger = logging.getLogger(__name__)


class ImageURLCacheService:
    """
    Service for caching MinIO presigned URLs in Redis.
    
    Presigned URLs expire after 1 hour, so we cache them for 50 minutes
    to provide a 10-minute buffer for refresh before expiration.
    """
    
    def __init__(self):
        """Initialize the cache service with Redis client."""
        self.redis_client = RedisClient()
        self.cache_ttl = 3000  # 50 minutes in seconds (10 min buffer before 1-hour expiration)
        self.key_prefix = "profile_pic:url:"
        
        # Verify Redis connection
        if not self.redis_client.ping():
            logger.warning("Redis connection failed - URL caching will be disabled")
    
    def get_cached_url(self, image_id: str) -> Optional[str]:
        """
        Get a presigned URL from the cache.
        
        Args:
            image_id: The image ID to get the URL for
            
        Returns:
            The cached presigned URL, or None if not found or expired
        """
        if not image_id:
            return None
        
        try:
            key = f"{self.key_prefix}{image_id}"
            cached_url = self.redis_client.get_value(key)
            
            if cached_url:
                logger.debug(f"Cache HIT for image {image_id}")
                return cached_url
            
            logger.debug(f"Cache MISS for image {image_id}")
            return None
            
        except Exception as e:
            logger.error(f"Error getting cached URL for {image_id}: {e}")
            return None
    
    def cache_url(self, image_id: str, url: str) -> bool:
        """
        Cache a presigned URL in Redis.
        
        Args:
            image_id: The image ID to cache the URL for
            url: The presigned URL to cache
            
        Returns:
            True if caching was successful, False otherwise
        """
        if not image_id or not url:
            return False
        
        try:
            key = f"{self.key_prefix}{image_id}"
            success = self.redis_client.set_value(key, url, expire_seconds=self.cache_ttl)
            
            if success:
                logger.debug(f"Cached URL for image {image_id} (TTL: {self.cache_ttl}s)")
            else:
                logger.warning(f"Failed to cache URL for image {image_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error caching URL for {image_id}: {e}")
            return False
    
    def invalidate_url(self, image_id: str) -> bool:
        """
        Invalidate (delete) a cached URL.
        
        Args:
            image_id: The image ID to invalidate the cache for
            
        Returns:
            True if invalidation was successful, False otherwise
        """
        if not image_id:
            return False
        
        try:
            key = f"{self.key_prefix}{image_id}"
            success = self.redis_client.delete_key(key)
            
            if success:
                logger.debug(f"Invalidated cache for image {image_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error invalidating cache for {image_id}: {e}")
            return False
    
    def get_cache_stats(self) -> dict:
        """
        Get statistics about the cache.
        
        Returns:
            Dictionary with cache statistics
        """
        try:
            # Count keys with our prefix
            pattern = f"{self.key_prefix}*"
            keys = self.redis_client.client.keys(pattern)
            
            return {
                "total_cached_urls": len(keys),
                "cache_ttl_seconds": self.cache_ttl,
                "cache_ttl_minutes": self.cache_ttl // 60,
                "key_prefix": self.key_prefix,
            }
            
        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
            return {
                "error": str(e),
                "total_cached_urls": 0,
            }
    
    def clear_all_cache(self) -> int:
        """
        Clear all cached URLs.
        
        Returns:
            Number of keys deleted
        """
        try:
            pattern = f"{self.key_prefix}*"
            keys = self.redis_client.client.keys(pattern)
            
            if not keys:
                logger.info("No cached URLs to clear")
                return 0
            
            deleted = self.redis_client.client.delete(*keys)
            logger.info(f"Cleared {deleted} cached URLs")
            return deleted
            
        except Exception as e:
            logger.error(f"Error clearing cache: {e}")
            return 0


# Global service instance
image_url_cache_service = ImageURLCacheService()
