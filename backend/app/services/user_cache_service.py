"""
User cache service using Redis for caching user information.
Handles automatic cache expiration and cleanup.
"""
import logging
import time
from typing import Optional, Dict, Any, List, Tuple
from ..utils.redis_utils import RedisClient

logger = logging.getLogger(__name__)

class UserCacheService:
    """
    Service for caching user information in Redis with automatic expiration.
    """
    
    def __init__(self):
        self.redis_client = RedisClient()
        self.cache_ttl = 3600  # 1 hour default TTL
        self.access_ttl = 3600  # 1 hour for access tracking
        self.user_prefix = "user_info:"
        self.access_prefix = "user_access:"
        
    def _get_user_cache_key(self, user_id: str) -> str:
        """Get Redis key for user cache."""
        return f"{self.user_prefix}{user_id}"
    
    def _get_access_key(self, user_id: str) -> str:
        """Get Redis key for user access time tracking."""
        return f"{self.access_prefix}{user_id}"
    
    def cache_user_info(self, user_id: str, user_data: Dict[str, Any], expire_seconds: Optional[int] = None) -> bool:
        """
        Cache user information in Redis.
        
        Args:
            user_id: The user ID
            user_data: User information dictionary
            expire_seconds: Custom expiration time (defaults to self.cache_ttl)
        
        Returns:
            True if caching succeeded, False otherwise
        """
        try:
            cache_key = self._get_user_cache_key(user_id)
            access_key = self._get_access_key(user_id)
            current_time = int(time.time())
            
            # Add cache metadata
            cache_data = {
                **user_data,
                '_cached_at': current_time,
                '_last_accessed': current_time
            }
            
            ttl = expire_seconds or self.cache_ttl
            
            # Cache user data
            success = self.redis_client.set_value(cache_key, cache_data, expire_seconds=ttl)
            
            # Track access time separately for cleanup purposes
            if success:
                self.redis_client.set_value(access_key, current_time, expire_seconds=self.access_ttl)
            
            logger.debug(f"Cached user info for {user_id} with TTL {ttl}s")
            return success
            
        except Exception as e:
            logger.error(f"Error caching user info for {user_id}: {e}")
            return False
    
    def get_user_from_cache(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get user information from Redis cache.
        
        Args:
            user_id: The user ID
            
        Returns:
            User information dictionary or None if not found/expired
        """
        try:
            cache_key = self._get_user_cache_key(user_id)
            user_data = self.redis_client.get_value(cache_key)
            
            if user_data:
                # Update last accessed time
                current_time = int(time.time())
                user_data['_last_accessed'] = current_time
                
                # Update the cached data with new access time
                self.redis_client.set_value(cache_key, user_data, expire_seconds=self.cache_ttl)
                
                # Update access tracking
                access_key = self._get_access_key(user_id)
                self.redis_client.set_value(access_key, current_time, expire_seconds=self.access_ttl)
                
                logger.debug(f"Cache hit for user {user_id}")
                return user_data
            else:
                logger.debug(f"Cache miss for user {user_id}")
                return None
                
        except Exception as e:
            logger.error(f"Error getting user from cache {user_id}: {e}")
            return None
    
    def get_users_from_cache(self, user_ids: List[str]) -> Tuple[Dict[str, Dict[str, Any]], List[str]]:
        """
        Get multiple users from cache, returning cached data and missing user IDs.
        
        Args:
            user_ids: List of user IDs to fetch
            
        Returns:
            Tuple of (cached_users_dict, missing_user_ids_list)
        """
        cached_users = {}
        missing_user_ids = []
        
        for user_id in user_ids:
            user_data = self.get_user_from_cache(user_id)
            if user_data:
                # Remove cache metadata before returning
                clean_data = {k: v for k, v in user_data.items() if not k.startswith('_')}
                cached_users[user_id] = clean_data
            else:
                missing_user_ids.append(user_id)
        
        return cached_users, missing_user_ids
    
    def update_access_times(self, user_ids: List[str]) -> None:
        """
        Update access times for multiple users.
        
        Args:
            user_ids: List of user IDs to update access times for
        """
        try:
            current_time = int(time.time())
            
            for user_id in user_ids:
                cache_key = self._get_user_cache_key(user_id)
                access_key = self._get_access_key(user_id)
                
                # Update access time in cache if user exists
                if self.redis_client.exists(cache_key):
                    user_data = self.redis_client.get_value(cache_key)
                    if user_data:
                        user_data['_last_accessed'] = current_time
                        self.redis_client.set_value(cache_key, user_data, expire_seconds=self.cache_ttl)
                
                # Update access tracking
                self.redis_client.set_value(access_key, current_time, expire_seconds=self.access_ttl)
            
            logger.debug(f"Updated access times for {len(user_ids)} users")
            
        except Exception as e:
            logger.error(f"Error updating access times: {e}")
    
    def remove_user_from_cache(self, user_id: str) -> bool:
        """
        Remove user information from cache.
        
        Args:
            user_id: The user ID to remove
            
        Returns:
            True if removal succeeded, False otherwise
        """
        try:
            cache_key = self._get_user_cache_key(user_id)
            access_key = self._get_access_key(user_id)
            
            cache_deleted = self.redis_client.delete_key(cache_key)
            access_deleted = self.redis_client.delete_key(access_key)
            
            logger.debug(f"Removed user {user_id} from cache")
            return cache_deleted or access_deleted
            
        except Exception as e:
            logger.error(f"Error removing user from cache {user_id}: {e}")
            return False
    
    def cleanup_expired_users(self) -> Dict[str, int]:
        """
        Clean up users that haven't been accessed for more than 1 hour.
        This method scans for access keys and removes stale cache entries.
        
        Returns:
            Dictionary with cleanup statistics
        """
        try:
            current_time = int(time.time())
            cutoff_time = current_time - self.access_ttl
            
            # Get all access keys
            access_pattern = f"{self.access_prefix}*"
            access_keys = []
            
            # Use Redis SCAN to avoid blocking
            cursor = 0
            while True:
                cursor, keys = self.redis_client.client.scan(cursor, match=access_pattern, count=100)
                access_keys.extend(keys)
                if cursor == 0:
                    break
            
            expired_users = []
            active_users = 0
            
            for access_key in access_keys:
                try:
                    last_access = self.redis_client.get_value(access_key)
                    if last_access and isinstance(last_access, (int, float)):
                        if last_access < cutoff_time:
                            # Extract user_id from access key
                            user_id = access_key.replace(self.access_prefix, "")
                            expired_users.append(user_id)
                        else:
                            active_users += 1
                except Exception as e:
                    logger.warning(f"Error checking access key {access_key}: {e}")
            
            # Remove expired users
            removed_count = 0
            for user_id in expired_users:
                if self.remove_user_from_cache(user_id):
                    removed_count += 1
            
            stats = {
                'total_scanned': len(access_keys),
                'active_users': active_users,
                'expired_users': len(expired_users),
                'removed_count': removed_count,
                'cleanup_time': current_time
            }
            
            logger.info(f"Cache cleanup completed: {stats}")
            return stats
            
        except Exception as e:
            logger.error(f"Error during cache cleanup: {e}")
            return {'error': str(e)}
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics and health information.
        
        Returns:
            Dictionary with cache statistics
        """
        try:
            # Check Redis availability
            redis_available = self.redis_client.ping()
            
            if not redis_available:
                return {
                    'redis_available': False,
                    'error': 'Redis connection failed'
                }
            
            # Count cache entries
            user_pattern = f"{self.user_prefix}*"
            access_pattern = f"{self.access_prefix}*"
            
            user_keys = []
            access_keys = []
            
            # Scan for user cache keys
            cursor = 0
            while True:
                cursor, keys = self.redis_client.client.scan(cursor, match=user_pattern, count=100)
                user_keys.extend(keys)
                if cursor == 0:
                    break
            
            # Scan for access keys
            cursor = 0
            while True:
                cursor, keys = self.redis_client.client.scan(cursor, match=access_pattern, count=100)
                access_keys.extend(keys)
                if cursor == 0:
                    break
            
            current_time = int(time.time())
            
            stats = {
                'redis_available': True,
                'cached_users': len(user_keys),
                'access_tracked_users': len(access_keys),
                'cache_ttl': self.cache_ttl,
                'access_ttl': self.access_ttl,
                'current_time': current_time,
                'user_prefix': self.user_prefix,
                'access_prefix': self.access_prefix
            }
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
            return {'error': str(e)}

# Create a singleton instance of the service
user_cache_service = UserCacheService()

def get_user_cache_service() -> UserCacheService:
    """
    Dependency to get the UserCacheService instance.
    """
    return user_cache_service
