import os
import logging
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

# Load environment variables from config/.env
config_dir = Path(__file__).parent.parent / "config"
env_file = config_dir / ".env"
load_dotenv(env_file)

# Import routers - handle both direct execution and module import
try:
    from .routers import health, websockets, lobbies, friends, groups, leaderboard, redis_leaderboard, group_leaderboard, periodic_sync, periodic_reset, user_stats
    from .utils.redis_json_utils import ping_redis_json
    from .models.database import create_tables
except ImportError:
    # Direct execution from app directory
    from routers import health, websockets, lobbies, friends, groups, leaderboard, redis_leaderboard, group_leaderboard, periodic_sync, periodic_reset, user_stats
    from utils.redis_json_utils import ping_redis_json
    from models.database import create_tables

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ------------------------------------------------------------------ #
# FastAPI app setup
# ------------------------------------------------------------------ #

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan (startup and shutdown)."""
    # Startup
    logger.info("Application starting up...")
    
    try:
        logger.info("Checking and creating database tables...")
        create_tables()
        logger.info("Database tables are ready")
    except Exception as e:
        logger.error(f"Failed to create database tables: {e}")
        # Don't fail startup - let the app start but log the error
    
    # Start periodic sync background task
    try:
        from app.services.background_task_manager import background_task_manager
        await background_task_manager.start_periodic_sync()
        logger.info("Periodic sync background task started")
    except Exception as e:
        logger.error(f"Failed to start periodic sync: {e}")
        # Don't fail startup - the app can run without periodic sync
    
    logger.info("Application startup complete")
    
    yield  # Application is running
    
    # Shutdown
    logger.info("Application shutting down...")
    
    try:
        from app.services.background_task_manager import background_task_manager
        await background_task_manager.stop_periodic_sync()
        logger.info("Background tasks stopped")
    except Exception as e:
        logger.error(f"Error stopping background tasks: {e}")
    
    logger.info("Application shutdown complete")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Group Study Idle App Backend",
        description="Backend API for the group study idle game",
        version="1.0.0",
        lifespan=lifespan
    )
            
    # Use Redis-based lobby system
    logger.info("Using Redis-based lobby system")
    app.include_router(lobbies.router)
    
    # Test Redis connectivity
    if ping_redis_json():
        logger.info("Redis connection successful")
    else:
        logger.warning("Redis connection failed - lobby system may not work properly")

    # CORS: configure via env in local/prod. Comma-separated origins, default to '*'.
    cors_origins = os.getenv("CORS_ORIGINS", "*")
    origins = [o.strip() for o in cors_origins.split(",") if o.strip()] if cors_origins != "*" else ["*"]
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include other routers
    app.include_router(health.router)
    app.include_router(websockets.router)
    app.include_router(friends.router)
    app.include_router(groups.router)
    app.include_router(user_stats.router)
    app.include_router(leaderboard.router)
    app.include_router(redis_leaderboard.router)  # Redis-cached leaderboard for frontend
    app.include_router(group_leaderboard.router)  # Group-specific leaderboards via Redis
    app.include_router(periodic_sync.router)  # Periodic sync management
    app.include_router(periodic_reset.router)  # Periodic reset management

    @app.exception_handler(Exception)
    async def global_exception_handler(request, exc):
        """Global exception handler."""
        logger.error(f"Unhandled exception: {exc}")
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"}
        )

    @app.get("/api/system/info")
    async def system_info():
        """Get system information including which lobby backend is in use."""
        info = {
            "lobby_backend": "redis",
            "version": "1.0.0",
            "redis_available": False
        }
        
        # Test Redis availability
        try:
            from .utils.redis_json_utils import ping_redis_json
            info["redis_available"] = ping_redis_json()
        except Exception as e:
            logger.error(f"Redis availability check failed: {e}")
        
        return info

    return app


# ------------------------------------------------------------------ #

# Export `app` for production servers (uvicorn/gunicorn) and Cloud Run
app = create_app()


if __name__ == "__main__":
    import uvicorn
    
    # Local dev entrypoint
    port = int(os.environ.get("PORT", "8080"))  # Cloud Run also sets PORT
    debug = os.environ.get("DEBUG", "true").lower() == "true"
    
    uvicorn.run(
        app,  # Pass the app instance directly
        host="0.0.0.0",
        port=port,
        reload=debug,
        log_level="info"
    )
