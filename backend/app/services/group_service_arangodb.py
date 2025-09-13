"""
Service for managing study groups in ArangoDB.
"""
import logging
import uuid
from datetime import datetime
from ..utils.arangodb_utils import get_db
from ..utils.arangodb_utils import (
    USERS_COLLECTION,
    STUDY_GROUPS_COLLECTION,
    GROUP_MEMBERS_COLLECTION,
    GROUPS_GRAPH,
)

logger = logging.getLogger(__name__)

class GroupService:
    """
    Encapsulates all logic for group management using ArangoDB.
    """

    def __init__(self):
        self.db = get_db()
        self.users = self.db.collection(USERS_COLLECTION)
        self.groups = self.db.collection(STUDY_GROUPS_COLLECTION)
        self.group_members = self.db.collection(GROUP_MEMBERS_COLLECTION)
        self.graph = self.db.graph(GROUPS_GRAPH)

    def _ensure_user_exists(self, user_id: str):
        """Ensures a user exists in the users collection. If not, it creates the user."""
        if not self.users.has(user_id):
            self.users.insert({"_key": user_id, "user_id": user_id})

    def get_user_group_count(self, user_id: str) -> int:
        """Gets the number of groups a user is a member of."""
        aql = f"""
        FOR group IN 1..1 OUTBOUND '{USERS_COLLECTION}/{user_id}' GRAPH '{GROUPS_GRAPH}'
            COLLECT WITH COUNT INTO length
            RETURN length
        """
        cursor = self.db.aql.execute(aql)
        return cursor.next() if cursor.has_next() else 0

    def create_group(self, creator_id: str, group_name: str) -> dict:
        """Creates a new group and adds the creator as the first member."""
        self._ensure_user_exists(creator_id)

        if self.get_user_group_count(creator_id) >= 5:
            raise ValueError("You have reached the maximum limit of 5 groups.")

        group_id = str(uuid.uuid4()).replace('-', '')[:16]
        group_doc = {
            "_key": group_id,
            "group_id": group_id,
            "creator_id": creator_id,
            "group_name": group_name,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }
        self.groups.insert(group_doc)

        # Add creator as the first member
        self.add_member(group_id, creator_id, check_limit=False)

        logger.info(f"Group '{group_name}' ({group_id}) created by '{creator_id}'.")
        return group_doc

    def add_member(self, group_id: str, user_id: str, check_limit: bool = True):
        """Adds a user to a group."""
        self._ensure_user_exists(user_id)
        if not self.groups.has(group_id):
            raise ValueError("Group not found.")

        if check_limit and self.get_user_group_count(user_id) >= 5:
            raise ValueError("You have reached the maximum limit of 5 groups.")

        edge_key = f"{user_id}:{group_id}"
        if self.group_members.has(edge_key):
            raise ValueError("User is already a member of this group.")

        self.group_members.insert({
            "_key": edge_key,
            "_from": f"{USERS_COLLECTION}/{user_id}",
            "_to": f"{STUDY_GROUPS_COLLECTION}/{group_id}",
        })
        logger.info(f"User '{user_id}' joined group '{group_id}'.")

    def remove_member(self, group_id: str, user_id: str) -> str:
        """Removes a user from a group. Handles creator leaving and group deletion."""
        group = self.groups.get(group_id)
        if not group:
            raise ValueError("Group not found.")

        edge_key = f"{user_id}:{group_id}"
        if not self.group_members.has(edge_key):
            raise ValueError("User is not a member of this group.")

        self.group_members.delete(edge_key)
        logger.info(f"User '{user_id}' left group '{group_id}'.")

        # If the creator leaves, transfer ownership or delete the group
        if group["creator_id"] == user_id:
            members = self.get_group_members(group_id)
            if members:
                new_creator_id = members[0]["user_id"]
                self.groups.update(group, {"creator_id": new_creator_id})
                logger.info(f"Transferred group ownership of '{group_id}' to '{new_creator_id}'.")
            else:
                self.delete_group(group_id)
                logger.info(f"Group '{group_id}' deleted as last member (creator) left.")
                return "deleted"
        return "removed"

    def delete_group(self, group_id: str, user_id: str = None):
        """Deletes a group and all its memberships."""
        group = self.groups.get(group_id)
        if not group:
            raise ValueError("Group not found.")

        if user_id and group["creator_id"] != user_id:
            raise PermissionError("Only the group creator can delete the group.")

        # Delete all membership edges first
        aql = f"""
        FOR v, e IN 1..1 ANY '{STUDY_GROUPS_COLLECTION}/{group_id}' GRAPH '{GROUPS_GRAPH}'
            REMOVE e IN {GROUP_MEMBERS_COLLECTION}
        """
        self.db.aql.execute(aql)

        self.groups.delete(group_id)
        logger.info(f"Group '{group_id}' deleted.")

    def get_group_members(self, group_id: str) -> list:
        """Gets a list of members for a specific group."""
        aql = f"""
        FOR user IN 1..1 INBOUND '{STUDY_GROUPS_COLLECTION}/{group_id}' GRAPH '{GROUPS_GRAPH}'
            RETURN user
        """
        return [doc for doc in self.db.aql.execute(aql)]

    def get_group(self, group_id: str) -> dict:
        """Gets detailed information for a specific group, including its members."""
        group = self.groups.get(group_id)
        if not group:
            return None

        members = self.get_group_members(group_id)
        group["member_ids"] = [m["user_id"] for m in members]
        return group

    def get_user_groups(self, user_id: str) -> list:
        """Gets a list of all groups a user is a member of."""
        self._ensure_user_exists(user_id)
        aql = f"""
        FOR group IN 1..1 OUTBOUND '{USERS_COLLECTION}/{user_id}' GRAPH '{GROUPS_GRAPH}'
            RETURN group
        """
        groups = []
        for group_doc in self.db.aql.execute(aql):
            members = self.get_group_members(group_doc["group_id"])
            group_doc["member_ids"] = [m["user_id"] for m in members]
            groups.append(group_doc)
        return groups

    def update_group(self, group_id: str, user_id: str, new_name: str):
        """Updates a group's name, only if the user is the creator."""
        group = self.groups.get(group_id)
        if not group:
            raise ValueError("Group not found.")

        if group["creator_id"] != user_id:
            raise PermissionError("Only the group creator can update the group.")

        self.groups.update(group, {
            "group_name": new_name,
            "updated_at": datetime.utcnow().isoformat()
        })
        logger.info(f"Group '{group_id}' name updated to '{new_name}'.")

# Create a singleton instance of the service
group_service = GroupService()

def get_group_service():
    """Dependency to get the GroupService instance."""
    return group_service
