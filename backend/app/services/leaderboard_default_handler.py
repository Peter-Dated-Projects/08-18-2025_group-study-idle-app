"""
Default value handler for PostgreSQL leaderboard data.
Ensures all users have consistent default values in the pomo_leaderboard table.
"""

import logging
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.database import SessionLocal, PomoLeaderboard

logger = logging.getLogger(__name__)


class LeaderboardDefaultHandler:
    """Handles default values for missing leaderboard entries."""
    
    def __init__(self):
        """Initialize the default handler."""
        self.default_values = {
            "daily_pomo": 0,
            "weekly_pomo": 0,
            "monthly_pomo": 0,
            "yearly_pomo": 0
        }
    
    def ensure_user_exists(self, user_id: str, session: Optional[Session] = None) -> PomoLeaderboard:
        """
        Ensure a user exists in the leaderboard with default values.
        
        Args:
            user_id: The user ID to check/create
            session: Optional database session (creates new one if not provided)
            
        Returns:
            PomoLeaderboard: The user's leaderboard entry
        """
        should_close_session = session is None
        if session is None:
            session = SessionLocal()
        
        try:
            # Check if user exists
            user_entry = session.query(PomoLeaderboard).filter_by(user_id=user_id).first()
            
            if user_entry is None:
                # Create new entry with default values
                user_entry = PomoLeaderboard(
                    user_id=user_id,
                    **self.default_values
                )
                session.add(user_entry)
                session.commit()
                logger.info(f"Created leaderboard entry for user {user_id} with default values")
            
            return user_entry
            
        except IntegrityError as e:
            session.rollback()
            logger.error(f"Failed to create leaderboard entry for user {user_id}: {e}")
            # Try to fetch again in case another process created it
            user_entry = session.query(PomoLeaderboard).filter_by(user_id=user_id).first()
            if user_entry is None:
                raise
            return user_entry
        except Exception as e:
            session.rollback()
            logger.error(f"Unexpected error ensuring user {user_id} exists: {e}")
            raise
        finally:
            if should_close_session:
                session.close()
    
    def fix_missing_values(self, user_id: str, session: Optional[Session] = None) -> Dict[str, int]:
        """
        Fix any missing (NULL) values for a user with defaults.
        
        Args:
            user_id: The user ID to fix
            session: Optional database session
            
        Returns:
            Dict with the values that were fixed
        """
        should_close_session = session is None
        if session is None:
            session = SessionLocal()
        
        try:
            user_entry = session.query(PomoLeaderboard).filter_by(user_id=user_id).first()
            
            if user_entry is None:
                # User doesn't exist, create with defaults
                user_entry = self.ensure_user_exists(user_id, session)
                return self.default_values.copy()
            
            # Check and fix NULL values
            fixed_values = {}
            
            for field, default_value in self.default_values.items():
                current_value = getattr(user_entry, field)
                if current_value is None:
                    setattr(user_entry, field, default_value)
                    fixed_values[field] = default_value
                    logger.info(f"Fixed NULL {field} for user {user_id} with default value {default_value}")
            
            if fixed_values:
                session.commit()
                logger.info(f"Fixed {len(fixed_values)} NULL values for user {user_id}")
            
            return fixed_values
            
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to fix missing values for user {user_id}: {e}")
            raise
        finally:
            if should_close_session:
                session.close()
    
    def bulk_ensure_users_exist(self, user_ids: List[str]) -> Dict[str, int]:
        """
        Ensure multiple users exist in the leaderboard with default values.
        
        Args:
            user_ids: List of user IDs to check/create
            
        Returns:
            Dict with statistics about the operation
        """
        session = SessionLocal()
        stats = {
            "checked": 0,
            "created": 0,
            "already_existed": 0,
            "errors": 0
        }
        
        try:
            for user_id in user_ids:
                try:
                    stats["checked"] += 1
                    
                    # Check if user exists
                    existing = session.query(PomoLeaderboard).filter_by(user_id=user_id).first()
                    
                    if existing is None:
                        # Create new entry
                        new_entry = PomoLeaderboard(
                            user_id=user_id,
                            **self.default_values
                        )
                        session.add(new_entry)
                        stats["created"] += 1
                    else:
                        stats["already_existed"] += 1
                        
                except Exception as e:
                    logger.error(f"Error processing user {user_id}: {e}")
                    stats["errors"] += 1
            
            # Commit all changes
            session.commit()
            logger.info(f"Bulk ensure users: {stats}")
            
        except Exception as e:
            session.rollback()
            logger.error(f"Bulk ensure users failed: {e}")
            stats["errors"] += len(user_ids) - stats["checked"]
        finally:
            session.close()
        
        return stats
    
    def sync_from_user_stats(self) -> Dict[str, int]:
        """
        DEPRECATED: This method previously synced leaderboard entries from the user_stats table.
        Since user_stats is deprecated and user management moved to ArangoDB, this method
        now returns empty stats and performs no operation.
        """
        logger.info("sync_from_user_stats called but user_stats table is deprecated - skipping")
        return {
            "user_stats_count": 0,
            "leaderboard_count": 0,
            "missing_count": 0,
            "created_count": 0,
            "error_count": 0
        }
    
    def validate_all_entries(self) -> Dict[str, int]:
        """
        Validate all leaderboard entries and fix any NULL values.
        
        Returns:
            Dict with validation statistics
        """
        session = SessionLocal()
        stats = {
            "total_users": 0,
            "users_with_nulls": 0,
            "fields_fixed": 0,
            "errors": 0
        }
        
        try:
            # Get all leaderboard entries
            all_entries = session.query(PomoLeaderboard).all()
            stats["total_users"] = len(all_entries)
            
            for entry in all_entries:
                user_had_nulls = False
                
                for field, default_value in self.default_values.items():
                    current_value = getattr(entry, field)
                    if current_value is None:
                        setattr(entry, field, default_value)
                        stats["fields_fixed"] += 1
                        user_had_nulls = True
                        logger.info(f"Fixed NULL {field} for user {entry.user_id}")
                
                if user_had_nulls:
                    stats["users_with_nulls"] += 1
            
            session.commit()
            logger.info(f"Validation completed: {stats}")
            
        except Exception as e:
            session.rollback()
            logger.error(f"Validation failed: {e}")
            stats["errors"] += 1
        finally:
            session.close()
        
        return stats
    
    def get_user_with_defaults(self, user_id: str) -> Dict[str, int]:
        """
        Get user's leaderboard data, ensuring defaults if missing.
        
        Args:
            user_id: The user ID to fetch
            
        Returns:
            Dict with user's leaderboard data
        """
        session = SessionLocal()
        
        try:
            # Ensure user exists with defaults
            user_entry = self.ensure_user_exists(user_id, session)
            
            # Fix any NULL values
            self.fix_missing_values(user_id, session)
            
            # Refresh to get latest data
            session.refresh(user_entry)
            
            return {
                "user_id": user_entry.user_id,
                "daily_pomo": user_entry.daily_pomo or 0,
                "weekly_pomo": user_entry.weekly_pomo or 0,
                "monthly_pomo": user_entry.monthly_pomo or 0,
                "yearly_pomo": user_entry.yearly_pomo or 0,
                "updated_at": user_entry.updated_at.isoformat() if user_entry.updated_at else None
            }
            
        finally:
            session.close()


# Global instance
leaderboard_default_handler = LeaderboardDefaultHandler()
