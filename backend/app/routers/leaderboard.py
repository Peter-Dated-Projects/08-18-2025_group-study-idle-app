"""
Pomodoro Leaderboard endpoints.
Handles pomodoro tracking, updating, and leaderboard functionality.
"""
import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, UTC

from ..models.database import get_db, PomoLeaderboard

# Configure logging
logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])

# ------------------------------------------------------------------ #
# Pydantic models for request/response
# ------------------------------------------------------------------ #

class PomoUpdateRequest(BaseModel):
    user_id: str
    duration: int  # Duration in minutes to add

class PomoResponse(BaseModel):
    user_id: str
    daily_pomo_duration: int
    weekly_pomo_duration: int
    monthly_pomo_duration: int
    yearly_pomo_duration: int
    updated_at: datetime

class PomoUpdateResponse(BaseModel):
    success: bool
    message: str
    stats: Optional[PomoResponse] = None

class LeaderboardEntry(BaseModel):
    user_id: str
    daily_pomo_duration: int
    weekly_pomo_duration: int
    monthly_pomo_duration: int
    yearly_pomo_duration: int

class LeaderboardResponse(BaseModel):
    success: bool
    period: str  # "daily", "weekly", "monthly", "yearly"
    entries: List[LeaderboardEntry]

# ------------------------------------------------------------------ #
# Helper functions
# ------------------------------------------------------------------ #

def get_or_create_pomo_stats(db: Session, user_id: str) -> PomoLeaderboard:
    """Get or create PomoLeaderboard entry for a user."""
    pomo_stats = db.query(PomoLeaderboard).filter(PomoLeaderboard.user_id == user_id).first()
    
    if not pomo_stats:
        pomo_stats = PomoLeaderboard(user_id=user_id)
        db.add(pomo_stats)
        db.commit()
        db.refresh(pomo_stats)
    
    return pomo_stats

# ------------------------------------------------------------------ #
# API endpoints
# ------------------------------------------------------------------ #

@router.post("/update", response_model=PomoUpdateResponse)
async def update_pomodoro_duration(request: PomoUpdateRequest, db: Session = Depends(get_db)):
    """
    Update pomodoro duration for a user.
    Adds the specified duration (in minutes) to all time periods (daily, weekly, monthly, yearly).
    """
    try:
        # Get or create pomodoro stats
        pomo_stats = get_or_create_pomo_stats(db, request.user_id)
        
        # Update all time period durations
        pomo_stats.daily_pomo_duration += request.duration
        pomo_stats.weekly_pomo_duration += request.duration
        pomo_stats.monthly_pomo_duration += request.duration
        pomo_stats.yearly_pomo_duration += request.duration
        pomo_stats.updated_at = datetime.now(UTC)
        
        db.commit()
        db.refresh(pomo_stats)
        
        response_stats = PomoResponse(
            user_id=pomo_stats.user_id,
            daily_pomo_duration=pomo_stats.daily_pomo_duration,
            weekly_pomo_duration=pomo_stats.weekly_pomo_duration,
            monthly_pomo_duration=pomo_stats.monthly_pomo_duration,
            yearly_pomo_duration=pomo_stats.yearly_pomo_duration,
            updated_at=pomo_stats.updated_at
        )
        
        return PomoUpdateResponse(
            success=True,
            message=f"Added {request.duration} minutes for user {request.user_id}",
            stats=response_stats
        )
        
    except Exception as e:
        logger.error(f"Error updating pomodoro count: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/user/{user_id}", response_model=PomoResponse)
async def get_user_pomodoro_stats(user_id: str, db: Session = Depends(get_db)):
    """Get pomodoro statistics for a specific user."""
    try:
        pomo_stats = get_or_create_pomo_stats(db, user_id)
        
        return PomoResponse(
            user_id=pomo_stats.user_id,
            daily_pomo_duration=pomo_stats.daily_pomo_duration,
            weekly_pomo_duration=pomo_stats.weekly_pomo_duration,
            monthly_pomo_duration=pomo_stats.monthly_pomo_duration,
            yearly_pomo_duration=pomo_stats.yearly_pomo_duration,
            updated_at=pomo_stats.updated_at
        )
        
    except Exception as e:
        logger.error(f"Error getting user pomodoro stats: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{period}", response_model=LeaderboardResponse)
async def get_leaderboard(period: str, limit: int = 10, db: Session = Depends(get_db)):
    """
    Get leaderboard for a specific time period.
    
    Args:
        period: "daily", "weekly", "monthly", or "yearly"
        limit: Maximum number of entries to return (default 10)
    """
    try:
        if period not in ["daily", "weekly", "monthly", "yearly"]:
            raise HTTPException(status_code=400, detail="Invalid period. Must be: daily, weekly, monthly, or yearly")
        
        # Query based on period
        if period == "daily":
            query = db.query(PomoLeaderboard).order_by(PomoLeaderboard.daily_pomo_duration.desc())
        elif period == "weekly":
            query = db.query(PomoLeaderboard).order_by(PomoLeaderboard.weekly_pomo_duration.desc())
        elif period == "monthly":
            query = db.query(PomoLeaderboard).order_by(PomoLeaderboard.monthly_pomo_duration.desc())
        else:  # yearly
            query = db.query(PomoLeaderboard).order_by(PomoLeaderboard.yearly_pomo_duration.desc())
        
        # Apply limit and execute
        pomo_entries = query.limit(limit).all()
        
        # Convert to response format
        entries = [
            LeaderboardEntry(
                user_id=entry.user_id,
                daily_pomo_duration=entry.daily_pomo_duration,
                weekly_pomo_duration=entry.weekly_pomo_duration,
                monthly_pomo_duration=entry.monthly_pomo_duration,
                yearly_pomo_duration=entry.yearly_pomo_duration
            )
            for entry in pomo_entries
        ]
        
        return LeaderboardResponse(
            success=True,
            period=period,
            entries=entries
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting leaderboard: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/reset/{period}")
async def reset_period_counts(period: str, db: Session = Depends(get_db)):
    """
    Reset pomodoro counts for a specific period across all users.
    This would typically be called by a scheduled job.
    
    Args:
        period: "daily", "weekly", or "monthly" (yearly reset not supported)
    """
    try:
        if period not in ["daily", "weekly", "monthly"]:
            raise HTTPException(status_code=400, detail="Invalid period. Must be: daily, weekly, or monthly")
        
        # Update all users
        if period == "daily":
            db.query(PomoLeaderboard).update({PomoLeaderboard.daily_pomo_duration: 0})
        elif period == "weekly":
            db.query(PomoLeaderboard).update({PomoLeaderboard.weekly_pomo_duration: 0})
        elif period == "monthly":
            db.query(PomoLeaderboard).update({PomoLeaderboard.monthly_pomo_duration: 0})
        
        db.commit()
        
        return {"success": True, "message": f"Reset {period} pomodoro counts for all users"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resetting {period} counts: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")
