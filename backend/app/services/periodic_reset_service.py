"""
Periodic reset service for resetting leaderboard columns at specific intervals.

Handles:
- Daily reset: Every day at 1 AM EST
- Weekly reset: Every Sunday at 1 AM EST  
- Monthly reset: Every 1st of the month at 1 AM EST
- Yearly reset: Every January 1st at 1 AM EST
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict
from zoneinfo import ZoneInfo

from app.models.database import SessionLocal, PomoLeaderboard
from app.utils.redis_utils import RedisClient

logger = logging.getLogger(__name__)

# EST timezone
EST = ZoneInfo("America/New_York")


class PeriodicResetService:
    """Service for periodic reset of leaderboard columns."""
    
    def __init__(self):
        """Initialize the reset service."""
        self.redis_client = RedisClient()
        self.is_running = False
        self.reset_task = None
        self.last_resets = {
            "daily": None,
            "weekly": None,
            "monthly": None,
            "yearly": None
        }
        
    async def start_periodic_resets(self):
        """Start the periodic reset service."""
        logger.info("Starting periodic reset service")
        self.is_running = True
        
        while self.is_running:
            try:
                await self.check_and_perform_resets()
                
                # Check every hour for reset times
                await asyncio.sleep(3600)  # 1 hour
                
            except Exception as e:
                logger.error(f"Error in periodic reset service: {e}")
                # Wait 5 minutes before retrying on error
                await asyncio.sleep(300)
    
    def stop_periodic_resets(self):
        """Stop the periodic reset service."""
        logger.info("Stopping periodic reset service")
        self.is_running = False
    
    async def check_and_perform_resets(self):
        """Check if any resets are due and perform them."""
        now_est = datetime.now(EST)
        
        # Check each reset type
        if self._is_daily_reset_due(now_est):
            await self.perform_daily_reset()
            
        if self._is_weekly_reset_due(now_est):
            await self.perform_weekly_reset()
            
        if self._is_monthly_reset_due(now_est):
            await self.perform_monthly_reset()
            
        if self._is_yearly_reset_due(now_est):
            await self.perform_yearly_reset()
    
    def _is_daily_reset_due(self, now_est: datetime) -> bool:
        """Check if daily reset is due (every day at 1 AM EST)."""
        # Daily reset at 1 AM
        if now_est.hour != 1:
            return False
            
        # Check if we already reset today
        if self.last_resets["daily"]:
            last_reset = self.last_resets["daily"]
            if last_reset.date() == now_est.date():
                return False
        
        return True
    
    def _is_weekly_reset_due(self, now_est: datetime) -> bool:
        """Check if weekly reset is due (every Sunday at 1 AM EST)."""
        # Weekly reset on Sunday (weekday 6) at 1 AM
        if now_est.weekday() != 6 or now_est.hour != 1:
            return False
            
        # Check if we already reset this week
        if self.last_resets["weekly"]:
            last_reset = self.last_resets["weekly"]
            # Get the start of this week (Monday)
            week_start = now_est - timedelta(days=now_est.weekday() + 1)
            if last_reset >= week_start:
                return False
        
        return True
    
    def _is_monthly_reset_due(self, now_est: datetime) -> bool:
        """Check if monthly reset is due (every 1st of month at 1 AM EST)."""
        # Monthly reset on 1st day at 1 AM
        if now_est.day != 1 or now_est.hour != 1:
            return False
            
        # Check if we already reset this month
        if self.last_resets["monthly"]:
            last_reset = self.last_resets["monthly"]
            if (last_reset.year == now_est.year and 
                last_reset.month == now_est.month):
                return False
        
        return True
    
    def _is_yearly_reset_due(self, now_est: datetime) -> bool:
        """Check if yearly reset is due (every January 1st at 1 AM EST)."""
        # Yearly reset on January 1st at 1 AM
        if now_est.month != 1 or now_est.day != 1 or now_est.hour != 1:
            return False
            
        # Check if we already reset this year
        if self.last_resets["yearly"]:
            last_reset = self.last_resets["yearly"]
            if last_reset.year == now_est.year:
                return False
        
        return True
    
    async def perform_daily_reset(self) -> Dict:
        """Reset daily_pomo column for all users."""
        logger.info("Performing daily reset...")
        
        session = SessionLocal()
        stats = {"users_reset": 0, "errors": 0}
        
        try:
            # Reset PostgreSQL
            result = session.query(PomoLeaderboard).update({
                PomoLeaderboard.daily_pomo: 0
            })
            session.commit()
            stats["users_reset"] = result
            
            # Reset Redis daily leaderboard
            if self.redis_client.ping():
                self.redis_client.client.delete("leaderboard:daily")
                logger.info("Cleared Redis daily leaderboard")
            
            self.last_resets["daily"] = datetime.now(EST)
            logger.info(f"Daily reset completed: {stats['users_reset']} users reset")
            
        except Exception as e:
            logger.error(f"Daily reset failed: {e}")
            session.rollback()
            stats["errors"] += 1
        finally:
            session.close()
            
        return stats
    
    async def perform_weekly_reset(self) -> Dict:
        """Reset weekly_pomo column for all users."""
        logger.info("Performing weekly reset...")
        
        session = SessionLocal()
        stats = {"users_reset": 0, "errors": 0}
        
        try:
            # Reset PostgreSQL
            result = session.query(PomoLeaderboard).update({
                PomoLeaderboard.weekly_pomo: 0
            })
            session.commit()
            stats["users_reset"] = result
            
            # Reset Redis weekly leaderboard
            if self.redis_client.ping():
                self.redis_client.client.delete("leaderboard:weekly")
                logger.info("Cleared Redis weekly leaderboard")
            
            self.last_resets["weekly"] = datetime.now(EST)
            logger.info(f"Weekly reset completed: {stats['users_reset']} users reset")
            
        except Exception as e:
            logger.error(f"Weekly reset failed: {e}")
            session.rollback()
            stats["errors"] += 1
        finally:
            session.close()
            
        return stats
    
    async def perform_monthly_reset(self) -> Dict:
        """Reset monthly_pomo column for all users."""
        logger.info("Performing monthly reset...")
        
        session = SessionLocal()
        stats = {"users_reset": 0, "errors": 0}
        
        try:
            # Reset PostgreSQL
            result = session.query(PomoLeaderboard).update({
                PomoLeaderboard.monthly_pomo: 0
            })
            session.commit()
            stats["users_reset"] = result
            
            # Reset Redis monthly leaderboard
            if self.redis_client.ping():
                self.redis_client.client.delete("leaderboard:monthly")
                logger.info("Cleared Redis monthly leaderboard")
            
            self.last_resets["monthly"] = datetime.now(EST)
            logger.info(f"Monthly reset completed: {stats['users_reset']} users reset")
            
        except Exception as e:
            logger.error(f"Monthly reset failed: {e}")
            session.rollback()
            stats["errors"] += 1
        finally:
            session.close()
            
        return stats
    
    async def perform_yearly_reset(self) -> Dict:
        """Reset yearly_pomo column for all users."""
        logger.info("Performing yearly reset...")
        
        session = SessionLocal()
        stats = {"users_reset": 0, "errors": 0}
        
        try:
            # Reset PostgreSQL
            result = session.query(PomoLeaderboard).update({
                PomoLeaderboard.yearly_pomo: 0
            })
            session.commit()
            stats["users_reset"] = result
            
            # Reset Redis yearly leaderboard
            if self.redis_client.ping():
                self.redis_client.client.delete("leaderboard:yearly")
                logger.info("Cleared Redis yearly leaderboard")
            
            self.last_resets["yearly"] = datetime.now(EST)
            logger.info(f"Yearly reset completed: {stats['users_reset']} users reset")
            
        except Exception as e:
            logger.error(f"Yearly reset failed: {e}")
            session.rollback()
            stats["errors"] += 1
        finally:
            session.close()
            
        return stats
    
    async def manual_reset(self, period: str) -> Dict:
        """Manually trigger a reset for a specific period."""
        logger.info(f"Manual {period} reset triggered")
        
        if period == "daily":
            return await self.perform_daily_reset()
        elif period == "weekly":
            return await self.perform_weekly_reset()
        elif period == "monthly":
            return await self.perform_monthly_reset()
        elif period == "yearly":
            return await self.perform_yearly_reset()
        else:
            raise ValueError(f"Invalid reset period: {period}")
    
    def get_reset_status(self) -> Dict:
        """Get the status of the reset service."""
        now_est = datetime.now(EST)
        
        return {
            "is_running": self.is_running,
            "current_time_est": now_est.isoformat(),
            "last_resets": {
                period: reset_time.isoformat() if reset_time else None
                for period, reset_time in self.last_resets.items()
            },
            "next_resets": {
                "daily": self._get_next_daily_reset(now_est).isoformat(),
                "weekly": self._get_next_weekly_reset(now_est).isoformat(),
                "monthly": self._get_next_monthly_reset(now_est).isoformat(),
                "yearly": self._get_next_yearly_reset(now_est).isoformat(),
            }
        }
    
    def _get_next_daily_reset(self, now_est: datetime) -> datetime:
        """Get the next daily reset time."""
        # Next 1 AM
        next_reset = now_est.replace(hour=1, minute=0, second=0, microsecond=0)
        if now_est >= next_reset:
            next_reset += timedelta(days=1)
        return next_reset
    
    def _get_next_weekly_reset(self, now_est: datetime) -> datetime:
        """Get the next weekly reset time (next Sunday 1 AM)."""
        # Days until next Sunday (0=Monday, 6=Sunday)
        days_until_sunday = (6 - now_est.weekday()) % 7
        if days_until_sunday == 0 and now_est.hour >= 1:
            days_until_sunday = 7  # Next Sunday if today is Sunday and past 1 AM
        
        next_sunday = now_est + timedelta(days=days_until_sunday)
        return next_sunday.replace(hour=1, minute=0, second=0, microsecond=0)
    
    def _get_next_monthly_reset(self, now_est: datetime) -> datetime:
        """Get the next monthly reset time (next 1st of month 1 AM)."""
        if now_est.day == 1 and now_est.hour < 1:
            # Today is 1st and before 1 AM
            return now_est.replace(hour=1, minute=0, second=0, microsecond=0)
        else:
            # Next month
            if now_est.month == 12:
                next_month = now_est.replace(year=now_est.year + 1, month=1, day=1)
            else:
                next_month = now_est.replace(month=now_est.month + 1, day=1)
            return next_month.replace(hour=1, minute=0, second=0, microsecond=0)
    
    def _get_next_yearly_reset(self, now_est: datetime) -> datetime:
        """Get the next yearly reset time (next January 1st 1 AM)."""
        if now_est.month == 1 and now_est.day == 1 and now_est.hour < 1:
            # Today is Jan 1st and before 1 AM
            return now_est.replace(hour=1, minute=0, second=0, microsecond=0)
        else:
            # Next year
            return now_est.replace(year=now_est.year + 1, month=1, day=1, hour=1, minute=0, second=0, microsecond=0)


# Global service instance
periodic_reset_service = PeriodicResetService()
