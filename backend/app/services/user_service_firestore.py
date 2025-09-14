"""
Service for fetching user information from Firestore with Redis caching.
"""
import json
import logging
import os
from typing import Optional, Dict, Any
import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud.firestore_v1 import Client
from .user_cache_service import UserCacheService

logger = logging.getLogger(__name__)

class UserService:
    """
    Service for fetching user information from Firestore.
    """
    
    def __init__(self):
        self.db: Optional[Client] = None
        self.cache_service = UserCacheService()
        self.user_sessions_collection = os.getenv('FIRESTORE_USER_SESSIONS', 'user_sessions')
        self._firestore_available = True  # Track if Firestore is available
        self._firestore_error_logged = False  # Prevent spam logging
        self._initialize_firestore()
    
    def _convert_datetime_to_string(self, value):
        """Convert Firestore datetime objects to ISO string format."""
        if hasattr(value, 'isoformat'):
            # This handles both datetime and DatetimeWithNanoseconds
            return value.isoformat()
        return value
    
    def _initialize_firestore(self):
        """Initialize Firestore client."""
        try:
            # Check if Firebase is already initialized
            if not firebase_admin._apps:
                # Get project ID and service account from environment
                project_id = os.getenv('FIREBASE_PROJECT_ID', 'group-study-idle-app')
                service_account_json = os.getenv('FIRESTORE_SERVICE_ACCOUNT_JSON')
                service_account_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
                
                if service_account_json:
                    # Use service account JSON from environment variable
                    import json
                    service_account_info = json.loads(service_account_json)
                    cred = credentials.Certificate(service_account_info)
                    firebase_admin.initialize_app(cred, {
                        'projectId': project_id
                    })
                    logger.info(f"Firebase initialized with service account JSON for project: {project_id}")
                elif service_account_path and os.path.exists(service_account_path):
                    # Use service account credentials file
                    cred = credentials.Certificate(service_account_path)
                    firebase_admin.initialize_app(cred, {
                        'projectId': project_id
                    })
                    logger.info(f"Firebase initialized with service account file for project: {project_id}")
                else:
                    # Use default credentials with explicit project ID
                    firebase_admin.initialize_app(options={
                        'projectId': project_id
                    })
                    logger.info(f"Firebase initialized with default credentials for project: {project_id}")
            
            # Initialize Firestore client
            database_name = os.getenv('FIRESTORE_DATABASE_NAME', '(default)')
            if database_name == '(default)':
                self.db = firestore.client()
            else:
                self.db = firestore.client(database_id=database_name)
            
            logger.info(f"Firestore client initialized successfully for database: {database_name}")
            
        except Exception as e:
            logger.error(f"Failed to initialize Firestore: {e}")
            self.db = None
            self._firestore_available = False
            self._firestore_error_logged = True
    
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
        
        # Not in cache, fetch from Firestore
        logger.debug(f"User {user_id} not in cache, fetching from Firestore")
        
        # Check if Firestore is available
        if not self._firestore_available:
            logger.debug(f"Firestore unavailable, returning fallback data for {user_id}")
            # Return fallback data structure
            fallback_info = {
                'user_id': user_id,
                'display_name': None,
                'email': None,
                'photo_url': None,
                'created_at': None,
                'last_login': None,
                'provider': 'unknown'
            }
            # Cache the fallback for a short time to avoid repeated calls
            self.cache_service.cache_user_info(user_id, fallback_info, expire_seconds=300)
            return fallback_info
        
        if not self.db:
            logger.debug("Firestore client not initialized, returning fallback data")
            return None
        
        try:
            # Get user session document from the correct collection
            user_ref = self.db.collection(self.user_sessions_collection).document(user_id)
            user_doc = user_ref.get()
            
            if user_doc.exists:
                user_session_data = user_doc.to_dict()
                logger.debug(f"Found user session data for {user_id} in Firestore")
                
                # Get userName from userAccountInformation structure
                user_account_info = user_session_data.get('userAccountInformation')
                if user_account_info and isinstance(user_account_info, dict):
                    display_name = user_account_info.get('userName')
                    email = user_account_info.get('email')
                    created_at = self._convert_datetime_to_string(user_account_info.get('created_at'))
                else:
                    display_name = None
                    email = None
                    created_at = None
                
                user_info = {
                    'user_id': user_id,
                    'display_name': display_name,
                    'email': email,
                    'photo_url': None,  # Not stored in this structure
                    'created_at': created_at,
                    'last_login': self._convert_datetime_to_string(user_session_data.get('updated_at')),
                    'provider': 'firebase'  # Since this is Firebase Auth
                }
                
                # Cache the user info in Redis
                self.cache_service.cache_user_info(user_id, user_info)
                logger.debug(f"Cached user {user_id} in Redis")
                
                return user_info
            else:
                logger.warning(f"User session document not found for {user_id}")
                
                # Cache a "not found" entry with minimal data to avoid repeated Firestore calls
                not_found_info = {
                    'user_id': user_id,
                    'display_name': None,
                    'email': None,
                    'photo_url': None,
                    'created_at': None,
                    'last_login': None,
                    'provider': 'unknown'
                }
                
                # Cache for a shorter time (5 minutes) since user might be created later
                self.cache_service.cache_user_info(user_id, not_found_info, expire_seconds=300)
                return not_found_info
                
        except Exception as e:
            # Check if this is a "database does not exist" error
            error_str = str(e)
            if "database (default) does not exist" in error_str or "does not exist for project" in error_str:
                # Mark Firestore as unavailable to prevent future spam
                self._firestore_available = False
                if not self._firestore_error_logged:
                    logger.warning("Firestore database not configured for project. Falling back to cache-only mode.")
                    self._firestore_error_logged = True
                
                # Return fallback data
                fallback_info = {
                    'user_id': user_id,
                    'display_name': None,
                    'email': None,
                    'photo_url': None,
                    'created_at': None,
                    'last_login': None,
                    'provider': 'unknown'
                }
                # Cache the fallback for a short time
                self.cache_service.cache_user_info(user_id, fallback_info, expire_seconds=300)
                return fallback_info
            else:
                # Log other errors normally
                logger.error(f"Error fetching user info for {user_id}: {e}")
                return None
    
    def get_user_info_force_firestore(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Force a direct Firestore check bypassing all caches.
        Used when we need to verify if a user truly exists in Firestore.
        
        Args:
            user_id: The user ID to fetch information for
            
        Returns:
            Dictionary containing user information or None if not found
        """
        logger.debug(f"Force checking Firestore for user {user_id}")
        
        # Check if Firestore is available
        if not self._firestore_available:
            logger.debug(f"Firestore unavailable, cannot force check for {user_id}")
            return None

        if not self.db:
            logger.debug("Firestore client not initialized, cannot force check")
            return None

        try:
            # Get user session document from the correct collection
            user_ref = self.db.collection(self.user_sessions_collection).document(user_id)
            user_doc = user_ref.get()
            
            if user_doc.exists:
                user_session_data = user_doc.to_dict()
                logger.debug(f"Force check: Found user session data for {user_id} in Firestore")
                
                # Get userName from userAccountInformation structure
                user_account_info = user_session_data.get('userAccountInformation')
                if user_account_info and isinstance(user_account_info, dict):
                    display_name = user_account_info.get('userName')
                    email = user_account_info.get('email')
                    created_at = self._convert_datetime_to_string(user_account_info.get('created_at'))
                else:
                    display_name = None
                    email = None
                    created_at = None
                
                user_info = {
                    'user_id': user_id,
                    'display_name': display_name,
                    'email': email,
                    'photo_url': None,  # Not stored in this structure
                    'created_at': created_at,
                    'last_login': self._convert_datetime_to_string(user_session_data.get('updated_at')),
                    'provider': 'firebase'  # Since this is Firebase Auth
                }
                
                # Update cache with fresh data
                self.cache_service.cache_user_info(user_id, user_info)
                logger.debug(f"Force check: Updated cache for user {user_id}")
                
                return user_info
            else:
                logger.debug(f"Force check: User {user_id} does not exist in Firestore")
                return None
                
        except Exception as e:
            logger.error(f"Error in force Firestore check for user {user_id}: {e}")
            return None

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
        
        # Fetch missing users from Firestore
        if not self._firestore_available:
            logger.debug("Firestore unavailable, returning fallback data for missing users")
            # For missing users, create minimal entries
            for user_id in missing_user_ids:
                fallback_info = {
                    'user_id': user_id,
                    'display_name': None,
                    'email': None,
                    'photo_url': None,
                    'created_at': None,
                    'last_login': None,
                    'provider': 'unknown'
                }
                user_info_map[user_id] = fallback_info
                # Cache the fallback for a short time
                self.cache_service.cache_user_info(user_id, fallback_info, expire_seconds=300)
            return user_info_map
        
        if not self.db:
            logger.debug("Firestore client not initialized, returning fallback data")
            # For missing users, create minimal entries
            for user_id in missing_user_ids:
                user_info_map[user_id] = {
                    'user_id': user_id,
                    'display_name': None,
                    'email': None,
                    'photo_url': None,
                    'created_at': None,
                    'last_login': None,
                    'provider': 'unknown'
                }
            return user_info_map
        
        try:
            # Batch fetch user session documents
            users_ref = self.db.collection(self.user_sessions_collection)
            
            # Firestore batch get limit is 500, but we'll process in smaller chunks
            chunk_size = 100
            
            for i in range(0, len(missing_user_ids), chunk_size):
                chunk = missing_user_ids[i:i + chunk_size]
                
                # Create document references for this chunk
                doc_refs = [users_ref.document(user_id) for user_id in chunk]
                
                # Batch get documents
                docs = self.db.get_all(doc_refs)
                
                for doc in docs:
                    user_id = doc.id
                    
                    if doc.exists:
                        user_session_data = doc.to_dict()
                        
                        # Get userName from userAccountInformation structure
                        user_account_info = user_session_data.get('userAccountInformation')
                        if user_account_info and isinstance(user_account_info, dict):
                            display_name = user_account_info.get('userName')
                            email = user_account_info.get('email')
                            created_at = self._convert_datetime_to_string(user_account_info.get('created_at'))
                        else:
                            display_name = None
                            email = None
                            created_at = None
                        
                        user_info = {
                            'user_id': user_id,
                            'display_name': display_name,
                            'email': email,
                            'photo_url': None,  # Not stored in this structure
                            'created_at': created_at,
                            'last_login': self._convert_datetime_to_string(user_session_data.get('updated_at')),
                            'provider': 'firebase'  # Since this is Firebase Auth
                        }
                        
                        user_info_map[user_id] = user_info
                        
                        # Cache the user info in Redis
                        self.cache_service.cache_user_info(user_id, user_info)
                        logger.debug(f"Fetched and cached user {user_id} from Firestore")
                        
                    else:
                        # User not found in Firestore
                        not_found_info = {
                            'user_id': user_id,
                            'display_name': None,
                            'email': None,
                            'photo_url': None,
                            'created_at': None,
                            'last_login': None,
                            'provider': 'unknown'
                        }
                        
                        user_info_map[user_id] = not_found_info
                        
                        # Cache "not found" for shorter time (5 minutes)
                        self.cache_service.cache_user_info(user_id, not_found_info, expire_seconds=300)
                        logger.debug(f"User {user_id} not found in Firestore, cached not-found entry")
        
        except Exception as e:
            # Check if this is a "database does not exist" error
            error_str = str(e)
            if "database (default) does not exist" in error_str or "does not exist for project" in error_str:
                # Mark Firestore as unavailable to prevent future spam
                self._firestore_available = False
                if not self._firestore_error_logged:
                    logger.warning("Firestore database not configured for project. Falling back to cache-only mode.")
                    self._firestore_error_logged = True
            else:
                # Log other errors normally
                logger.error(f"Error fetching users info: {e}")
            
            # For any user IDs that failed, create minimal entries
            for user_id in missing_user_ids:
                if user_id not in user_info_map:
                    fallback_info = {
                        'user_id': user_id,
                        'display_name': None,
                        'email': None,
                        'photo_url': None,
                        'created_at': None,
                        'last_login': None,
                        'provider': 'unknown'
                    }
                    user_info_map[user_id] = fallback_info
                    # Cache the fallback for a short time
                    self.cache_service.cache_user_info(user_id, fallback_info, expire_seconds=300)
        
        return user_info_map
    
    def is_available(self) -> bool:
        """Check if Firestore service is available."""
        return self.db is not None and self._firestore_available

# Create a singleton instance of the service
user_service = UserService()

def get_user_service() -> UserService:
    """
    Dependency to get the UserService instance.
    """
    return user_service
