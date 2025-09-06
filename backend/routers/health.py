"""
Health check and monitoring endpoints.
Provides liveness and readiness probes for the application.
"""
import logging
from datetime import datetime
from fastapi import APIRouter
from pydantic import BaseModel
from utils import ping_redis, test_db_connection

# Configure logging
logger = logging.getLogger(__name__)

# Create the router
router = APIRouter(
    tags=["health"],
    responses={404: {"description": "Not found"}},
)

# ------------------------------------------------------------------ #
# Pydantic Models for Health endpoints
# ------------------------------------------------------------------ #

class HealthResponse(BaseModel):
    ok: bool
    ts: str
    
class ReadinessResponse(BaseModel):
    ready: bool
    redis: bool
    database: bool


# ------------------------------------------------------------------ #
# Health endpoints
# ------------------------------------------------------------------ #

@router.get("/healthz", response_model=HealthResponse)
async def healthz():
    """Liveness probe."""
    return HealthResponse(
        ok=True, 
        ts=datetime.utcnow().isoformat()
    )


@router.get("/ready", response_model=ReadinessResponse)
async def ready():
    """Readiness probe. Return 200 when ready to accept traffic."""
    redis_status = ping_redis()
    db_status = test_db_connection()
    
    ready_status = redis_status and db_status
    
    logger.info(f"Readiness check - Redis: {redis_status}, DB: {db_status}, Ready: {ready_status}")
    
    return ReadinessResponse(
        ready=ready_status,
        redis=redis_status,
        database=db_status
    )
