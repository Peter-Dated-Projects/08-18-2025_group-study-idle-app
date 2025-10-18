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
                    "user_id": user_id,
                    "display_name": user_doc.get("display_name")
                    or user_doc.get("given_name"),
                    "email": user_doc.get("email"),
                    "photo_url": user_doc.get("photo_url"),
                    "created_at": user_doc.get("created_at"),
                    "last_login": user_doc.get("last_login"),
                    "provider": user_doc.get("provider", "arangodb"),
                    "user_picture_url": user_doc.get("user_picture_url"),
                    "is_paid": user_doc.get(
                        "is_paid", False
                    ),  # Default to False if not set
                    "finished-tutorial": user_doc.get(
                        "finished-tutorial", False
                    ),  # Default to False
                }

                return user_info
            else:
                logger.debug(f"User {user_id} not found in ArangoDB users collection")
                return None
        except Exception as e:
            logger.error(f"Error fetching user data from ArangoDB for {user_id}: {e}")
            return None

    def _get_multiple_user_data_from_arangodb(
        self, user_ids: list[str]
    ) -> Dict[str, Optional[Dict[str, Any]]]:
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
                            "user_id": user_id,
                            "display_name": user_doc.get("display_name")
                            or user_doc.get("given_name"),
                            "email": user_doc.get("email"),
                            "photo_url": user_doc.get("photo_url"),
                            "created_at": user_doc.get("created_at"),
                            "last_login": user_doc.get("last_login"),
                            "provider": user_doc.get("provider", "arangodb"),
                            "user_picture_url": user_doc.get("user_picture_url"),
                            "is_paid": user_doc.get(
                                "is_paid", False
                            ),  # Default to False if not set
                            "finished-tutorial": user_doc.get(
                                "finished-tutorial", False
                            ),  # Default to False
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
            user_data = {k: v for k, v in cached_user.items() if not k.startswith("_")}
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
            # User not found - create minimal entry with default values
            minimal_info = {
                "user_id": user_id,
                "display_name": None,
                "email": None,
                "photo_url": None,
                "created_at": None,
                "last_login": None,
                "provider": "unknown",
                "user_picture_url": None,
                "is_paid": False,  # Default to False for new users
                "finished-tutorial": False,  # Default to False for new users
            }

            # Cache "not found" for shorter time (5 minutes)
            self.cache_service.cache_user_info(
                user_id, minimal_info, expire_seconds=300
            )
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
        cached_users, missing_user_ids = self.cache_service.get_users_from_cache(
            user_ids
        )

        # Remove cache metadata from cached users
        user_info_map = {}
        for user_id, cached_data in cached_users.items():
            user_info_map[user_id] = {
                k: v for k, v in cached_data.items() if not k.startswith("_")
            }

        logger.debug(
            f"Cache hits: {len(cached_users)}, Cache misses: {len(missing_user_ids)}"
        )

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
                    "user_id": user_id,
                    "display_name": None,
                    "email": None,
                    "photo_url": None,
                    "created_at": None,
                    "last_login": None,
                    "provider": "unknown",
                    "user_picture_url": None,
                    "is_paid": False,  # Default to False for new users
                    "finished-tutorial": False,  # Default to False for new users
                }

                user_info_map[user_id] = minimal_info

                # Cache "not found" for shorter time (5 minutes)
                self.cache_service.cache_user_info(
                    user_id, minimal_info, expire_seconds=300
                )
                logger.debug(
                    f"User {user_id} not found in ArangoDB, cached minimal entry"
                )

        return user_info_map

    def update_user_picture_url(self, user_id: str, picture_url: Optional[str]) -> bool:
        """
        Update user's picture image_id in ArangoDB.

        Args:
            user_id: The user ID to update
            picture_url: The image_id (NOT a full URL) or None for default
                        Should be just the image_id like "abc-123-def", not a presigned URL

        Returns:
            bool: True if updated successfully, False otherwise
        """
        if not ARANGODB_AVAILABLE or not self.arango_db:
            logger.error(
                f"ArangoDB not available for updating user {user_id} picture URL"
            )
            return False

        try:
            users_collection = self.arango_db.collection(USERS_COLLECTION)

            if users_collection.has(user_id):
                # Update existing user using AQL for reliable updates
                user_doc = users_collection.get(user_id)
                logger.debug(
                    f"Retrieved user document type: {type(user_doc)}, content: {user_doc}"
                )

                # Ensure user_doc is a dictionary
                if isinstance(user_doc, dict):
                    # Use AQL query for reliable updates (avoids Python driver issues)
                    try:
                        aql_query = """
                        FOR user IN users
                        FILTER user._key == @user_id
                        UPDATE user WITH { user_picture_url: @picture_url, user_id: @user_id_field } IN users
                        RETURN NEW
                        """

                        result = self.arango_db.aql.execute(
                            aql_query,
                            bind_vars={
                                "user_id": user_id,
                                "picture_url": picture_url,
                                "user_id_field": user_id,
                            },
                        )

                        updated_docs = list(result)
                        if updated_docs:
                            logger.info(
                                f"Updated picture URL for existing user {user_id}: {picture_url}"
                            )
                        else:
                            logger.error(
                                f"AQL update returned no results for user {user_id}"
                            )
                            return False

                    except Exception as update_error:
                        logger.error(
                            f"Error during AQL update operation: {update_error}"
                        )
                        return False
                else:
                    # If user_doc is not a dict, create a new one
                    logger.warning(
                        f"User document is not a dict (type: {type(user_doc)}), creating new document"
                    )
                    new_user = {
                        "_key": user_id,
                        "user_id": user_id,
                        "user_picture_url": picture_url,
                        "display_name": None,
                        "email": None,
                        "photo_url": None,
                        "created_at": None,
                        "last_login": None,
                        "provider": "arangodb",
                        "is_paid": False,  # Default to False for new users
                    }
                    users_collection.replace(user_id, new_user)
                    logger.info(
                        f"Replaced user document with picture URL {user_id}: {picture_url}"
                    )
            else:
                # Create new user entry with picture URL
                new_user = {
                    "_key": user_id,
                    "user_id": user_id,
                    "user_picture_url": picture_url,
                    "display_name": None,
                    "email": None,
                    "photo_url": None,
                    "created_at": None,
                    "last_login": None,
                    "provider": "arangodb",
                    "is_paid": False,  # Default to False for new users
                }
                users_collection.insert(new_user, overwrite=False)
                logger.info(
                    f"Created new user entry with picture URL {user_id}: {picture_url}"
                )

            # Invalidate cache for this user
            self.cache_service.remove_user_from_cache(user_id)
            logger.debug(f"Invalidated cache for user {user_id}")

            return True

        except Exception as e:
            logger.error(f"Error updating picture URL for user {user_id}: {e}")
            return False

    def update_user_paid_status(self, user_id: str, is_paid: bool) -> bool:
        """
        Update user's paid status in ArangoDB.

        Args:
            user_id: The user ID to update
            is_paid: The new paid status (True for paid, False for free)

        Returns:
            bool: True if updated successfully, False otherwise
        """
        if not ARANGODB_AVAILABLE or not self.arango_db:
            logger.error(
                f"ArangoDB not available for updating user {user_id} paid status"
            )
            return False

        try:
            users_collection = self.arango_db.collection(USERS_COLLECTION)

            if users_collection.has(user_id):
                # Update existing user using AQL for reliable updates
                aql_query = """
                FOR user IN users
                FILTER user._key == @user_id
                UPDATE user WITH { 
                    is_paid: @is_paid, 
                    user_id: @user_id_field,
                    updated_at: @timestamp
                } IN users
                RETURN NEW
                """

                from datetime import datetime

                result = self.arango_db.aql.execute(
                    aql_query,
                    bind_vars={
                        "user_id": user_id,
                        "is_paid": is_paid,
                        "user_id_field": user_id,
                        "timestamp": datetime.utcnow().isoformat(),
                    },
                )

                updated_docs = list(result)
                if updated_docs:
                    logger.info(
                        f"Updated paid status for user {user_id}: is_paid={is_paid}"
                    )
                else:
                    logger.error(f"AQL update returned no results for user {user_id}")
                    return False

            else:
                # Create new user entry with paid status
                from datetime import datetime

                new_user = {
                    "_key": user_id,
                    "user_id": user_id,
                    "is_paid": is_paid,
                    "display_name": None,
                    "email": None,
                    "photo_url": None,
                    "user_picture_url": None,
                    "created_at": datetime.utcnow().isoformat(),
                    "last_login": None,
                    "provider": "arangodb",
                    "updated_at": datetime.utcnow().isoformat(),
                }
                users_collection.insert(new_user, overwrite=False)
                logger.info(
                    f"Created new user entry with paid status {user_id}: is_paid={is_paid}"
                )

            # Invalidate cache for this user
            self.cache_service.remove_user_from_cache(user_id)
            logger.debug(f"Invalidated cache for user {user_id}")

            return True

        except Exception as e:
            logger.error(f"Error updating paid status for user {user_id}: {e}")
            return False

    def update_user_field(
        self, user_id: str, field_name: str, field_value: Any
    ) -> bool:
        """
        Update a specific field in a user's ArangoDB document.

        Args:
            user_id: The user ID to update
            field_name: The name of the field to update (e.g., 'finished-tutorial')
            field_value: The new value for the field

        Returns:
            bool: True if updated successfully, False otherwise
        """
        if not ARANGODB_AVAILABLE or not self.arango_db:
            logger.error(
                f"ArangoDB not available for updating user {user_id} field {field_name}"
            )
            return False

        try:
            users_collection = self.arango_db.collection(USERS_COLLECTION)

            from datetime import datetime

            if users_collection.has(user_id):
                # Update existing user using AQL for reliable updates
                aql_query = """
                FOR user IN users
                FILTER user._key == @user_id
                UPDATE user WITH { 
                    @field_name: @field_value,
                    user_id: @user_id_field,
                    updated_at: @timestamp
                } IN users
                RETURN NEW
                """

                # Note: AQL doesn't support dynamic field names via bind_vars directly
                # We need to construct the update object dynamically
                update_obj = {
                    field_name: field_value,
                    "user_id": user_id,
                    "updated_at": datetime.utcnow().isoformat(),
                }

                # Use a simpler AQL approach
                aql_query_simple = f"""
                FOR user IN users
                FILTER user._key == @user_id
                UPDATE user WITH @update_obj IN users
                RETURN NEW
                """

                result = self.arango_db.aql.execute(
                    aql_query_simple,
                    bind_vars={"user_id": user_id, "update_obj": update_obj},
                )

                updated_docs = list(result)
                if updated_docs:
                    logger.info(
                        f"Updated {field_name} for user {user_id}: {field_value}"
                    )
                else:
                    logger.error(f"AQL update returned no results for user {user_id}")
                    return False

            else:
                # Create new user entry with the field
                new_user = {
                    "_key": user_id,
                    "user_id": user_id,
                    field_name: field_value,
                    "display_name": None,
                    "email": None,
                    "photo_url": None,
                    "user_picture_url": None,
                    "is_paid": False,
                    "created_at": datetime.utcnow().isoformat(),
                    "last_login": None,
                    "provider": "arangodb",
                    "updated_at": datetime.utcnow().isoformat(),
                }
                users_collection.insert(new_user, overwrite=False)
                logger.info(
                    f"Created new user entry with {field_name}={field_value} for user {user_id}"
                )

            # Invalidate cache for this user
            self.cache_service.remove_user_from_cache(user_id)
            logger.debug(f"Invalidated cache for user {user_id}")

            return True

        except Exception as e:
            logger.error(f"Error updating {field_name} for user {user_id}: {e}")
            return False

    def update_user_fields(self, user_id: str, fields: Dict[str, Any]) -> bool:
        """
        Update multiple fields in a user's ArangoDB document.

        Args:
            user_id: The user ID to update
            fields: Dictionary of field names and values to update

        Returns:
            bool: True if updated successfully, False otherwise
        """
        if not ARANGODB_AVAILABLE or not self.arango_db:
            logger.error(f"ArangoDB not available for updating user {user_id}")
            return False

        if not fields:
            logger.warning(f"No fields provided to update for user {user_id}")
            return True

        try:
            users_collection = self.arango_db.collection(USERS_COLLECTION)

            from datetime import datetime

            # Add user_id and updated_at to the update object
            update_obj = {
                **fields,
                "user_id": user_id,
                "updated_at": datetime.utcnow().isoformat(),
            }

            if users_collection.has(user_id):
                # Update existing user using AQL
                aql_query = """
                FOR user IN users
                FILTER user._key == @user_id
                UPDATE user WITH @update_obj IN users
                RETURN NEW
                """

                result = self.arango_db.aql.execute(
                    aql_query, bind_vars={"user_id": user_id, "update_obj": update_obj}
                )

                updated_docs = list(result)
                if updated_docs:
                    logger.info(
                        f"Updated fields for user {user_id}: {list(fields.keys())}"
                    )
                else:
                    logger.error(f"AQL update returned no results for user {user_id}")
                    return False

            else:
                # Create new user entry with the fields
                new_user = {
                    "_key": user_id,
                    "user_id": user_id,
                    **fields,
                    "display_name": fields.get("display_name"),
                    "email": fields.get("email"),
                    "photo_url": fields.get("photo_url"),
                    "user_picture_url": fields.get("user_picture_url"),
                    "is_paid": fields.get("is_paid", False),
                    "created_at": datetime.utcnow().isoformat(),
                    "last_login": fields.get("last_login"),
                    "provider": fields.get("provider", "arangodb"),
                    "updated_at": datetime.utcnow().isoformat(),
                }
                users_collection.insert(new_user, overwrite=False)
                logger.info(
                    f"Created new user entry with fields {list(fields.keys())} for user {user_id}"
                )

            # Invalidate cache for this user
            self.cache_service.remove_user_from_cache(user_id)
            logger.debug(f"Invalidated cache for user {user_id}")

            return True

        except Exception as e:
            logger.error(f"Error updating fields for user {user_id}: {e}")
            return False

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
