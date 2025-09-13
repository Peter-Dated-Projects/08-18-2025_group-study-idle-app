"""
API router for managing the periodic reset service.
Provides endpoints for administrators to control and monitor leaderboard resets.
"""

from fastapi import APIRouter, HTTPException
from typing import Dict

from app.services.periodic_reset_service import periodic_reset_service

router = APIRouter(prefix="/api/periodic-reset", tags=["Periodic Reset"])


@router.get("/status")
async def get_reset_status() -> Dict:
    """
    Get the current status of the periodic reset service.
    
    Returns:
        Dict with reset service status, last reset times, and next reset schedule
    """
    try:
        status = periodic_reset_service.get_reset_status()
        return {
            "success": True,
            "status": status
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get reset status: {str(e)}")


@router.post("/manual/{period}")
async def trigger_manual_reset(period: str) -> Dict:
    """
    Trigger a manual reset for a specific period.
    
    Args:
        period: One of 'daily', 'weekly', 'monthly', 'yearly'
    
    Returns:
        Dict with reset results and statistics
    """
    try:
        if period not in ["daily", "weekly", "monthly", "yearly"]:
            raise HTTPException(
                status_code=400, 
                detail="Invalid period. Must be one of: daily, weekly, monthly, yearly"
            )
        
        stats = await periodic_reset_service.manual_reset(period)
        
        return {
            "success": True,
            "message": f"Manual {period} reset completed",
            "period": period,
            "stats": stats
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reset failed: {str(e)}")


@router.get("/next-resets")
async def get_next_reset_times() -> Dict:
    """
    Get the scheduled times for the next resets.
    
    Returns:
        Dict with next reset times for all periods
    """
    try:
        status = periodic_reset_service.get_reset_status()
        
        return {
            "success": True,
            "current_time_est": status["current_time_est"],
            "next_resets": status["next_resets"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get next reset times: {str(e)}")


@router.get("/last-resets")
async def get_last_reset_times() -> Dict:
    """
    Get the times when resets were last performed.
    
    Returns:
        Dict with last reset times for all periods
    """
    try:
        status = periodic_reset_service.get_reset_status()
        
        return {
            "success": True,
            "last_resets": status["last_resets"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get last reset times: {str(e)}")


@router.get("/health")
async def check_reset_health() -> Dict:
    """
    Comprehensive health check for the reset system.
    
    Returns:
        Dict with health status of all components
    """
    try:
        reset_status = periodic_reset_service.get_reset_status()
        
        health = {
            "reset_service_running": reset_status["is_running"],
            "redis_connected": periodic_reset_service.redis_client.ping(),
            "current_time_est": reset_status["current_time_est"]
        }
        
        # Check PostgreSQL connection
        try:
            from app.models.database import SessionLocal
            from sqlalchemy import text
            session = SessionLocal()
            session.execute(text("SELECT 1"))
            session.close()
            health["postgres_connected"] = True
        except Exception:
            health["postgres_connected"] = False
        
        # Determine overall health
        all_healthy = all([
            health["reset_service_running"],
            health["redis_connected"],
            health["postgres_connected"]
        ])
        
        return {
            "success": all_healthy,
            "health": health,
            "status": "healthy" if all_healthy else "degraded"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")


@router.get("/schedule")
async def get_reset_schedule() -> Dict:
    """
    Get the complete reset schedule information.
    
    Returns:
        Dict with reset schedule details and timezone info
    """
    try:
        return {
            "success": True,
            "schedule": {
                "timezone": "America/New_York (EST)",
                "daily": {
                    "frequency": "Every day",
                    "time": "1:00 AM EST",
                    "description": "Resets daily_pomo column to 0"
                },
                "weekly": {
                    "frequency": "Every Sunday", 
                    "time": "1:00 AM EST",
                    "description": "Resets weekly_pomo column to 0"
                },
                "monthly": {
                    "frequency": "1st of every month",
                    "time": "1:00 AM EST", 
                    "description": "Resets monthly_pomo column to 0"
                },
                "yearly": {
                    "frequency": "January 1st",
                    "time": "1:00 AM EST",
                    "description": "Resets yearly_pomo column to 0"
                }
            },
            "notes": [
                "All times are in Eastern Standard Time (EST)",
                "Resets affect both PostgreSQL database and Redis cache",
                "Manual resets can be triggered via API endpoints",
                "Service automatically handles timezone changes (EST/EDT)"
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get schedule: {str(e)}")
