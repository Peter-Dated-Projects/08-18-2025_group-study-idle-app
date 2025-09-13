"""
API router for managing the periodic sync service between Redis and PostgreSQL.
Provides endpoints for administrators to control and monitor the sync process.
"""

from fastapi import APIRouter, HTTPException
from typing import Dict

from app.services.periodic_sync_service import periodic_sync_service
from app.services.background_task_manager import background_task_manager

router = APIRouter(prefix="/api/periodic-sync", tags=["Periodic Sync"])


@router.get("/status")
async def get_sync_status() -> Dict:
    """
    Get the current status of the periodic sync service.
    
    Returns:
        Dict with service status, last sync time, and next sync schedule
    """
    try:
        # Get both service and background task manager status
        service_status = periodic_sync_service.get_sync_status()
        task_status = background_task_manager.get_status()
        
        return {
            "success": True,
            "status": service_status,
            "background_task": {
                "running": task_status["periodic_sync_running"],
                "task_exists": task_status["task_exists"],
                "task_done": task_status["task_done"]
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get sync status: {str(e)}")


@router.post("/sync")
async def trigger_manual_sync() -> Dict:
    """
    Trigger a manual synchronization from Redis to PostgreSQL.
    
    Returns:
        Dict with sync statistics and results
    """
    try:
        if not periodic_sync_service.redis_client.ping():
            raise HTTPException(status_code=503, detail="Redis cache unavailable")
        
        stats = await periodic_sync_service.perform_sync()
        
        return {
            "success": True,
            "message": "Manual sync completed",
            "stats": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")


@router.post("/start")
async def start_sync_service() -> Dict:
    """
    Start the periodic sync service as a background task.
    
    Note: This starts the service within the FastAPI application.
    The service will continue running until explicitly stopped.
    """
    try:
        if background_task_manager.is_running:
            return {
                "success": True,
                "message": "Periodic sync service is already running"
            }
        
        # Start the service as a background task
        await background_task_manager.start_periodic_sync()
        
        return {
            "success": True,
            "message": "Periodic sync service started",
            "interval": "Every 1 hour"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start sync service: {str(e)}")


@router.post("/stop")
async def stop_sync_service() -> Dict:
    """
    Stop the periodic sync service.
    """
    try:
        if not background_task_manager.is_running:
            return {
                "success": True,
                "message": "Periodic sync service is not running"
            }
        
        await background_task_manager.stop_periodic_sync()
        
        return {
            "success": True,
            "message": "Periodic sync service stopped"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to stop sync service: {str(e)}")


@router.get("/health")
async def check_sync_health() -> Dict:
    """
    Comprehensive health check for the sync system.
    
    Returns:
        Dict with health status of all components
    """
    try:
        health = {
            "redis_connected": periodic_sync_service.redis_client.ping(),
            "service_running": periodic_sync_service.is_running,
            "last_sync": periodic_sync_service.last_sync_time.isoformat() if periodic_sync_service.last_sync_time else None
        }
        
        # Check PostgreSQL connection
        try:
            from app.models.database import SessionLocal
            session = SessionLocal()
            session.execute("SELECT 1")
            session.close()
            health["postgres_connected"] = True
        except Exception:
            health["postgres_connected"] = False
        
        # Determine overall health
        all_healthy = all([
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


@router.get("/metrics")
async def get_sync_metrics() -> Dict:
    """
    Get detailed metrics about the sync system.
    
    Returns:
        Dict with data counts and consistency metrics
    """
    try:
        from app.models.database import SessionLocal, PomoLeaderboard
        
        # Get PostgreSQL counts
        session = SessionLocal()
        try:
            postgres_count = session.query(PomoLeaderboard).count()
        finally:
            session.close()
        
        # Get Redis counts
        redis_counts = {}
        if periodic_sync_service.redis_client.ping():
            redis_client = periodic_sync_service.redis_client.client
            redis_counts = {
                "daily_leaderboard": redis_client.zcard("leaderboard:daily"),
                "weekly_leaderboard": redis_client.zcard("leaderboard:weekly"),
                "monthly_leaderboard": redis_client.zcard("leaderboard:monthly"),
                "yearly_leaderboard": redis_client.zcard("leaderboard:yearly")
            }
        else:
            redis_counts = {"error": "Redis not connected"}
        
        return {
            "success": True,
            "metrics": {
                "postgres_users": postgres_count,
                "redis_counts": redis_counts,
                "sync_service": periodic_sync_service.get_sync_status()
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get metrics: {str(e)}")
