"""
Periodic sync service for keeping PostgreSQL PomoLeaderboard table 
synchronized with Redis cache data every hour.

This service handles:
- New users appearing in Redis
- Deleted users (missing from Redis)
- User score updates
- Data consistency validation
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Optional
from sqlalchemy.orm import Session

from app.models.database import SessionLocal, PomoLeaderboard
from app.utils.redis_utils import RedisClient

logger = logging.getLogger(__name__)


class PeriodicSyncService:
    """Service for periodic synchronization between Redis and PostgreSQL."""
    
    def __init__(self):
        """Initialize the sync service."""
        self.redis_client = RedisClient()
        self.sync_interval_hours = 1
        self.is_running = False
        self.last_sync_time = None
        
    async def start_periodic_sync(self):
        """Start the periodic synchronization process."""
        logger.info("Starting periodic sync service (every hour)")
        self.is_running = True
        
        while self.is_running:
            try:
                await self.perform_sync()
                self.last_sync_time = datetime.utcnow()
                
                # Wait for next sync interval
                await asyncio.sleep(self.sync_interval_hours * 3600)  # 1 hour in seconds
                
            except Exception as e:
                logger.error(f"Error in periodic sync: {e}")
                # Wait 5 minutes before retrying on error
                await asyncio.sleep(300)
    
    def stop_periodic_sync(self):
        """Stop the periodic synchronization process."""
        logger.info("Stopping periodic sync service")
        self.is_running = False
    
    async def perform_sync(self) -> Dict[str, int]:
        """
        Perform a complete synchronization from Redis to PostgreSQL.
        
        Returns:
            Dict with sync statistics
        """
        logger.info("Starting Redis -> PostgreSQL sync")
        
        if not self.redis_client.ping():
            logger.error("Redis not available, skipping sync")
            return {"error": "Redis unavailable"}
        
        session = SessionLocal()
        stats = {
            "users_updated": 0,
            "users_created": 0,
            "users_deleted": 0,
            "errors": 0,
            "sync_time": datetime.utcnow().isoformat()
        }
        
        try:
            # Get all users from Redis and PostgreSQL
            redis_users = self._get_all_redis_users()
            postgres_users = self._get_all_postgres_users(session)
            
            redis_user_ids = set(redis_users.keys())
            postgres_user_ids = set(postgres_users.keys())
            
            # Handle new users (in Redis but not in PostgreSQL)
            new_users = redis_user_ids - postgres_user_ids
            for user_id in new_users:
                try:
                    self._create_postgres_user(session, user_id, redis_users[user_id])
                    stats["users_created"] += 1
                    logger.info(f"Created new user in PostgreSQL: {user_id}")
                except Exception as e:
                    logger.error(f"Failed to create user {user_id}: {e}")
                    stats["errors"] += 1
            
            # Handle deleted users (in PostgreSQL but not in Redis)
            deleted_users = postgres_user_ids - redis_user_ids
            for user_id in deleted_users:
                try:
                    self._delete_postgres_user(session, user_id)
                    stats["users_deleted"] += 1
                    logger.info(f"Deleted user from PostgreSQL: {user_id}")
                except Exception as e:
                    logger.error(f"Failed to delete user {user_id}: {e}")
                    stats["errors"] += 1
            
            # Handle existing users (update if Redis data is newer)
            existing_users = redis_user_ids & postgres_user_ids
            for user_id in existing_users:
                try:
                    redis_data = redis_users[user_id]
                    postgres_data = postgres_users[user_id]
                    
                    if self._needs_update(redis_data, postgres_data):
                        self._update_postgres_user(session, user_id, redis_data)
                        stats["users_updated"] += 1
                        logger.info(f"Updated user in PostgreSQL: {user_id}")
                        
                except Exception as e:
                    logger.error(f"Failed to update user {user_id}: {e}")
                    stats["errors"] += 1
            
            # Commit all changes
            session.commit()
            
            logger.info(f"Sync completed: {stats}")
            return stats
            
        except Exception as e:
            session.rollback()
            logger.error(f"Sync failed: {e}")
            stats["errors"] += 1
            return stats
        finally:
            session.close()
    
    def _get_all_redis_users(self) -> Dict[str, Dict]:
        """Get all users and their data from Redis cache."""
        users = {}
        
        try:
            # Get all user IDs from the daily leaderboard (primary source)
            user_ids = self.redis_client.client.zrange("leaderboard:daily", 0, -1)
            
            for user_id in user_ids:
                user_data = self._get_redis_user_data(user_id)
                if user_data:
                    users[user_id] = user_data
            
            logger.info(f"Found {len(users)} users in Redis")
            return users
            
        except Exception as e:
            logger.error(f"Failed to get Redis users: {e}")
            return {}
    
    def _get_redis_user_data(self, user_id: str) -> Optional[Dict]:
        """Get complete user data from Redis."""
        try:
            # Get scores from all leaderboards
            daily_score = self.redis_client.client.zscore("leaderboard:daily", user_id) or 0
            weekly_score = self.redis_client.client.zscore("leaderboard:weekly", user_id) or 0
            monthly_score = self.redis_client.client.zscore("leaderboard:monthly", user_id) or 0
            yearly_score = self.redis_client.client.zscore("leaderboard:yearly", user_id) or 0
            
            # Get cached user details if available
            cached_details = self.redis_client.client.get(f"user:details:{user_id}")
            updated_at = None
            
            if cached_details:
                try:
                    details = json.loads(cached_details)
                    updated_at = details.get("updated_at")
                except json.JSONDecodeError:
                    pass
            
            return {
                "user_id": user_id,
                "daily_pomo": int(daily_score),
                "weekly_pomo": int(weekly_score),
                "monthly_pomo": int(monthly_score),
                "yearly_pomo": int(yearly_score),
                "updated_at": updated_at or datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get Redis data for user {user_id}: {e}")
            return None
    
    def _get_all_postgres_users(self, session: Session) -> Dict[str, Dict]:
        """Get all users and their data from PostgreSQL."""
        users = {}
        
        try:
            postgres_users = session.query(PomoLeaderboard).all()
            
            for user in postgres_users:
                users[user.user_id] = {
                    "user_id": user.user_id,
                    "daily_pomo": user.daily_pomo,
                    "weekly_pomo": user.weekly_pomo,
                    "monthly_pomo": user.monthly_pomo,
                    "yearly_pomo": user.yearly_pomo,
                    "updated_at": user.updated_at.isoformat() if user.updated_at else None
                }
            
            logger.info(f"Found {len(users)} users in PostgreSQL")
            return users
            
        except Exception as e:
            logger.error(f"Failed to get PostgreSQL users: {e}")
            return {}
    
    def _needs_update(self, redis_data: Dict, postgres_data: Dict) -> bool:
        """Check if PostgreSQL data needs to be updated based on Redis data."""
        # Compare scores
        score_fields = ["daily_pomo", "weekly_pomo", "monthly_pomo", "yearly_pomo"]
        
        for field in score_fields:
            if redis_data.get(field, 0) != postgres_data.get(field, 0):
                return True
        
        # If Redis has a more recent timestamp, update
        redis_updated = redis_data.get("updated_at")
        postgres_updated = postgres_data.get("updated_at")
        
        if redis_updated and postgres_updated:
            try:
                # Parse timestamps and make them timezone-aware
                if isinstance(redis_updated, str):
                    redis_time = datetime.fromisoformat(redis_updated.replace('Z', '+00:00'))
                else:
                    redis_time = redis_updated
                    
                if isinstance(postgres_updated, str):
                    postgres_time = datetime.fromisoformat(postgres_updated.replace('Z', '+00:00'))
                else:
                    postgres_time = postgres_updated
                    
                # Make both timezone-naive for comparison
                if redis_time.tzinfo is not None:
                    redis_time = redis_time.replace(tzinfo=None)
                if postgres_time.tzinfo is not None:
                    postgres_time = postgres_time.replace(tzinfo=None)
                    
                return redis_time > postgres_time
            except (ValueError, AttributeError):
                # If timestamp parsing fails, update to be safe
                return True
        
        return False
    
    def _create_postgres_user(self, session: Session, user_id: str, redis_data: Dict):
        """Create a new user in PostgreSQL from Redis data."""
        user = PomoLeaderboard(
            user_id=user_id,
            daily_pomo=redis_data.get("daily_pomo", 0),
            weekly_pomo=redis_data.get("weekly_pomo", 0),
            monthly_pomo=redis_data.get("monthly_pomo", 0),
            yearly_pomo=redis_data.get("yearly_pomo", 0),
            updated_at=datetime.utcnow()
        )
        
        session.add(user)
    
    def _update_postgres_user(self, session: Session, user_id: str, redis_data: Dict):
        """Update an existing user in PostgreSQL with Redis data."""
        user = session.query(PomoLeaderboard).filter_by(user_id=user_id).first()
        
        if user:
            user.daily_pomo = redis_data.get("daily_pomo", 0)
            user.weekly_pomo = redis_data.get("weekly_pomo", 0)
            user.monthly_pomo = redis_data.get("monthly_pomo", 0)
            user.yearly_pomo = redis_data.get("yearly_pomo", 0)
            user.updated_at = datetime.utcnow()
    
    def _delete_postgres_user(self, session: Session, user_id: str):
        """Delete a user from PostgreSQL (user no longer in Redis)."""
        user = session.query(PomoLeaderboard).filter_by(user_id=user_id).first()
        
        if user:
            session.delete(user)
    
    def get_sync_status(self) -> Dict:
        """Get the current status of the sync service."""
        return {
            "is_running": self.is_running,
            "last_sync_time": self.last_sync_time.isoformat() if self.last_sync_time else None,
            "next_sync_in_minutes": self._minutes_until_next_sync(),
            "redis_connected": self.redis_client.ping()
        }
    
    def _minutes_until_next_sync(self) -> Optional[int]:
        """Calculate minutes until next sync."""
        if not self.last_sync_time or not self.is_running:
            return None
        
        next_sync = self.last_sync_time + timedelta(hours=self.sync_interval_hours)
        now = datetime.utcnow()
        
        if next_sync > now:
            delta = next_sync - now
            return int(delta.total_seconds() / 60)
        
        return 0  # Sync is due now


# Global service instance
periodic_sync_service = PeriodicSyncService()
