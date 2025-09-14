"""
Username Resolution Service
Centralized service for resolving usernames across all APIs (friends, groups, leaderboards).
Handles Firestore lookups, Redis caching, and ArangoDB storage updates.
Returns None for users that don't exist in Firestore instead of generating fallback names.
"""
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass

from .user_service_firestore import get_user_service, UserService
from ..utils.redis_utils import RedisClient

logger = logging.getLogger(__name__)

@dataclass
class ResolvedUser:
    """Data structure for a resolved user with all available information."""
    user_id: str
    display_name: str  # Always guaranteed to have a value (from Firestore)
    email: Optional[str] = None
    photo_url: Optional[str] = None
    created_at: Optional[str] = None
    last_login: Optional[str] = None
    provider: str = "unknown"

class UsernameResolutionService:
    """
    Centralized service for username resolution with integrated caching and storage updates.
    
    This service provides a unified interface for all APIs to resolve usernames with:
    - Firestore integration for authoritative data
    - Redis caching for performance
    - ArangoDB updates when needed
    - Intelligent fallback generation
    """
    
    def __init__(self):
        self.user_service: UserService = get_user_service()
        self.redis_client = RedisClient()
        
        # Cache settings
        self.USERNAME_CACHE_PREFIX = "username_resolved:"
        self.USERNAME_CACHE_TTL = 3600  # 1 hour for found users
        
    def resolve_username(self, user_id: str) -> Optional[ResolvedUser]:
        """
        Resolve a single username with full caching and Firestore verification.
        
        Args:
            user_id: The user ID to resolve
            
        Returns:
            ResolvedUser object if user exists in Firestore, None otherwise
        """
        # Step 1: Check our username-specific cache first
        cached_resolved = self._get_from_username_cache(user_id)
        if cached_resolved:
            logger.debug(f"Username cache hit for {user_id}")
            return cached_resolved
        
        # Step 2: Try to get from user service (handles Firestore + Redis)
        user_info = self.user_service.get_user_info(user_id)
        
        # Step 3: Process the result and create ResolvedUser (or None if user doesn't exist)
        resolved_user = self._create_resolved_user(user_id, user_info)
        
        if resolved_user:
            # Step 4: Cache the resolved result
            self._cache_resolved_user(resolved_user)
            
            # Step 5: Update ArangoDB if we have real user data
            self._update_arangodb_user_data(resolved_user)
            
            logger.debug(f"Resolved user {user_id}: {resolved_user.display_name}")
        else:
            logger.debug(f"User {user_id} not found in Firestore")
        
        return resolved_user
    
    def resolve_usernames(self, user_ids: List[str]) -> Dict[str, Optional[ResolvedUser]]:
        """
        Resolve multiple usernames efficiently with batch operations.
        
        Args:
            user_ids: List of user IDs to resolve
            
        Returns:
            Dictionary mapping user_id to ResolvedUser (or None if user doesn't exist)
        """
        if not user_ids:
            return {}
        
        resolved_users = {}
        uncached_user_ids = []
        
        # Step 1: Check username cache for all users
        for user_id in user_ids:
            cached_resolved = self._get_from_username_cache(user_id)
            if cached_resolved:
                resolved_users[user_id] = cached_resolved
            else:
                uncached_user_ids.append(user_id)
        
        logger.debug(f"Username cache hits: {len(resolved_users)}, misses: {len(uncached_user_ids)}")
        
        # Step 2: Batch fetch uncached users from user service
        if uncached_user_ids:
            user_info_map = self.user_service.get_users_info(uncached_user_ids)
            print(user_info_map)
            
            # Step 3: Process each user and create ResolvedUser objects (or None)
            for user_id in uncached_user_ids:
                user_info = user_info_map.get(user_id)
                resolved_user = self._create_resolved_user(user_id, user_info)
                resolved_users[user_id] = resolved_user

                # Only cache and update ArangoDB if user exists
                if resolved_user:
                    # Step 4: Cache the resolved result
                    self._cache_resolved_user(resolved_user)
                    
                    # Step 5: Update ArangoDB if we have real user data
                    self._update_arangodb_user_data(resolved_user)
        
        return resolved_users
    
    def invalidate_user_cache(self, user_id: str) -> None:
        """
        Invalidate all cached data for a user (useful when user data changes).
        
        Args:
            user_id: The user ID to invalidate
        """
        try:
            # Remove from username resolution cache
            username_cache_key = f"{self.USERNAME_CACHE_PREFIX}{user_id}"
            self.redis_client.client.delete(username_cache_key)
            
            # Remove from user service cache
            self.user_service.cache_service.invalidate_user_cache(user_id)
            
            logger.info(f"Invalidated all caches for user {user_id}")
        except Exception as e:
            logger.error(f"Error invalidating cache for user {user_id}: {e}")
    
    def _get_from_username_cache(self, user_id: str) -> Optional[ResolvedUser]:
        """Get resolved user from username-specific cache."""
        try:
            cache_key = f"{self.USERNAME_CACHE_PREFIX}{user_id}"
            cached_data = self.redis_client.get_value(cache_key)
            
            if cached_data:
                return ResolvedUser(**cached_data)
        except Exception as e:
            logger.debug(f"Error reading username cache for {user_id}: {e}")
        
        return None
    
    def _cache_resolved_user(self, resolved_user: ResolvedUser) -> None:
        """Cache the resolved user data."""
        try:
            cache_key = f"{self.USERNAME_CACHE_PREFIX}{resolved_user.user_id}"
            cache_data = {
                "user_id": resolved_user.user_id,
                "display_name": resolved_user.display_name,
                "email": resolved_user.email,
                "photo_url": resolved_user.photo_url,
                "created_at": resolved_user.created_at,
                "last_login": resolved_user.last_login,
                "provider": resolved_user.provider
            }
            
            # Use standard TTL for all real users
            self.redis_client.set_value(cache_key, cache_data, expire_seconds=self.USERNAME_CACHE_TTL)
            logger.debug(f"Cached resolved user {resolved_user.user_id} for {self.USERNAME_CACHE_TTL} seconds")
            
        except Exception as e:
            logger.error(f"Error caching resolved user {resolved_user.user_id}: {e}")
    
    def _create_resolved_user(self, user_id: str, user_info: Optional[Dict[str, Any]]) -> Optional[ResolvedUser]:
        """Create a ResolvedUser object only if user exists in Firestore with valid display_name."""
        # If no user info found, return None (user doesn't exist)
        if not user_info:
            logger.warning(f"No user info found for {user_id}")
            return None
        
        # If user info exists but missing display_name, force check Firestore directly
        display_name = user_info.get('display_name')
        if not display_name:
            logger.debug(f"User {user_id} has no display_name in cache, forcing Firestore check")
            # Force a direct Firestore check to bypass potentially stale cache
            fresh_user_info = self.user_service.get_user_info_force_firestore(user_id)
            
            if fresh_user_info and fresh_user_info.get('display_name'):
                # User exists in Firestore with display_name, use fresh data
                logger.debug(f"Force check found user {user_id} in Firestore with display_name")
                user_info = fresh_user_info
                display_name = fresh_user_info.get('display_name')
            else:
                # User truly doesn't exist in Firestore or has no display_name
                logger.warning(f"User {user_id} confirmed not found in Firestore after force check")
                return None
            
        # User exists in Firestore with valid display_name
        return ResolvedUser(
            user_id=user_id,
            display_name=display_name,
            email=user_info.get('email'),
            photo_url=user_info.get('photo_url'),
            created_at=user_info.get('created_at'),
            last_login=user_info.get('last_login'),
            provider=user_info.get('provider', 'unknown')
        )
    
    def _update_arangodb_user_data(self, resolved_user: ResolvedUser) -> None:
        """
        Update ArangoDB with user data if needed.
        This is a placeholder for future ArangoDB integration.
        """
        try:
            # TODO: Implement ArangoDB user data updates
            # This could update user nodes with latest display names, last seen, etc.
            logger.debug(f"ArangoDB update placeholder for user {resolved_user.user_id}")
            
            # Example of what this might do:
            # - Update user node in ArangoDB with latest display_name
            # - Update last_seen timestamp
            # - Sync any other relevant user metadata
            
        except Exception as e:
            logger.error(f"Error updating ArangoDB for user {resolved_user.user_id}: {e}")
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get statistics about the username resolution cache."""
        try:
            # Count keys in username cache (all are valid users now)
            cache_keys = self.redis_client.client.keys(f"{self.USERNAME_CACHE_PREFIX}*")
            
            return {
                "total_cached_users": len(cache_keys),
                "cache_prefix": self.USERNAME_CACHE_PREFIX,
                "cache_ttl": self.USERNAME_CACHE_TTL
            }
            
        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
            return {"error": str(e)}


# Create singleton instance
username_resolution_service = UsernameResolutionService()

def get_username_resolution_service() -> UsernameResolutionService:
    """
    Dependency function to get the UsernameResolutionService instance.
    """
    return username_resolution_service
