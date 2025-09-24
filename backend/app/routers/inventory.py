"""
User inventory endpoints for managing structure inventory.
Handles retrieving and updating user structure inventory.
"""
import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
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

class UserInventoryData(BaseModel):
    user_id: str
    structure_inventory: List[StructureInventoryItem]
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class AddInventoryItemRequest(BaseModel):
    structure_name: str
    count: int

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