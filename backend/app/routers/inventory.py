"""
User inventory endpoints for managing structure inventory.
Handles retrieving and updating user structure inventory.
"""
import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional

from ..services.inventory_service import get_inventory_service, InventoryService

# Configure logging
logger = logging.getLogger(__name__)

# Create the router
router = APIRouter(
    prefix="/api/inventory",
    tags=["inventory"],
    responses={404: {"description": "Not found"}},
)

# ------------------------------------------------------------------ #
# Pydantic Models for Inventory endpoints
# ------------------------------------------------------------------ #

class StructureInventoryItem(BaseModel):
    structure_name: str
    count: int
    currently_in_use: int = 0

class UserInventoryData(BaseModel):
    user_id: str
    structure_inventory: List[StructureInventoryItem]
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class AddInventoryItemRequest(BaseModel):
    structure_name: str
    count: int

class UpdateUsageRequest(BaseModel):
    structure_name: str
    currently_in_use: int

class BulkUpdateInventoryRequest(BaseModel):
    inventory_updates: List[StructureInventoryItem] = Field(..., description="Complete inventory data with updates")

class UsageResponse(BaseModel):
    success: bool
    currently_in_use: Optional[int] = None
    available: Optional[int] = None
    message: Optional[str] = None

class InventoryResponse(BaseModel):
    success: bool
    data: Optional[UserInventoryData] = None
    message: Optional[str] = None

# ------------------------------------------------------------------ #
# Inventory endpoints
# ------------------------------------------------------------------ #

@router.get("/{user_id}", response_model=InventoryResponse)
async def get_user_inventory(
    user_id: str,
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """
    Get user structure inventory.
    """
    try:
        inventory_data = inventory_service.get_user_inventory(user_id)
        
        if inventory_data:
            return InventoryResponse(
                success=True,
                data=UserInventoryData(**inventory_data)
            )
        else:
            # Create empty inventory for new users
            empty_inventory = inventory_service.create_user_inventory(user_id)
            return InventoryResponse(
                success=True,
                data=UserInventoryData(**empty_inventory)
            )
            
    except Exception as e:
        logger.error(f"Error getting user inventory for {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/{user_id}/add", response_model=InventoryResponse)
async def add_inventory_item(
    user_id: str,
    request: AddInventoryItemRequest,
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """
    Add or update an item in user's structure inventory.
    """
    try:
        updated_inventory = inventory_service.add_inventory_item(
            user_id, 
            request.structure_name, 
            request.count
        )
        
        return InventoryResponse(
            success=True,
            data=UserInventoryData(**updated_inventory),
            message=f"Added {request.count} {request.structure_name}(s) to inventory"
        )
            
    except Exception as e:
        logger.error(f"Error adding inventory item for {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/{user_id}/remove", response_model=InventoryResponse)
async def remove_inventory_item(
    user_id: str,
    request: AddInventoryItemRequest,
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """
    Remove an item from user's structure inventory.
    """
    try:
        updated_inventory = inventory_service.remove_inventory_item(
            user_id, 
            request.structure_name, 
            request.count
        )
        
        return InventoryResponse(
            success=True,
            data=UserInventoryData(**updated_inventory),
            message=f"Removed {request.count} {request.structure_name}(s) from inventory"
        )
            
    except Exception as e:
        logger.error(f"Error removing inventory item for {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# ------------------------------------------------------------------ #
# Structure Usage endpoints
# ------------------------------------------------------------------ #

@router.patch("/{user_id}/usage", response_model=InventoryResponse)
async def update_structure_usage(
    user_id: str,
    request: UpdateUsageRequest,
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """
    Update the currently_in_use count for a specific structure.
    """

    logger.info(f"Updating structure usage for user_id: {user_id}, structure_name: {request.structure_name}, currently_in_use: {request.currently_in_use}")
    try:
        updated_inventory = inventory_service.update_structure_usage(
            user_id, 
            request.structure_name, 
            request.currently_in_use
        )
        
        return InventoryResponse(
            success=True,
            data=UserInventoryData(**updated_inventory),
            message=f"Updated usage for {request.structure_name} to {request.currently_in_use}"
        )
            
    except ValueError as e:
        logger.error(f"Validation error updating structure usage for {user_id}: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating structure usage for {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{user_id}/usage/{structure_name}", response_model=UsageResponse)
async def get_structure_usage(
    user_id: str,
    structure_name: str,
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """
    Get the currently_in_use count for a specific structure.
    """
    try:
        usage_count = inventory_service.get_structure_usage(user_id, structure_name)
        
        return UsageResponse(
            success=True,
            currently_in_use=usage_count,
            message=f"Usage for {structure_name}: {usage_count}"
        )
            
    except Exception as e:
        logger.error(f"Error getting structure usage for {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{user_id}/available/{structure_name}", response_model=UsageResponse)
async def get_available_structures(
    user_id: str,
    structure_name: str,
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """
    Get the number of available (not in use) structures.
    """
    try:
        available_count = inventory_service.get_available_structures(user_id, structure_name)
        
        return UsageResponse(
            success=True,
            available=available_count,
            message=f"Available {structure_name}: {available_count}"
        )
            
    except Exception as e:
        logger.error(f"Error getting available structures for {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# ------------------------------------------------------------------ #
# Bulk Update endpoints
# ------------------------------------------------------------------ #

@router.put("/{user_id}/bulk", response_model=InventoryResponse)
async def bulk_update_inventory(
    user_id: str,
    request: BulkUpdateInventoryRequest,
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """
    Bulk update user's entire structure inventory.
    """
    try:
        updated_inventory = inventory_service.bulk_update_inventory(
            user_id, 
            request.inventory_updates
        )
        
        return InventoryResponse(
            success=True,
            data=UserInventoryData(**updated_inventory),
            message="Bulk inventory update completed successfully"
        )
            
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error bulk updating inventory for {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")