"""
Service for managing friendships in ArangoDB.
"""
import logging
from ..utils.arangodb_utils import get_db
from ..utils.arangodb_utils import (
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
        Adds a bidirectional friendship between two users.
        Returns True if the friendship was created, False if it already existed.
        """
        self._ensure_user_exists(user_id)
        self._ensure_user_exists(friend_id)

        # Check if friendship already exists
        if self.friend_relations.find({"_from": f"{USERS_COLLECTION}/{user_id}", "_to": f"{USERS_COLLECTION}/{friend_id}"}).count() > 0:
            return False

        # Add friendship in both directions
        self.friend_relations.insert({"_from": f"{USERS_COLLECTION}/{user_id}", "_to": f"{USERS_COLLECTION}/{friend_id}"})
        self.friend_relations.insert({"_from": f"{USERS_COLLECTION}/{friend_id}", "_to": f"{USERS_COLLECTION}/{user_id}"})

        logger.info(f"Friendship created between '{user_id}' and '{friend_id}'.")
        return True

    def remove_friend(self, user_id: str, friend_id: str) -> bool:
        """
        Removes a bidirectional friendship between two users.
        Returns True if the friendship was removed, False if it didn't exist.
        """
        edge1_cursor = self.friend_relations.find({"_from": f"{USERS_COLLECTION}/{user_id}", "_to": f"{USERS_COLLECTION}/{friend_id}"})
        edge2_cursor = self.friend_relations.find({"_from": f"{USERS_COLLECTION}/{friend_id}", "_to": f"{USERS_COLLECTION}/{user_id}"})

        removed = False
        if edge1_cursor.count() > 0:
            self.friend_relations.delete(edge1_cursor.next())
            removed = True

        if edge2_cursor.count() > 0:
            self.friend_relations.delete(edge2_cursor.next())
            removed = True

        if removed:
            logger.info(f"Friendship removed between '{user_id}' and '{friend_id}'.")

        return removed

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
            RETURN friend.user_id
        """
        cursor = self.db.aql.execute(aql_query)
        return [friend_id for friend_id in cursor]

# Create a singleton instance of the service
friend_service = FriendService()

def get_friend_service():
    """
    Dependency to get the FriendService instance.
    """
    return friend_service
