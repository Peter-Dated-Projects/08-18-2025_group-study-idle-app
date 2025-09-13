"""
Initializes the ArangoDB database with the required collections and graphs.
"""
import logging
import sys
from pathlib import Path
from arango.exceptions import CollectionCreateError, GraphCreateError

# Add the project root to the python path to allow for absolute imports
sys.path.append(str(Path(__file__).parent.parent))

from app.utils.arangodb_utils import (
    get_db, 
    USERS_COLLECTION,
    STUDY_GROUPS_COLLECTION,
    FRIEND_RELATIONS_COLLECTION,
    GROUP_MEMBERS_COLLECTION,
    FRIENDS_GRAPH,
    GROUPS_GRAPH,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_collections(db):
    """
    Creates the required collections in the database if they don't exist.
    """
    collections_to_create = {
        USERS_COLLECTION: False,
        STUDY_GROUPS_COLLECTION: False,
        FRIEND_RELATIONS_COLLECTION: True,
        GROUP_MEMBERS_COLLECTION: True,
    }

    for name, is_edge in collections_to_create.items():
        if not db.has_collection(name):
            try:
                logger.info(f"Creating collection: {name} (edge: {is_edge})")
                db.create_collection(name, edge=is_edge)
            except CollectionCreateError as e:
                logger.error(f"Failed to create collection '{name}': {e}")
                raise
        else:
            logger.info(f"Collection '{name}' already exists.")

def create_graphs(db):
    """
    Creates the required graphs in the database if they don't exist.
    """
    if not db.has_graph(FRIENDS_GRAPH):
        try:
            logger.info(f"Creating graph: {FRIENDS_GRAPH}")
            friends_graph = db.create_graph(FRIENDS_GRAPH)
            friends_graph.create_edge_definition(
                edge_collection=FRIEND_RELATIONS_COLLECTION,
                from_vertex_collections=[USERS_COLLECTION],
                to_vertex_collections=[USERS_COLLECTION],
            )
        except GraphCreateError as e:
            logger.error(f"Failed to create graph '{FRIENDS_GRAPH}': {e}")
            raise
    else:
        logger.info(f"Graph '{FRIENDS_GRAPH}' already exists.")

    if not db.has_graph(GROUPS_GRAPH):
        try:
            logger.info(f"Creating graph: {GROUPS_GRAPH}")
            groups_graph = db.create_graph(GROUPS_GRAPH)
            groups_graph.create_edge_definition(
                edge_collection=GROUP_MEMBERS_COLLECTION,
                from_vertex_collections=[USERS_COLLECTION],
                to_vertex_collections=[STUDY_GROUPS_COLLECTION],
            )
        except GraphCreateError as e:
            logger.error(f"Failed to create graph '{GROUPS_GRAPH}': {e}")
            raise
    else:
        logger.info(f"Graph '{GROUPS_GRAPH}' already exists.")


if __name__ == "__main__":
    # Get database name from client
    from app.utils.arangodb_utils import get_arango_client
    client = get_arango_client()
    db_name = client.arango_db_name
    
    logger.info(f"Starting ArangoDB initialization for database: '{db_name}'")
    try:
        db_connection = get_db()
        create_collections(db_connection)
        create_graphs(db_connection)
        logger.info("ArangoDB initialization completed successfully.")
    except Exception as e:
        logger.error(f"An error occurred during ArangoDB initialization: {e}")
        sys.exit(1)
