"""
Redis Leaderboard Service
Provides high-performance leaderboard operations using Redis ZSETs as a caching layer.
Acts as middleware between PostgreSQL database and frontend.
"""

import logging
from typing import List, Dict, Optional
from datetime import datetime, UTC
from dataclasses import dataclass

from ..utils.redis_utils import RedisClient
from ..models.database import SessionLocal, PomoLeaderboard

logger = logging.getLogger(__name__)

@dataclass
class LeaderboardEntry:
    """Leaderboard entry data structure."""
    user_id: str
    score: int
    rank: int
    daily_pomo: int = 0
    weekly_pomo: int = 0
    monthly_pomo: int = 0
    yearly_pomo: int = 0

class RedisLeaderboardService:
    """
    Redis-based leaderboard service using ZSETs for automatic sorting.
    Provides caching layer between PostgreSQL and frontend.
    """
    
    def __init__(self):
        """Initialize Redis leaderboard service."""
        self.redis_client = RedisClient()
        
        # Redis key patterns for different leaderboard periods
        self.LEADERBOARD_KEYS = {
            "daily": "leaderboard:daily",
            "weekly": "leaderboard:weekly", 
            "monthly": "leaderboard:monthly",
            "yearly": "leaderboard:yearly"
        }
        
        # Redis key for user detail cache
        self.USER_DETAILS_KEY = "user:details:{user_id}"
        
        # Cache expiration times (in seconds)
        self.LEADERBOARD_TTL = 300  # 5 minutes
        self.USER_DETAILS_TTL = 600  # 10 minutes
    
    def _get_leaderboard_key(self, period: str) -> str:
        """Get Redis key for leaderboard period."""
        if period not in self.LEADERBOARD_KEYS:
            raise ValueError(f"Invalid period: {period}. Must be one of: {list(self.LEADERBOARD_KEYS.keys())}")
        return self.LEADERBOARD_KEYS[period]
    
    def _get_user_details_key(self, user_id: str) -> str:
        """Get Redis key for user details."""
        return self.USER_DETAILS_KEY.format(user_id=user_id)
    
    def ping_redis(self) -> bool:
        """Check Redis connectivity."""
        return self.redis_client.ping()
    
    def sync_user_to_cache(self, user_id: str) -> bool:
        """
        Sync a single user's data from PostgreSQL to Redis cache.
        
        Args:
            user_id: User ID to sync
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            session = SessionLocal()
            
            # Get user's pomodoro stats from PostgreSQL
            pomo_stats = session.query(PomoLeaderboard).filter(
                PomoLeaderboard.user_id == user_id
            ).first()
            
            if not pomo_stats:
                # Create default entry if doesn't exist
                pomo_stats = PomoLeaderboard(user_id=user_id)
                session.add(pomo_stats)
                session.commit()
                session.refresh(pomo_stats)
            
            # Update all leaderboard ZSETs
            periods = ["daily", "weekly", "monthly", "yearly"]
            scores = [pomo_stats.daily_pomo, pomo_stats.weekly_pomo, 
                     pomo_stats.monthly_pomo, pomo_stats.yearly_pomo]
            
            for period, score in zip(periods, scores):
                leaderboard_key = self._get_leaderboard_key(period)
                self.redis_client.client.zadd(leaderboard_key, {user_id: score})
                self.redis_client.client.expire(leaderboard_key, self.LEADERBOARD_TTL)
            
            # Cache user details
            user_details = {
                "user_id": user_id,
                "daily_pomo": pomo_stats.daily_pomo,
                "weekly_pomo": pomo_stats.weekly_pomo,
                "monthly_pomo": pomo_stats.monthly_pomo,
                "yearly_pomo": pomo_stats.yearly_pomo,
                "updated_at": pomo_stats.updated_at.isoformat() if pomo_stats.updated_at else None,
                "cached_at": datetime.now(UTC).isoformat()
            }
            
            user_details_key = self._get_user_details_key(user_id)
            self.redis_client.set_value(user_details_key, user_details, self.USER_DETAILS_TTL)
            
            session.close()
            logger.debug(f"Synced user {user_id} to Redis cache")
            return True
            
        except Exception as e:
            logger.error(f"Failed to sync user {user_id} to cache: {e}")
            return False
    
    def sync_all_users_to_cache(self) -> int:
        """
        Sync all users from PostgreSQL to Redis cache.
        
        Returns:
            int: Number of users successfully synced
        """
        try:
            session = SessionLocal()
            
            # Get all users from PomoLeaderboard
            all_users = session.query(PomoLeaderboard).all()
            
            synced_count = 0
            for user in all_users:
                if self.sync_user_to_cache(user.user_id):
                    synced_count += 1
            
            session.close()
            logger.info(f"Synced {synced_count}/{len(all_users)} users to Redis cache")
            return synced_count
            
        except Exception as e:
            logger.error(f"Failed to sync all users to cache: {e}")
            return 0
    
    def update_user_score(self, user_id: str, increment: int = 1) -> bool:
        """
        Update user's pomodoro count in both PostgreSQL and Redis cache.
        
        Args:
            user_id: User ID to update
            increment: Number of pomodoros to add (default 1)
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            session = SessionLocal()
            
            # Update PostgreSQL first
            pomo_stats = session.query(PomoLeaderboard).filter(
                PomoLeaderboard.user_id == user_id
            ).first()
            
            if not pomo_stats:
                # Create new entry
                pomo_stats = PomoLeaderboard(user_id=user_id)
                session.add(pomo_stats)
            
            # Update all time periods
            pomo_stats.daily_pomo += increment
            pomo_stats.weekly_pomo += increment
            pomo_stats.monthly_pomo += increment
            pomo_stats.yearly_pomo += increment
            pomo_stats.updated_at = datetime.now(UTC)
            
            session.commit()
            session.refresh(pomo_stats)
            
            # Update Redis cache
            periods = ["daily", "weekly", "monthly", "yearly"]
            scores = [pomo_stats.daily_pomo, pomo_stats.weekly_pomo,
                     pomo_stats.monthly_pomo, pomo_stats.yearly_pomo]
            
            for period, score in zip(periods, scores):
                leaderboard_key = self._get_leaderboard_key(period)
                self.redis_client.client.zadd(leaderboard_key, {user_id: score})
                self.redis_client.client.expire(leaderboard_key, self.LEADERBOARD_TTL)
            
            # Update user details cache
            user_details = {
                "user_id": user_id,
                "daily_pomo": pomo_stats.daily_pomo,
                "weekly_pomo": pomo_stats.weekly_pomo,
                "monthly_pomo": pomo_stats.monthly_pomo,
                "yearly_pomo": pomo_stats.yearly_pomo,
                "updated_at": pomo_stats.updated_at.isoformat(),
                "cached_at": datetime.now(UTC).isoformat()
            }
            
            user_details_key = self._get_user_details_key(user_id)
            self.redis_client.set_value(user_details_key, user_details, self.USER_DETAILS_TTL)
            
            session.close()
            logger.info(f"Updated user {user_id}: added {increment} pomodoros")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update user {user_id} score: {e}")
            session.rollback()
            return False
    
    def get_leaderboard(self, period: str, limit: int = 10) -> List[LeaderboardEntry]:
        """
        Get leaderboard for specified period from Redis cache.
        
        Args:
            period: Time period ("daily", "weekly", "monthly", "yearly")
            limit: Maximum number of entries to return
            
        Returns:
            List[LeaderboardEntry]: Sorted leaderboard entries
        """
        try:
            leaderboard_key = self._get_leaderboard_key(period)
            
            # Check if leaderboard exists in cache
            if not self.redis_client.client.exists(leaderboard_key):
                logger.info(f"Leaderboard {period} not in cache, syncing from database")
                self.sync_all_users_to_cache()
            
            # Get top users from ZSET (highest scores first)
            top_users = self.redis_client.client.zrevrange(
                leaderboard_key, 0, limit - 1, withscores=True
            )
            
            entries = []
            for rank, (user_id, score) in enumerate(top_users, 1):
                # Get user details from cache
                user_details = self.get_user_details(user_id)
                
                entry = LeaderboardEntry(
                    user_id=user_id,
                    score=int(score),
                    rank=rank,
                    daily_pomo=user_details.get("daily_pomo", 0),
                    weekly_pomo=user_details.get("weekly_pomo", 0),
                    monthly_pomo=user_details.get("monthly_pomo", 0),
                    yearly_pomo=user_details.get("yearly_pomo", 0)
                )
                entries.append(entry)
            
            logger.debug(f"Retrieved {len(entries)} entries for {period} leaderboard")
            return entries
            
        except Exception as e:
            logger.error(f"Failed to get {period} leaderboard: {e}")
            return []
    
    def get_user_details(self, user_id: str) -> Dict:
        """
        Get user details from cache or database.
        
        Args:
            user_id: User ID to get details for
            
        Returns:
            Dict: User details including pomodoro counts
        """
        try:
            # Try to get from cache first
            user_details_key = self._get_user_details_key(user_id)
            cached_details = self.redis_client.get_value(user_details_key)
            
            if cached_details:
                return cached_details
            
            # Not in cache, sync from database
            if self.sync_user_to_cache(user_id):
                return self.redis_client.get_value(user_details_key, {})
            
            # Fallback to empty details
            return {
                "user_id": user_id,
                "daily_pomo": 0,
                "weekly_pomo": 0,
                "monthly_pomo": 0,
                "yearly_pomo": 0,
                "updated_at": None,
                "cached_at": datetime.now(UTC).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get user details for {user_id}: {e}")
            return {}
    
    def get_user_rank(self, user_id: str, period: str) -> Optional[int]:
        """
        Get user's rank in specified leaderboard period.
        
        Args:
            user_id: User ID to get rank for
            period: Time period for leaderboard
            
        Returns:
            Optional[int]: User's rank (1-based) or None if not found
        """
        try:
            leaderboard_key = self._get_leaderboard_key(period)
            
            # Get user's rank (0-based, so add 1)
            rank = self.redis_client.client.zrevrank(leaderboard_key, user_id)
            
            return rank + 1 if rank is not None else None
            
        except Exception as e:
            logger.error(f"Failed to get user rank for {user_id} in {period}: {e}")
            return None
    
    def reset_period_leaderboard(self, period: str) -> bool:
        """
        Reset leaderboard for specified period.
        Updates both PostgreSQL and Redis cache.
        
        Args:
            period: Period to reset ("daily", "weekly", "monthly")
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            if period not in ["daily", "weekly", "monthly"]:
                raise ValueError(f"Cannot reset {period} leaderboard")
            
            session = SessionLocal()
            
            # Reset in PostgreSQL
            if period == "daily":
                session.query(PomoLeaderboard).update({PomoLeaderboard.daily_pomo: 0})
            elif period == "weekly":
                session.query(PomoLeaderboard).update({PomoLeaderboard.weekly_pomo: 0})
            elif period == "monthly":
                session.query(PomoLeaderboard).update({PomoLeaderboard.monthly_pomo: 0})
            
            session.commit()
            
            # Clear Redis cache for this period
            leaderboard_key = self._get_leaderboard_key(period)
            self.redis_client.client.delete(leaderboard_key)
            
            # Clear all user details cache to force refresh
            user_pattern = self.USER_DETAILS_KEY.format(user_id="*")
            user_keys = self.redis_client.client.keys(user_pattern)
            if user_keys:
                self.redis_client.client.delete(*user_keys)
            
            session.close()
            logger.info(f"Reset {period} leaderboard successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to reset {period} leaderboard: {e}")
            session.rollback()
            return False
    
    def clear_cache(self) -> bool:
        """
        Clear all leaderboard cache data.
        
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Clear all leaderboard ZSETs
            for period in self.LEADERBOARD_KEYS.values():
                self.redis_client.client.delete(period)
            
            # Clear all user details
            user_pattern = self.USER_DETAILS_KEY.format(user_id="*")
            user_keys = self.redis_client.client.keys(user_pattern)
            if user_keys:
                self.redis_client.client.delete(*user_keys)
            
            logger.info("Cleared all leaderboard cache data")
            return True
            
        except Exception as e:
            logger.error(f"Failed to clear cache: {e}")
            return False

# Global instance
redis_leaderboard_service = RedisLeaderboardService()
