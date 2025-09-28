"""
Level config service for managing user world/land configurations.
Handles PostgreSQL database operations for user level config data.
"""
import logging
from typing import Dict, Optional, Any, List
import json

from sqlalchemy.orm import Session
from sqlalchemy import text
from ..models.database import SessionLocal

logger = logging.getLogger(__name__)

class LevelConfigService:
    """Service for managing user level configurations."""
    
    def __init__(self):
        self.logger = logger
        self.default_level_config = ["empty"] * 7  # 7 empty slots
    
    def _get_db(self) -> Session:
        """Get database session."""
        return SessionLocal()
    
    def get_user_level_config(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get user's level configuration from database.
        
        Args:
            user_id: User ID to get config for
            
        Returns:
            Dictionary with level config data or None if not found
        """
        try:
            with self._get_db() as db:
                query = text("""
                    SELECT user_id, level_config, created_at, updated_at
                    FROM user_level_config
                    WHERE user_id = :user_id
                """)
                
                result = db.execute(query, {"user_id": user_id}).fetchone()
                
                if result:
                    return {
                        "user_id": result.user_id,
                        "level_config": result.level_config,
                        "created_at": result.created_at.isoformat() if result.created_at else None,
                        "updated_at": result.updated_at.isoformat() if result.updated_at else None
                    }
                return None
                
        except Exception as e:
            self.logger.error(f"Error getting level config for user {user_id}: {e}")
            raise
    
    def create_user_level_config(self, user_id: str, level_config: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Create level config for a new user.
        
        Args:
            user_id: User ID to create config for
            level_config: Optional custom level config, defaults to 7 "empty" slots
            
        Returns:
            Dictionary with created level config data
        """
        try:
            if level_config is None:
                level_config = self.default_level_config.copy()
            
            # Ensure we have exactly 7 slots
            if len(level_config) != 7:
                self.logger.warning(f"Level config for user {user_id} has {len(level_config)} slots, expected 7. Adjusting...")
                level_config = (level_config + self.default_level_config)[:7]
            
            with self._get_db() as db:
                query = text("""
                    INSERT INTO user_level_config (user_id, level_config)
                    VALUES (:user_id, :level_config)
                    ON CONFLICT (user_id) DO NOTHING
                    RETURNING user_id, level_config, created_at, updated_at
                """)
                
                result = db.execute(query, {
                    "user_id": user_id,
                    "level_config": json.dumps(level_config)
                }).fetchone()
                
                db.commit()
                
                if result:
                    return {
                        "user_id": result.user_id,
                        "level_config": result.level_config,
                        "created_at": result.created_at.isoformat() if result.created_at else None,
                        "updated_at": result.updated_at.isoformat() if result.updated_at else None
                    }
                else:
                    # User already exists, get their config
                    return self.get_user_level_config(user_id)
                
        except Exception as e:
            self.logger.error(f"Error creating level config for user {user_id}: {e}")
            raise
    
    def update_user_level_config(self, user_id: str, level_config: List[str]) -> Dict[str, Any]:
        """
        Update user's level configuration.
        
        Args:
            user_id: User ID
            level_config: List of 7 strings representing the level slots
            
        Returns:
            Dictionary with updated level config data
        """
        try:
            # Ensure we have exactly 7 slots
            if len(level_config) != 7:
                raise ValueError(f"Level config must have exactly 7 slots, got {len(level_config)}")
            
            self.logger.info(f"Updating full level config for user {user_id}: {level_config}")
            
            with self._get_db() as db:
                # Get current config
                current_config = self.get_user_level_config(user_id)
                
                if not current_config:
                    # Create new config if doesn't exist
                    self.logger.info(f"Creating new config during update for user {user_id}")
                    return self.create_user_level_config(user_id, level_config)
                
                self.logger.info(f"Updating existing config for user {user_id}")
                
                # Update existing config
                query = text("""
                    UPDATE user_level_config
                    SET level_config = :level_config, updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = :user_id
                    RETURNING user_id, level_config, created_at, updated_at
                """)
                
                result = db.execute(query, {
                    "user_id": user_id,
                    "level_config": json.dumps(level_config)
                }).fetchone()
                
                db.commit()
                
                if result:
                    self.logger.info(f"Database update successful for user {user_id}")
                    return {
                        "user_id": result.user_id,
                        "level_config": result.level_config,
                        "created_at": result.created_at.isoformat() if result.created_at else None,
                        "updated_at": result.updated_at.isoformat() if result.updated_at else None
                    }
                else:
                    raise Exception("Update query returned no result")
                
        except Exception as e:
            self.logger.error(f"Error updating level config for user {user_id}: {e}")
            raise
    
    def update_slot_config(self, user_id: str, slot_index: int, structure_id: str) -> Dict[str, Any]:
        """
        Update a specific slot in the user's level configuration.
        
        Args:
            user_id: User ID
            slot_index: Index of the slot to update (0-6)
            structure_id: Structure ID or "empty"
            
        Returns:
            Dictionary with updated level config data
        """
        try:
            if not (0 <= slot_index <= 6):
                raise ValueError(f"Slot index must be between 0 and 6, got {slot_index}")
            
            self.logger.info(f"Updating slot {slot_index} to '{structure_id}' for user {user_id}")
            
            # Get current config
            current_config = self.get_user_level_config(user_id)
            
            if not current_config:
                # Create new config if doesn't exist
                self.logger.info(f"Creating new level config for user {user_id}")
                current_config = self.create_user_level_config(user_id)
            
            # Update the specific slot
            level_config = current_config["level_config"]
            if isinstance(level_config, str):
                level_config = json.loads(level_config)
            
            old_structure = level_config[slot_index]
            level_config[slot_index] = structure_id
            
            self.logger.info(f"Slot {slot_index} changed from '{old_structure}' to '{structure_id}' for user {user_id}")
            
            result = self.update_user_level_config(user_id, level_config)
            self.logger.info(f"Successfully updated level config for user {user_id}")
            return result
            
        except Exception as e:
            self.logger.error(f"Error updating slot {slot_index} for user {user_id}: {e}")
            raise
    
    def get_slot_config(self, user_id: str, slot_index: int) -> str:
        """
        Get the configuration for a specific slot.
        
        Args:
            user_id: User ID
            slot_index: Index of the slot to get (0-6)
            
        Returns:
            Structure ID or "empty"
        """
        try:
            if not (0 <= slot_index <= 6):
                raise ValueError(f"Slot index must be between 0 and 6, got {slot_index}")
            
            config = self.get_user_level_config(user_id)
            
            if not config:
                return "empty"
            
            level_config = config["level_config"]
            if isinstance(level_config, str):
                level_config = json.loads(level_config)
            
            return level_config[slot_index] if slot_index < len(level_config) else "empty"
            
        except Exception as e:
            self.logger.error(f"Error getting slot {slot_index} for user {user_id}: {e}")
            return "empty"
    
    def reset_user_level_config(self, user_id: str) -> Dict[str, Any]:
        """
        Reset user's level configuration to all empty slots.
        
        Args:
            user_id: User ID
            
        Returns:
            Dictionary with reset level config data
        """
        try:
            return self.update_user_level_config(user_id, self.default_level_config.copy())
            
        except Exception as e:
            self.logger.error(f"Error resetting level config for user {user_id}: {e}")
            raise


# Dependency for FastAPI
_level_config_service = None

def get_level_config_service() -> LevelConfigService:
    """Get the level config service instance."""
    global _level_config_service
    if _level_config_service is None:
        _level_config_service = LevelConfigService()
    return _level_config_service