"""
ArangoDB utility functions for the group study idle app backend.
Provides SDK-style functions for ArangoDB operations.
"""

import os
import logging
from pathlib import Path
from dotenv import load_dotenv
from arango import ArangoClient
from arango.exceptions import DatabaseCreateError

# Load environment variables from config/.env
config_dir = Path(__file__).parent.parent.parent / "config"
env_file = config_dir / ".env"
load_dotenv(env_file)

# Configure logging
logger = logging.getLogger(__name__)

# Collection names
USERS_COLLECTION = "users"
STUDY_GROUPS_COLLECTION = "study_groups"
FRIEND_RELATIONS_COLLECTION = "friend_relations"
GROUP_MEMBERS_COLLECTION = "group_members"

# Graph names
FRIENDS_GRAPH = "friends_graph"
GROUPS_GRAPH = "groups_graph"


class ArangoDBClient:
    """ArangoDB client wrapper with utility methods."""
    
    def __init__(self):
        """Initialize ArangoDB client with environment configuration."""
        self.arango_host = os.getenv("ARANGO_HOST", "localhost")
        self.arango_port = int(os.getenv("ARANGO_PORT", "8529"))
        self.arango_root_password = os.getenv("ARANGO_ROOT_PASSWORD")
        self.arango_db_name = os.getenv("ARANGO_DB_NAME", "social_db")
        self.arango_url = f"http://{self.arango_host}:{self.arango_port}"
        
        self._client = None
        self._db = None
    
    @property
    def client(self) -> ArangoClient:
        """Get ArangoDB client instance (lazy initialization)."""
        if self._client is None:
            try:
                self._client = ArangoClient(hosts=self.arango_url)
            except Exception as e:
                logger.error(f"Failed to initialize ArangoDB client: {e}")
                raise
        return self._client
    
    @property
    def db(self):
        """Get database instance (lazy initialization)."""
        if self._db is None:
            self._db = self._get_db_connection()
        return self._db
    
    def _get_db_connection(self):
        """
        Get a connection to the social_db database.
        Connects as root and creates the database if it doesn't exist.
        """
        try:
            sys_db = self.client.db("_system", username="root", password=self.arango_root_password)

            if not sys_db.has_database(self.arango_db_name):
                try:
                    sys_db.create_database(self.arango_db_name)
                    logger.info(f"Database '{self.arango_db_name}' created.")
                except DatabaseCreateError as e:
                    logger.error(f"Failed to create database '{self.arango_db_name}': {e}")
                    raise

            return self.client.db(self.arango_db_name, username="root", password=self.arango_root_password)
        except Exception as e:
            logger.error(f"Failed to connect to ArangoDB database '{self.arango_db_name}': {e}")
            raise
    
    def ping(self) -> bool:
        """Check if ArangoDB is available."""
        try:
            # Test database connection by executing a simple query
            self.db.aql.execute("RETURN 1")
            return True
        except Exception as e:
            logger.error(f"ArangoDB ping failed: {e}")
            return False


# Global client instance
_arango_client = None

def get_arango_client() -> ArangoDBClient:
    """Get the global ArangoDB client instance."""
    global _arango_client
    if _arango_client is None:
        _arango_client = ArangoDBClient()
    return _arango_client

def get_db():
    """
    Dependency to get the ArangoDB database instance.
    """
    try:
        client = get_arango_client()
        return client.db
    except Exception as e:
        logger.error(f"Could not establish a connection to ArangoDB: {e}")
        raise ConnectionError("Could not establish a connection to ArangoDB.")


# Legacy functions for backward compatibility
def get_db_connection():
    """
    Legacy function for backward compatibility.
    Use get_db() instead.
    """
    return get_db()
