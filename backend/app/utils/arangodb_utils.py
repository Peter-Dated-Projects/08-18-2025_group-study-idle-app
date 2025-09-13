"""
Utility functions for interacting with ArangoDB.
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

# ArangoDB connection details
ARANGO_HOST = os.getenv("ARANGO_HOST", "localhost")
ARANGO_PORT = int(os.getenv("ARANGO_PORT", 8529))
ARANGO_ROOT_PASSWORD = os.getenv("ARANGO_ROOT_PASSWORD")
ARANGO_DB_NAME = os.getenv("ARANGO_DB_NAME", "social_db")
ARANGO_URL = f"http://{ARANGO_HOST}:{ARANGO_PORT}"

def get_arango_client():
    """
    Initializes and returns an ArangoDB client.
    Connects as root to perform administrative tasks.
    """
    try:
        client = ArangoClient(hosts=ARANGO_URL)
        return client
    except Exception as e:
        logger.error(f"Failed to initialize ArangoDB client: {e}")
        raise

def get_db_connection():
    """
    Get a connection to the social_db database.
    Connects as root and creates the database if it doesn't exist.
    """
    try:
        client = get_arango_client()
        sys_db = client.db("_system", username="root", password=ARANGO_ROOT_PASSWORD)

        if not sys_db.has_database(ARANGO_DB_NAME):
            try:
                sys_db.create_database(ARANGO_DB_NAME)
                logger.info(f"Database '{ARANGO_DB_NAME}' created.")
            except DatabaseCreateError as e:
                logger.error(f"Failed to create database '{ARANGO_DB_NAME}': {e}")
                raise

        return client.db(ARANGO_DB_NAME, username="root", password=ARANGO_ROOT_PASSWORD)
    except Exception as e:
        logger.error(f"Failed to connect to ArangoDB database '{ARANGO_DB_NAME}': {e}")
        raise

# A global instance of the database connection
# This can be used in a similar way to FastAPI's Depends
try:
    db = get_db_connection()
    logger.info(f"Successfully connected to ArangoDB database: '{ARANGO_DB_NAME}'")
except Exception as e:
    db = None
    logger.error(f"Could not establish a global connection to ArangoDB: {e}")

def get_db():
    """
    Dependency to get the ArangoDB database instance.
    """
    if db is None:
        raise ConnectionError("Could not establish a connection to ArangoDB.")
    return db
