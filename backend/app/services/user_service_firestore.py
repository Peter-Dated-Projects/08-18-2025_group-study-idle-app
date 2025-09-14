"""
Service for fetching user information from Firestore.
"""
import logging
import os
from typing import Optional, Dict, Any
import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud.firestore_v1 import Client

logger = logging.getLogger(__name__)

class UserService:
    """
    Service for fetching user information from Firestore.
    """
    
    def __init__(self):
        self.db: Optional[Client] = None
        self._initialize_firestore()
    
    def _initialize_firestore(self):
        """Initialize Firestore client."""
        try:
            # Check if Firebase is already initialized
            if not firebase_admin._apps:
                # Initialize Firebase with default credentials or service account
                service_account_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
                
                if service_account_path and os.path.exists(service_account_path):
                    # Use service account credentials
                    cred = credentials.Certificate(service_account_path)
                    firebase_admin.initialize_app(cred)
                    logger.info("Firebase initialized with service account credentials")
                else:
                    # Use default credentials (works in GCP environments)
                    firebase_admin.initialize_app()
                    logger.info("Firebase initialized with default credentials")
            
            self.db = firestore.client()
            logger.info("Firestore client initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Firestore: {e}")
            self.db = None
    
    def get_user_info(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetch user information from Firestore.
        
        Args:
            user_id: The user ID to fetch information for
            
        Returns:
            Dictionary containing user information or None if not found
        """
        if not self.db:
            logger.error("Firestore client not initialized")
            return None
        
        try:
            # Try to get user document from 'users' collection
            user_ref = self.db.collection('users').document(user_id)
            user_doc = user_ref.get()
            
            if user_doc.exists:
                user_data = user_doc.to_dict()
                logger.debug(f"Found user data for {user_id}")
                return {
                    'user_id': user_id,
                    'display_name': user_data.get('displayName') or user_data.get('display_name'),
                    'email': user_data.get('email'),
                    'photo_url': user_data.get('photoURL') or user_data.get('photo_url'),
                    'created_at': user_data.get('createdAt') or user_data.get('created_at'),
                    'last_login': user_data.get('lastLogin') or user_data.get('last_login'),
                    'provider': user_data.get('provider', 'unknown')
                }
            else:
                logger.warning(f"User document not found for {user_id}")
                return None
                
        except Exception as e:
            logger.error(f"Error fetching user info for {user_id}: {e}")
            return None
    
    def get_users_info(self, user_ids: list[str]) -> Dict[str, Dict[str, Any]]:
        """
        Fetch user information for multiple users.
        
        Args:
            user_ids: List of user IDs to fetch information for
            
        Returns:
            Dictionary mapping user_id to user information
        """
        if not self.db:
            logger.error("Firestore client not initialized")
            return {}
        
        user_info_map = {}
        
        try:
            # Batch fetch user documents
            users_ref = self.db.collection('users')
            
            # Firestore batch get limit is 500, but we'll process in smaller chunks
            chunk_size = 100
            
            for i in range(0, len(user_ids), chunk_size):
                chunk = user_ids[i:i + chunk_size]
                
                # Create document references for this chunk
                doc_refs = [users_ref.document(user_id) for user_id in chunk]
                
                # Batch get documents
                docs = self.db.get_all(doc_refs)
                
                for doc in docs:
                    if doc.exists:
                        user_data = doc.to_dict()
                        user_id = doc.id
                        user_info_map[user_id] = {
                            'user_id': user_id,
                            'display_name': user_data.get('displayName') or user_data.get('display_name'),
                            'email': user_data.get('email'),
                            'photo_url': user_data.get('photoURL') or user_data.get('photo_url'),
                            'created_at': user_data.get('createdAt') or user_data.get('created_at'),
                            'last_login': user_data.get('lastLogin') or user_data.get('last_login'),
                            'provider': user_data.get('provider', 'unknown')
                        }
                    else:
                        # User not found in Firestore
                        user_id = doc.id
                        user_info_map[user_id] = {
                            'user_id': user_id,
                            'display_name': None,
                            'email': None,
                            'photo_url': None,
                            'created_at': None,
                            'last_login': None,
                            'provider': 'unknown'
                        }
        
        except Exception as e:
            logger.error(f"Error fetching users info: {e}")
            # For any user IDs that failed, create minimal entries
            for user_id in user_ids:
                if user_id not in user_info_map:
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
    
    def is_available(self) -> bool:
        """Check if Firestore service is available."""
        return self.db is not None

# Create a singleton instance of the service
user_service = UserService()

def get_user_service() -> UserService:
    """
    Dependency to get the UserService instance.
    """
    return user_service
