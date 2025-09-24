"""
Inventory service for managing user structure inventories.
Handles PostgreSQL database operations for user inventory data.
"""
import logging
from typing import Dict, Optional, Any
import json

from sqlalchemy.orm import Session
from sqlalchemy import text
from ..models.database import SessionLocal

logger = logging.getLogger(__name__)

class InventoryService:
    """Service for managing user structure inventories."""
    
    def __init__(self):
        self.logger = logger
    
    def _get_db(self) -> Session:
        """Get database session."""
        return SessionLocal()
    
    def get_user_inventory(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get user's structure inventory from database.
        
        Args:
            user_id: User ID to get inventory for
            
        Returns:
            Dictionary with inventory data or None if not found
        """
        try:
            with self._get_db() as db:
                query = text("""
                    SELECT user_id, structure_inventory, created_at, updated_at
                    FROM user_structure_inventory
                    WHERE user_id = :user_id
                """)
                
                result = db.execute(query, {"user_id": user_id}).fetchone()
                
                if result:
                    return {
                        "user_id": result.user_id,
                        "structure_inventory": result.structure_inventory,
                        "created_at": result.created_at.isoformat() if result.created_at else None,
                        "updated_at": result.updated_at.isoformat() if result.updated_at else None
                    }
                return None
                
        except Exception as e:
            self.logger.error(f"Error getting inventory for user {user_id}: {e}")
            raise
    
    def create_user_inventory(self, user_id: str) -> Dict[str, Any]:
        """
        Create empty inventory for a new user.
        
        Args:
            user_id: User ID to create inventory for
            
        Returns:
            Dictionary with created inventory data
        """
        try:
            with self._get_db() as db:
                query = text("""
                    INSERT INTO user_structure_inventory (user_id, structure_inventory)
                    VALUES (:user_id, :inventory)
                    ON CONFLICT (user_id) DO NOTHING
                    RETURNING user_id, structure_inventory, created_at, updated_at
                """)
                
                result = db.execute(query, {
                    "user_id": user_id,
                    "inventory": json.dumps([])
                }).fetchone()
                
                db.commit()
                
                if result:
                    return {
                        "user_id": result.user_id,
                        "structure_inventory": result.structure_inventory,
                        "created_at": result.created_at.isoformat() if result.created_at else None,
                        "updated_at": result.updated_at.isoformat() if result.updated_at else None
                    }
                else:
                    # User already exists, get their inventory
                    return self.get_user_inventory(user_id)
                
        except Exception as e:
            self.logger.error(f"Error creating inventory for user {user_id}: {e}")
            raise
    
    def add_inventory_item(self, user_id: str, structure_name: str, count: int) -> Dict[str, Any]:
        """
        Add or update an item in user's inventory.
        
        Args:
            user_id: User ID
            structure_name: Name of the structure
            count: Number to add (can be negative to subtract)
            
        Returns:
            Dictionary with updated inventory data
        """
        try:
            with self._get_db() as db:
                # Get current inventory
                current_inventory = self.get_user_inventory(user_id)
                
                if not current_inventory:
                    # Create new inventory if doesn't exist
                    current_inventory = self.create_user_inventory(user_id)
                
                # Parse current inventory
                inventory_items = current_inventory.get("structure_inventory", [])
                
                # Find existing item or add new one
                found = False
                for item in inventory_items:
                    if item["structure_name"] == structure_name:
                        item["count"] += count
                        if item["count"] <= 0:
                            inventory_items.remove(item)
                        found = True
                        break
                
                if not found and count > 0:
                    inventory_items.append({
                        "structure_name": structure_name,
                        "count": count,
                        "currently_in_use": 0  # Default to 0 for new items
                    })
                
                # Update database
                query = text("""
                    UPDATE user_structure_inventory
                    SET structure_inventory = :inventory, updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = :user_id
                    RETURNING user_id, structure_inventory, created_at, updated_at
                """)
                
                result = db.execute(query, {
                    "user_id": user_id,
                    "inventory": json.dumps(inventory_items)
                }).fetchone()
                
                db.commit()
                
                return {
                    "user_id": result.user_id,
                    "structure_inventory": result.structure_inventory,
                    "created_at": result.created_at.isoformat() if result.created_at else None,
                    "updated_at": result.updated_at.isoformat() if result.updated_at else None
                }
                
        except Exception as e:
            self.logger.error(f"Error adding inventory item for user {user_id}: {e}")
            raise
    
    def remove_inventory_item(self, user_id: str, structure_name: str, count: int) -> Dict[str, Any]:
        """
        Remove items from user's inventory.
        
        Args:
            user_id: User ID
            structure_name: Name of the structure
            count: Number to remove
            
        Returns:
            Dictionary with updated inventory data
        """
        return self.add_inventory_item(user_id, structure_name, -count)
    
    def get_structure_count(self, user_id: str, structure_name: str) -> int:
        """
        Get count of a specific structure in user's inventory.
        
        Args:
            user_id: User ID
            structure_name: Name of the structure
            
        Returns:
            Count of the structure (0 if not found)
        """
        try:
            inventory = self.get_user_inventory(user_id)
            if not inventory:
                return 0
            
            for item in inventory.get("structure_inventory", []):
                if item["structure_name"] == structure_name:
                    return item["count"]
            
            return 0
            
        except Exception as e:
            self.logger.error(f"Error getting structure count for user {user_id}: {e}")
            return 0

    def update_structure_usage(self, user_id: str, structure_name: str, currently_in_use: int) -> Dict[str, Any]:
        """
        Update the currently_in_use count for a specific structure.
        
        Args:
            user_id: User ID
            structure_name: Name of the structure
            currently_in_use: Number currently in use
            
        Returns:
            Dictionary with updated inventory data
        """
        try:
            with self._get_db() as db:
                # Get current inventory
                current_inventory = self.get_user_inventory(user_id)
                
                if not current_inventory:
                    raise ValueError(f"No inventory found for user {user_id}")
                
                # Parse current inventory
                inventory_items = current_inventory.get("structure_inventory", [])
                
                # Find and update the item
                found = False
                for item in inventory_items:
                    if item["structure_name"] == structure_name:
                        # Ensure currently_in_use doesn't exceed count
                        max_usage = item.get("count", 0)
                        item["currently_in_use"] = min(currently_in_use, max_usage)
                        found = True
                        break
                
                if not found:
                    raise ValueError(f"Structure {structure_name} not found in inventory for user {user_id}")
                
                # Update database
                query = text("""
                    UPDATE user_structure_inventory
                    SET structure_inventory = :inventory, updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = :user_id
                    RETURNING user_id, structure_inventory, created_at, updated_at
                """)
                
                result = db.execute(query, {
                    "user_id": user_id,
                    "inventory": json.dumps(inventory_items)
                }).fetchone()
                
                db.commit()
                
                return {
                    "user_id": result.user_id,
                    "structure_inventory": result.structure_inventory,
                    "created_at": result.created_at.isoformat() if result.created_at else None,
                    "updated_at": result.updated_at.isoformat() if result.updated_at else None
                }
                
        except Exception as e:
            self.logger.error(f"Error updating structure usage for user {user_id}: {e}")
            raise

    def get_structure_usage(self, user_id: str, structure_name: str) -> int:
        """
        Get the currently_in_use count for a specific structure.
        
        Args:
            user_id: User ID
            structure_name: Name of the structure
            
        Returns:
            Number currently in use (0 if not found)
        """
        try:
            inventory = self.get_user_inventory(user_id)
            if not inventory:
                return 0
            
            for item in inventory.get("structure_inventory", []):
                if item["structure_name"] == structure_name:
                    return item.get("currently_in_use", 0)
            
            return 0
            
        except Exception as e:
            self.logger.error(f"Error getting structure usage for user {user_id}: {e}")
            return 0

    def get_available_structures(self, user_id: str, structure_name: str) -> int:
        """
        Get the number of available (not in use) structures.
        
        Args:
            user_id: User ID
            structure_name: Name of the structure
            
        Returns:
            Number available for use (total count - currently_in_use)
        """
        try:
            inventory = self.get_user_inventory(user_id)
            if not inventory:
                return 0
            
            for item in inventory.get("structure_inventory", []):
                if item["structure_name"] == structure_name:
                    total_count = item.get("count", 0)
                    in_use = item.get("currently_in_use", 0)
                    return max(0, total_count - in_use)
            
            return 0
            
        except Exception as e:
            self.logger.error(f"Error getting available structures for user {user_id}: {e}")
            return 0

    def bulk_update_inventory(self, user_id: str, inventory_updates: list) -> Dict[str, Any]:
        """
        Bulk update user's entire structure inventory.
        
        Args:
            user_id: User ID
            inventory_updates: List of inventory items with updated data
            
        Returns:
            Dictionary with updated inventory data
        """
        try:
            with self._get_db() as db:
                # Convert inventory_updates to the expected format
                inventory_items = []
                for item in inventory_updates:
                    if isinstance(item, dict):
                        inventory_items.append(item)
                    else:
                        # Handle pydantic model objects
                        inventory_items.append({
                            "structure_name": item.structure_name,
                            "count": item.count,
                            "currently_in_use": item.currently_in_use
                        })

                # Update database
                query = text("""
                    INSERT INTO user_structure_inventory (user_id, structure_inventory)
                    VALUES (:user_id, :inventory)
                    ON CONFLICT (user_id) 
                    DO UPDATE SET 
                        structure_inventory = :inventory,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING user_id, structure_inventory, created_at, updated_at
                """)
                
                result = db.execute(query, {
                    "user_id": user_id,
                    "inventory": json.dumps(inventory_items)
                }).fetchone()
                
                db.commit()
                
                return {
                    "user_id": result.user_id,
                    "structure_inventory": result.structure_inventory,
                    "created_at": result.created_at.isoformat() if result.created_at else None,
                    "updated_at": result.updated_at.isoformat() if result.updated_at else None
                }
                
        except Exception as e:
            self.logger.error(f"Error bulk updating inventory for user {user_id}: {e}")
            raise


# Dependency for FastAPI
_inventory_service = None

def get_inventory_service() -> InventoryService:
    """Get the inventory service instance."""
    global _inventory_service
    if _inventory_service is None:
        _inventory_service = InventoryService()
    return _inventory_service