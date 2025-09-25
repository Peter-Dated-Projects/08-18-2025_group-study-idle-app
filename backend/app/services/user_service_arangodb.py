"""
Service for fetching user information from ArangoDB with Redis caching.
"""
import logging
from typing import Optional, Dict, Any
from .user_cache_service import UserCacheService

logger = logging.getLogger(__name__)

# Import ArangoDB utilities for user data
try:
    from ..utils.arangodb_utils import get_db as get_arango_db, USERS_COLLECTION
    ARANGODB_AVAILABLE = True
except ImportError as e:
    logger.warning(f"ArangoDB utilities not available: {e}")
    ARANGODB_AVAILABLE = False
    get_arango_db = None
    USERS_COLLECTION = None

class UserService:
    """
    Service for fetching user information from ArangoDB only.
    """
    
    def __init__(self):
        self.cache_service = UserCacheService()
        self._initialize_arangodb()
    
    def _initialize_arangodb(self):
        """Initialize ArangoDB connection."""
        self.arango_db = None
        if ARANGODB_AVAILABLE:
            try:
                self.arango_db = get_arango_db()
                logger.info("ArangoDB connection initialized for user service")
            except Exception as e:
                logger.warning(f"Failed to initialize ArangoDB: {e}")
                self.arango_db = None
    
    def _get_user_data_from_arangodb(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetch user data from ArangoDB users collection.
        
        Args:
            user_id: The user ID to fetch data for
            
        Returns:
            Dictionary containing user data or None if not found
        """
        if not ARANGODB_AVAILABLE or not self.arango_db:
            logger.debug(f"ArangoDB not available for user lookup: {user_id}")
            return None
        
        try:
            users_collection = self.arango_db.collection(USERS_COLLECTION)
            if users_collection.has(user_id):
                user_doc = users_collection.get(user_id)
                logger.debug(f"Found user data in ArangoDB for {user_id}")
                
                # Extract user information from ArangoDB document
                user_info = {
                    'user_id': user_id,
                    'display_name': user_doc.get('display_name') or user_doc.get('given_name'),
                    'email': user_doc.get('email'),
                    'photo_url': user_doc.get('photo_url'),
                    'created_at': user_doc.get('created_at'),
                    'last_login': user_doc.get('last_login'),
                    'provider': user_doc.get('provider', 'arangodb'),
                    'user_picture_url': user_doc.get('user_picture_url')
                }
                
                return user_info
            else:
                logger.debug(f"User {user_id} not found in ArangoDB users collection")
                return None
        except Exception as e:
            logger.error(f"Error fetching user data from ArangoDB for {user_id}: {e}")
            return None
    
    def _get_multiple_user_data_from_arangodb(self, user_ids: list[str]) -> Dict[str, Optional[Dict[str, Any]]]:
        """
        Fetch user data from ArangoDB users collection for multiple users.
        
        Args:
            user_ids: List of user IDs to fetch data for
            
        Returns:
            Dictionary mapping user_id to user data (or None if not found)
        """
        result = {}
        
        if not ARANGODB_AVAILABLE or not self.arango_db:
            logger.debug("ArangoDB not available for batch user lookup")
            return {user_id: None for user_id in user_ids}
        
        try:
            users_collection = self.arango_db.collection(USERS_COLLECTION)
            
            for user_id in user_ids:
                try:
                    if users_collection.has(user_id):
                        user_doc = users_collection.get(user_id)
                        
                        # Extract user information from ArangoDB document
                        user_info = {
                            'user_id': user_id,
                            'display_name': user_doc.get('display_name') or user_doc.get('given_name'),
                            'email': user_doc.get('email'),
                            'photo_url': user_doc.get('photo_url'),
                            'created_at': user_doc.get('created_at'),
                            'last_login': user_doc.get('last_login'),
                            'provider': user_doc.get('provider', 'arangodb'),
                            'user_picture_url': user_doc.get('user_picture_url')
                        }
                        
                        result[user_id] = user_info
                    else:
                        result[user_id] = None
                except Exception as e:
                    logger.error(f"Error fetching user data for {user_id}: {e}")
                    result[user_id] = None
                    
        except Exception as e:
            logger.error(f"Error in batch user lookup: {e}")
            return {user_id: None for user_id in user_ids}
        
        return result

    def get_user_info(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetch user information with Redis caching.
        
        Args:
            user_id: The user ID to fetch information for
            
        Returns:
            Dictionary containing user information or None if not found
        """
        # First, try to get from Redis cache
        cached_user = self.cache_service.get_user_from_cache(user_id)
        if cached_user:
            logger.debug(f"User {user_id} found in Redis cache")
            # Remove cache metadata before returning
            user_data = {k: v for k, v in cached_user.items() if not k.startswith('_')}
            return user_data
        
        # Not in cache, fetch from ArangoDB
        logger.debug(f"User {user_id} not in cache, fetching from ArangoDB")
        
        user_info = self._get_user_data_from_arangodb(user_id)
        
        if user_info:
            # Cache the user info in Redis
            self.cache_service.cache_user_info(user_id, user_info)
            logger.debug(f"Cached user {user_id} in Redis")
            return user_info
        else:
            # User not found - create minimal entry with just user_picture_url
            minimal_info = {
                'user_id': user_id,
                'display_name': None,
                'email': None,
                'photo_url': None,
                'created_at': None,
                'last_login': None,
                'provider': 'unknown',
                'user_picture_url': None
            }
            
            # Cache "not found" for shorter time (5 minutes)
            self.cache_service.cache_user_info(user_id, minimal_info, expire_seconds=300)
            return minimal_info
                
    def get_users_info(self, user_ids: list[str]) -> Dict[str, Dict[str, Any]]:
        """
        Fetch user information for multiple users with Redis caching.
        
        Args:
            user_ids: List of user IDs to fetch information for
            
        Returns:
            Dictionary mapping user_id to user information
        """
        if not user_ids:
            return {}
        
        # First, try to get from Redis cache
        cached_users, missing_user_ids = self.cache_service.get_users_from_cache(user_ids)
        
        # Remove cache metadata from cached users
        user_info_map = {}
        for user_id, cached_data in cached_users.items():
            user_info_map[user_id] = {k: v for k, v in cached_data.items() if not k.startswith('_')}
        
        logger.debug(f"Cache hits: {len(cached_users)}, Cache misses: {len(missing_user_ids)}")
        
        # If all users were found in cache, return early
        if not missing_user_ids:
            return user_info_map
        
        # Fetch missing users from ArangoDB
        logger.debug("Fetching missing users from ArangoDB")
        
        # Get user data from ArangoDB for missing users
        arangodb_users = self._get_multiple_user_data_from_arangodb(missing_user_ids)
        
        # Process ArangoDB results
        for user_id in missing_user_ids:
            arangodb_data = arangodb_users.get(user_id)
            
            if arangodb_data:
                # User found in ArangoDB
                user_info_map[user_id] = arangodb_data
                
                # Cache the user info in Redis
                self.cache_service.cache_user_info(user_id, arangodb_data)
                logger.debug(f"Fetched and cached user {user_id} from ArangoDB")
                
            else:
                # User not found in ArangoDB
                minimal_info = {
                    'user_id': user_id,
                    'display_name': None,
                    'email': None,
                    'photo_url': None,
                    'created_at': None,
                    'last_login': None,
                    'provider': 'unknown',
                    'user_picture_url': None
                }
                
                user_info_map[user_id] = minimal_info
                
                # Cache "not found" for shorter time (5 minutes)
                self.cache_service.cache_user_info(user_id, minimal_info, expire_seconds=300)
                logger.debug(f"User {user_id} not found in ArangoDB, cached minimal entry")
        
        return user_info_map
    
    def is_available(self) -> bool:
        """Check if ArangoDB service is available."""
        return self.arango_db is not None and ARANGODB_AVAILABLE

# Create a singleton instance of the service
user_service = UserService()

def get_user_service() -> UserService:
    """
    Dependency to get the UserService instance.
    """
    return user_service