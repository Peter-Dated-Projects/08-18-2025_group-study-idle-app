"""
Lists all user objects from the ArangoDB database.
"""
import logging
import sys
from pathlib import Path
from arango.exceptions import CollectionListError

# Add the project root to the python path to allow for absolute imports
sys.path.append(str(Path(__file__).parent.parent))

from app.utils.arangodb_utils import get_db, USERS_COLLECTION

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def list_all_users(db):
    """
    Fetches and prints all documents from the users collection.
    """
    try:
        if db.has_collection(USERS_COLLECTION):
            logger.info(f"Fetching all users from collection: '{USERS_COLLECTION}'")
            users_collection = db.collection(USERS_COLLECTION)
            all_users = list(users_collection.all())
            
            if not all_users:
                logger.info("No users found in the collection.")
                return

            for user in all_users:
                print(user)
                
            logger.info(f"Successfully listed {len(all_users)} user(s).")
        else:
            logger.error(f"Collection '{USERS_COLLECTION}' not found.")
            
    except CollectionListError as e:
        logger.error(f"Failed to list collections: {e}")
        raise
    except Exception as e:
        logger.error(f"An error occurred while fetching users: {e}")
        raise

if __name__ == "__main__":
    logger.info("Starting script to list ArangoDB users.")
    try:
        db_connection = get_db()
        list_all_users(db_connection)
        logger.info("Script finished successfully.")
    except Exception as e:
        logger.error(f"An error occurred during script execution: {e}")
        sys.exit(1)
