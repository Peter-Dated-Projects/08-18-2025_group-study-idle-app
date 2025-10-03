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
    
    def _convert_storage_to_api_format(self, storage_inventory) -> list:
        """
        Convert storage format (object) to API format (array of dicts).
        Storage format: {"structure_name": {"count": 2}}
        API format: [{"structure_name": "structure_name", "count": 2}]
        """
        if isinstance(storage_inventory, list):
            # Already in old array format, return as is for backward compatibility
            return storage_inventory
        
        if isinstance(storage_inventory, str):
            storage_inventory = json.loads(storage_inventory)
        
        if not isinstance(storage_inventory, dict):
            return []

        api_format = []
        for structure_name, data in storage_inventory.items():
            api_format.append({
                "structure_name": structure_name,
                "count": data.get("count", 0)
            })
        return api_format
    
    def _convert_api_to_storage_format(self, api_inventory) -> dict:
        """
        Convert API format (array of dicts) to storage format (object).
        API format: [{"structure_name": "structure_name", "count": 2}]
        Storage format: {"structure_name": {"count": 2}}
        """
        storage_format = {}
        for item in api_inventory:
            structure_name = item.get("structure_name")
            if structure_name:
                storage_format[structure_name] = {
                    "count": item.get("count", 0)
                }
        return storage_format
    
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
                        "structure_inventory": self._convert_storage_to_api_format(result.structure_inventory),
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
                    "inventory": json.dumps({})  # Changed from [] to {}
                }).fetchone()
                
                db.commit()
                
                if result:
                    return {
                        "user_id": result.user_id,
                        "structure_inventory": self._convert_storage_to_api_format(result.structure_inventory),
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
                
                # Convert API format to storage format for manipulation
                api_inventory = current_inventory.get("structure_inventory", [])
                storage_inventory = self._convert_api_to_storage_format(api_inventory)
                
                # Update or add the structure
                if structure_name in storage_inventory:
                    storage_inventory[structure_name]["count"] += count
                    # Remove structure if count becomes 0 or negative
                    if storage_inventory[structure_name]["count"] <= 0:
                        del storage_inventory[structure_name]
                elif count > 0:
                    # Add new structure
                    storage_inventory[structure_name] = {
                        "count": count
                    }
                
                # Update database with storage format
                query = text("""
                    UPDATE user_structure_inventory
                    SET structure_inventory = :inventory, updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = :user_id
                    RETURNING user_id, structure_inventory, created_at, updated_at
                """)
                
                result = db.execute(query, {
                    "user_id": user_id,
                    "inventory": json.dumps(storage_inventory)
                }).fetchone()
                
                db.commit()
                
                return {
                    "user_id": result.user_id,
                    "structure_inventory": self._convert_storage_to_api_format(result.structure_inventory),
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
            
            # API format is always a list, search through it
            for item in inventory.get("structure_inventory", []):
                if item["structure_name"] == structure_name:
                    return item["count"]
            
            return 0  # Return 0 if structure not found
            
        except Exception as e:
            self.logger.error(f"Error getting structure count for user {user_id}: {e}")
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
                # Convert inventory_updates to the expected API format
                api_inventory = []
                for item in inventory_updates:
                    if isinstance(item, dict):
                        # Convert to API format
                        api_item = {
                            "structure_name": item.get("structure_name"),
                            "count": item.get("count", 0)
                        }
                        api_inventory.append(api_item)
                    else:
                        # Handle pydantic model objects
                        api_inventory.append({
                            "structure_name": item.structure_name,
                            "count": item.count
                        })

                # Convert API format to storage format
                storage_inventory = self._convert_api_to_storage_format(api_inventory)

                # Update database with storage format
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
                    "inventory": json.dumps(storage_inventory)
                }).fetchone()
                
                db.commit()
                
                return {
                    "user_id": result.user_id,
                    "structure_inventory": self._convert_storage_to_api_format(result.structure_inventory),
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