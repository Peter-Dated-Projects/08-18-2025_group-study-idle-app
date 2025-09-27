"""
Subscription service for checking user paid status with Redis caching and ArangoDB fallback.
Provides fast subscription status checks with automatic cache management.
"""
import logging
import json
from typing import Optional, Dict, Any
from datetime import datetime

# Redis utilities
from ..utils.redis_utils import redis_client, set_cache, get_cache, delete_cache

# ArangoDB utilities
try:
    from ..utils.arangodb_utils import get_db as get_arango_db, USERS_COLLECTION
    ARANGODB_AVAILABLE = True
except ImportError as e:
    logging.warning(f"ArangoDB utilities not available: {e}")
    ARANGODB_AVAILABLE = False
    get_arango_db = None
    USERS_COLLECTION = None

logger = logging.getLogger(__name__)

class SubscriptionService:
    """
    Service for checking user subscription status with Redis caching.
    """
    
    def __init__(self):
        self.cache_prefix = "subscription:"
        self.cache_ttl = 3600  # 1 hour cache TTL
        self._initialize_arangodb()
    
    def _initialize_arangodb(self):
        """Initialize ArangoDB connection."""
        self.arango_db = None
        if ARANGODB_AVAILABLE:
            try:
                self.arango_db = get_arango_db()
                logger.info("ArangoDB connection initialized for subscription service")
            except Exception as e:
                logger.warning(f"Failed to initialize ArangoDB: {e}")
                self.arango_db = None
    
    def _get_cache_key(self, user_id: str) -> str:
        """Generate Redis cache key for user subscription status."""
        return f"{self.cache_prefix}{user_id}"
    
    def _get_subscription_from_cache(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get user subscription status from Redis cache.
        
        Args:
            user_id: The user ID to check
            
        Returns:
            Dictionary with subscription data or None if not cached
        """
        try:
            cache_key = self._get_cache_key(user_id)
            cached_data = get_cache(cache_key)
            
            if cached_data:
                logger.debug(f"Subscription status found in cache for user {user_id}")
                # Handle both string and dict formats for compatibility
                if isinstance(cached_data, str):
                    return json.loads(cached_data)
                elif isinstance(cached_data, dict):
                    return cached_data
                else:
                    logger.warning(f"Unexpected cache data type for user {user_id}: {type(cached_data)}")
                    return None
            else:
                logger.debug(f"Subscription status not found in cache for user {user_id}")
                return None
                
        except Exception as e:
            logger.error(f"Error getting subscription from cache for user {user_id}: {e}")
            return None
    
    def _cache_subscription_status(self, user_id: str, subscription_data: Dict[str, Any]) -> bool:
        """
        Cache user subscription status in Redis.
        
        Args:
            user_id: The user ID
            subscription_data: The subscription data to cache
            
        Returns:
            bool: True if cached successfully, False otherwise
        """
        try:
            cache_key = self._get_cache_key(user_id)
            cache_value = json.dumps(subscription_data)
            
            success = set_cache(cache_key, cache_value, expire_seconds=self.cache_ttl)
            
            if success:
                logger.debug(f"Cached subscription status for user {user_id}")
            else:
                logger.warning(f"Failed to cache subscription status for user {user_id}")
                
            return success
            
        except Exception as e:
            logger.error(f"Error caching subscription status for user {user_id}: {e}")
            return False
    
    def _get_subscription_from_arangodb(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get user subscription status from ArangoDB.
        
        Args:
            user_id: The user ID to check
            
        Returns:
            Dictionary with subscription data or None if not found
        """
        if not ARANGODB_AVAILABLE or not self.arango_db:
            logger.debug(f"ArangoDB not available for subscription lookup: {user_id}")
            return None
        
        try:
            users_collection = self.arango_db.collection(USERS_COLLECTION)
            
            if users_collection.has(user_id):
                user_doc = users_collection.get(user_id)
                logger.debug(f"Found user in ArangoDB for subscription check: {user_id}")
                
                # Extract subscription information
                subscription_data = {
                    'user_id': user_id,
                    'is_paid': user_doc.get('is_paid', False),
                    'provider': user_doc.get('provider', 'unknown'),
                    'last_updated': user_doc.get('updated_at'),
                    'cached_at': datetime.utcnow().isoformat()
                }
                
                return subscription_data
            else:
                logger.debug(f"User {user_id} not found in ArangoDB")
                return None
                
        except Exception as e:
            logger.error(f"Error getting subscription from ArangoDB for user {user_id}: {e}")
            return None
    
    def get_user_subscription_status(self, user_id: str) -> Dict[str, Any]:
        """
        Get user subscription status with Redis caching and ArangoDB fallback.
        
        This is the main method that implements the caching strategy:
        1. Check Redis cache first
        2. If not in cache, get from ArangoDB
        3. Update Redis cache with the data
        4. Return the subscription status
        
        Args:
            user_id: The user ID to check subscription status for
            
        Returns:
            Dictionary containing subscription status and metadata
        """
        logger.info(f"Checking subscription status for user: {user_id}")
        
        # Step 1: Try to get from Redis cache
        cached_subscription = self._get_subscription_from_cache(user_id)
        if cached_subscription:
            logger.info(f"Subscription status retrieved from cache for user {user_id}")
            return {
                'success': True,
                'user_id': user_id,
                'is_paid': cached_subscription.get('is_paid', False),
                'provider': cached_subscription.get('provider', 'unknown'),
                'last_updated': cached_subscription.get('last_updated'),
                'source': 'cache',
                'cached_at': cached_subscription.get('cached_at')
            }
        
        # Step 2: Not in cache, get from ArangoDB
        logger.info(f"Subscription not in cache, fetching from ArangoDB for user {user_id}")
        arangodb_subscription = self._get_subscription_from_arangodb(user_id)
        
        if arangodb_subscription:
            # Step 3: Update Redis cache with the data
            self._cache_subscription_status(user_id, arangodb_subscription)
            
            logger.info(f"Subscription status retrieved from ArangoDB and cached for user {user_id}")
            return {
                'success': True,
                'user_id': user_id,
                'is_paid': arangodb_subscription.get('is_paid', False),
                'provider': arangodb_subscription.get('provider', 'unknown'),
                'last_updated': arangodb_subscription.get('last_updated'),
                'source': 'database',
                'cached_at': arangodb_subscription.get('cached_at')
            }
        else:
            # User not found in ArangoDB - cache negative result for shorter time
            negative_result = {
                'user_id': user_id,
                'is_paid': False,
                'provider': 'unknown',
                'last_updated': None,
                'cached_at': datetime.utcnow().isoformat()
            }
            
            # Cache negative result for shorter time (5 minutes)
            try:
                cache_key = self._get_cache_key(user_id)
                cache_value = json.dumps(negative_result)
                set_cache(cache_key, cache_value, expire_seconds=300)
            except Exception as e:
                logger.error(f"Error caching negative result for user {user_id}: {e}")
            
            logger.warning(f"User {user_id} not found in database, returning default subscription status")
            return {
                'success': False,
                'user_id': user_id,
                'is_paid': False,
                'provider': 'unknown',
                'last_updated': None,
                'source': 'default',
                'cached_at': negative_result['cached_at'],
                'error': 'User not found'
            }
    
    def invalidate_user_subscription_cache(self, user_id: str) -> bool:
        """
        Invalidate cached subscription status for a user.
        Useful when subscription status changes.
        
        Args:
            user_id: The user ID to invalidate cache for
            
        Returns:
            bool: True if cache was invalidated successfully
        """
        try:
            cache_key = self._get_cache_key(user_id)
            success = delete_cache(cache_key)
            
            if success:
                logger.info(f"Invalidated subscription cache for user {user_id}")
            else:
                logger.warning(f"Failed to invalidate subscription cache for user {user_id}")
                
            return success
            
        except Exception as e:
            logger.error(f"Error invalidating subscription cache for user {user_id}: {e}")
            return False
    
    def get_cache_statistics(self) -> Dict[str, Any]:
        """
        Get statistics about the subscription cache.
        
        Returns:
            Dictionary with cache statistics
        """
        try:
            # This is a simplified version - in production you might want more detailed stats
            stats = {
                'cache_prefix': self.cache_prefix,
                'cache_ttl_seconds': self.cache_ttl,
                'arangodb_available': ARANGODB_AVAILABLE and self.arango_db is not None,
                'redis_available': redis_client is not None
            }
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting cache statistics: {e}")
            return {'error': str(e)}
    
    def is_available(self) -> bool:
        """Check if the subscription service is available."""
        return (redis_client is not None) and (ARANGODB_AVAILABLE and self.arango_db is not None)

# Create a singleton instance of the service
subscription_service = SubscriptionService()

def get_subscription_service() -> SubscriptionService:
    """
    Dependency to get the SubscriptionService instance.
    """
    return subscription_service
