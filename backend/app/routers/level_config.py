"""
User level config endpoints for managing world/land configurations.
Handles retrieving and updating user level configuration.
"""
import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional

from ..services.level_config_service import get_level_config_service, LevelConfigService

# Configure logging
logger = logging.getLogger(__name__)

# Create the router
router = APIRouter(
    prefix="/api/level-config",
    tags=["level-config"],
    responses={404: {"description": "Not found"}},
)

# ------------------------------------------------------------------ #
# Pydantic Models for Level Config endpoints
# ------------------------------------------------------------------ #

class UserLevelConfigData(BaseModel):
    user_id: str
    level_config: List[str] = Field(..., min_items=7, max_items=7, description="Array of 7 structure IDs or 'empty'")
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class UpdateLevelConfigRequest(BaseModel):
    level_config: List[str] = Field(..., min_items=7, max_items=7, description="Array of 7 structure IDs or 'empty'")

class UpdateSlotConfigRequest(BaseModel):
    slot_index: int = Field(..., ge=0, le=6, description="Slot index (0-6)")
    structure_id: str = Field(..., description="Structure ID or 'empty'")

class LevelConfigResponse(BaseModel):
    success: bool
    data: Optional[UserLevelConfigData] = None
    message: Optional[str] = None

class SlotConfigResponse(BaseModel):
    success: bool
    slot_config: Optional[str] = None
    message: Optional[str] = None

# ------------------------------------------------------------------ #
# Level Config endpoints
# ------------------------------------------------------------------ #

@router.get("/{user_id}", response_model=LevelConfigResponse)
async def get_user_level_config(
    user_id: str,
    level_config_service: LevelConfigService = Depends(get_level_config_service)
):
    """
    Get user level/world configuration.
    """
    try:
        config_data = level_config_service.get_user_level_config(user_id)
        
        if config_data:
            return LevelConfigResponse(
                success=True,
                data=UserLevelConfigData(**config_data)
            )
        else:
            # Create empty config for new users
            empty_config = level_config_service.create_user_level_config(user_id)
            return LevelConfigResponse(
                success=True,
                data=UserLevelConfigData(**empty_config)
            )
            
    except Exception as e:
        logger.error(f"Error getting user level config for {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/{user_id}", response_model=LevelConfigResponse)
async def update_user_level_config(
    user_id: str,
    request: UpdateLevelConfigRequest,
    level_config_service: LevelConfigService = Depends(get_level_config_service)
):
    """
    Update user level/world configuration.
    """
    try:
        updated_config = level_config_service.update_user_level_config(
            user_id, request.level_config
        )
        
        return LevelConfigResponse(
            success=True,
            data=UserLevelConfigData(**updated_config)
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating user level config for {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.patch("/{user_id}/slot", response_model=LevelConfigResponse)
async def update_slot_config(
    user_id: str,
    request: UpdateSlotConfigRequest,
    level_config_service: LevelConfigService = Depends(get_level_config_service)
):
    """
    Update a specific slot in the user's level configuration.
    """
    try:
        updated_config = level_config_service.update_slot_config(
            user_id, request.slot_index, request.structure_id
        )
        
        return LevelConfigResponse(
            success=True,
            data=UserLevelConfigData(**updated_config)
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating slot config for {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{user_id}/slot/{slot_index}", response_model=SlotConfigResponse)
async def get_slot_config(
    user_id: str,
    slot_index: int,
    level_config_service: LevelConfigService = Depends(get_level_config_service)
):
    """
    Get the configuration for a specific slot.
    """
    try:
        if not (0 <= slot_index <= 6):
            raise HTTPException(status_code=400, detail="Slot index must be between 0 and 6")
            
        slot_config = level_config_service.get_slot_config(user_id, slot_index)
        
        return SlotConfigResponse(
            success=True,
            slot_config=slot_config
        )
        
    except Exception as e:
        logger.error(f"Error getting slot config for {user_id}, slot {slot_index}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/{user_id}/reset", response_model=LevelConfigResponse)
async def reset_user_level_config(
    user_id: str,
    level_config_service: LevelConfigService = Depends(get_level_config_service)
):
    """
    Reset user level/world configuration to all empty slots.
    """
    try:
        reset_config = level_config_service.reset_user_level_config(user_id)
        
        return LevelConfigResponse(
            success=True,
            data=UserLevelConfigData(**reset_config)
        )
        
    except Exception as e:
        logger.error(f"Error resetting user level config for {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")