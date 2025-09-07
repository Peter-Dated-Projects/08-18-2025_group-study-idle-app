import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

# Import routers
from routers import health, websockets

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ------------------------------------------------------------------ #
# FastAPI app setup
# ------------------------------------------------------------------ #

def create_app() -> FastAPI:
    app = FastAPI(
        title="Group Study Idle App Backend",
        description="Backend API for the group study idle game",
        version="1.0.0"
    )

    # Use Redis-based lobby system
    logger.info("Using Redis-based lobby system")
    from routers import lobbies
    app.include_router(lobbies.router)
    
    # Test Redis connectivity
    from utils.redis_json_utils import ping_redis_json
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
            from utils.redis_json_utils import ping_redis_json
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
    
    # Local dev entrypoint: `python backend/main.py`
    port = int(os.environ.get("PORT", "8080"))  # Cloud Run also sets PORT
    debug = os.environ.get("DEBUG", "true").lower() == "true"
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=debug,
        log_level="info"
    )
