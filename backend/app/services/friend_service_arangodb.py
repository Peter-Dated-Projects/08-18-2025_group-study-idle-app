"""
Service for managing friendships in ArangoDB.
"""
import logging
from ..utils.arangodb_utils import (
    get_db,
    USERS_COLLECTION,
    FRIEND_RELATIONS_COLLECTION,
    FRIENDS_GRAPH,
)

logger = logging.getLogger(__name__)

class FriendService:
    """
    Encapsulates all logic for friend management using ArangoDB.
    """

    def __init__(self):
        self.db = get_db()
        self.users = self.db.collection(USERS_COLLECTION)
        self.friend_relations = self.db.collection(FRIEND_RELATIONS_COLLECTION)
        self.graph = self.db.graph(FRIENDS_GRAPH)

    def _ensure_user_exists(self, user_id: str):
        """
        Ensures a user exists in the users collection. If not, it creates the user.
        """
        if not self.users.has(user_id):
            self.users.insert({"_key": user_id, "user_id": user_id})
            logger.info(f"Created user '{user_id}' in users collection.")

    def add_friend(self, user_id: str, friend_id: str) -> bool:
        """
        Adds a bidirectional friendship between two users using the graph API.
        Returns True if the friendship was created, False if it already existed.
        """
        self._ensure_user_exists(user_id)
        self._ensure_user_exists(friend_id)

        # Check if friendship already exists using graph traversal
        aql_check_query = f"""
        FOR v IN 1..1 OUTBOUND '{USERS_COLLECTION}/{user_id}' GRAPH '{FRIENDS_GRAPH}'
            FILTER v._key == '{friend_id}'
            RETURN v
        """
        try:
            check_cursor = self.db.aql.execute(aql_check_query)
            existing_friends = list(check_cursor)
            if len(existing_friends) > 0:
                logger.info(f"Friendship already exists between '{user_id}' and '{friend_id}'")
                return False
        except Exception as e:
            logger.error(f"Failed to check existing friendship: {e}")
            return False

        # Instead of using graph.edge_collection, let's use direct collection access
        # but ensure we're working within the graph context
        try:
            # Add friendship in both directions using direct collection insertion
            self.friend_relations.insert({
                "_from": f"{USERS_COLLECTION}/{user_id}", 
                "_to": f"{USERS_COLLECTION}/{friend_id}"
            })
            self.friend_relations.insert({
                "_from": f"{USERS_COLLECTION}/{friend_id}", 
                "_to": f"{USERS_COLLECTION}/{user_id}"
            })

            logger.info(f"Friendship created between '{user_id}' and '{friend_id}' using direct collection insert.")
            return True
        except Exception as e:
            logger.error(f"Failed to create friendship between '{user_id}' and '{friend_id}': {e}")
            return False

    def remove_friend(self, user_id: str, friend_id: str) -> bool:
        """
        Removes a bidirectional friendship between two users using the graph API.
        Returns True if the friendship was removed, False if it didn't exist.
        """
        edge_collection = self.graph.edge_collection(FRIEND_RELATIONS_COLLECTION)
        
        # Find and remove edges using graph API
        aql_find_edges = f"""
        FOR e IN {FRIEND_RELATIONS_COLLECTION}
            FILTER (e._from == '{USERS_COLLECTION}/{user_id}' AND e._to == '{USERS_COLLECTION}/{friend_id}') OR 
                   (e._from == '{USERS_COLLECTION}/{friend_id}' AND e._to == '{USERS_COLLECTION}/{user_id}')
            RETURN e
        """
        
        edge_cursor = self.db.aql.execute(aql_find_edges)
        removed = False
        
        try:
            for edge in edge_cursor:
                edge_collection.delete(edge)
                removed = True

            if removed:
                logger.info(f"Friendship removed between '{user_id}' and '{friend_id}' using graph API.")

            return removed
        except Exception as e:
            logger.error(f"Failed to remove friendship between '{user_id}' and '{friend_id}': {e}")
            return False

    def get_friends(self, user_id: str) -> list[str]:
        """
        Gets a list of a user's friends.
        """
        if not self.users.has(user_id):
            # If the user doesn't exist, they have no friends.
            # We can also create the user here if we want to be more robust.
            self._ensure_user_exists(user_id)
            return []

        aql_query = f"""
        FOR friend IN 1..1 OUTBOUND '{USERS_COLLECTION}/{user_id}' GRAPH '{FRIENDS_GRAPH}'
            RETURN friend.user_id != null ? friend.user_id : friend._key
        """
        cursor = self.db.aql.execute(aql_query)
        result = [friend_id for friend_id in cursor if friend_id is not None and friend_id != ""]
        logger.info(f"Found {len(result)} friends for user {user_id}: {result}")
        return result

    def get_friends_of_friends(self, user_id: str) -> list[str]:
        """
        Gets a list of friends-of-friends (second-degree connections) for a user.
        Excludes the user themselves and their direct friends.
        Returns a list of user IDs who are friends of the user's friends but not direct friends.
        """
        if not self.users.has(user_id):
            self._ensure_user_exists(user_id)
            return []

        aql_query = f"""
        FOR friend_of_friend IN 2..2 OUTBOUND '{USERS_COLLECTION}/{user_id}' GRAPH '{FRIENDS_GRAPH}'
            LET friend_id = friend_of_friend.user_id ? friend_of_friend.user_id : friend_of_friend._key
            FILTER friend_id != '{user_id}'
            FILTER friend_of_friend._id NOT IN (
                FOR direct_friend IN 1..1 OUTBOUND '{USERS_COLLECTION}/{user_id}' GRAPH '{FRIENDS_GRAPH}'
                    RETURN direct_friend._id
            )
            RETURN DISTINCT friend_id
        """
        cursor = self.db.aql.execute(aql_query)
        return [friend_of_friend_id for friend_of_friend_id in cursor if friend_of_friend_id is not None and friend_of_friend_id != user_id]

# Create a singleton instance of the service
friend_service = FriendService()

def get_friend_service():
    """
    Dependency to get the FriendService instance.
    """
    return friend_service
