"""
Shop endpoints for purchasing structures.
Handles purchasing transactions that affect both balance and inventory.
"""
import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from ..services.balance_service import get_balance_service, BalanceService
from ..services.inventory_service import get_inventory_service, InventoryService

# Configure logging
logger = logging.getLogger(__name__)

# Create the router
router = APIRouter(
    prefix="/api/shop",
    tags=["shop"],
    responses={404: {"description": "Not found"}},
)

# ------------------------------------------------------------------ #
# Pydantic Models for Shop endpoints
# ------------------------------------------------------------------ #

class PurchaseRequest(BaseModel):
    user_id: str
    structure_name: str
    price: int

class PurchaseResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    balance: Optional[dict] = None
    inventory: Optional[dict] = None

# ------------------------------------------------------------------ #
# Shop endpoints
# ------------------------------------------------------------------ #

@router.post("/purchase", response_model=PurchaseResponse)
async def purchase_structure(
    request: PurchaseRequest,
    balance_service: BalanceService = Depends(get_balance_service),
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """
    Purchase a structure - deducts balance and adds to inventory.
    """
    try:
        # Check if user has sufficient balance
        current_balance = balance_service.get_user_balance(request.user_id)
        if not current_balance:
            # Create new user with starting balance
            current_balance = balance_service.create_user_balance(request.user_id, 100)
        
        if current_balance["bank_value"] < request.price:
            return PurchaseResponse(
                success=False,
                message=f"Insufficient balance. Current: {current_balance['bank_value']}, Required: {request.price}"
            )
        
        # Deduct balance
        updated_balance = balance_service.update_user_balance(request.user_id, -request.price)
        
        # Add to inventory
        updated_inventory = inventory_service.add_inventory_item(
            request.user_id, 
            request.structure_name, 
            1
        )
        
        return PurchaseResponse(
            success=True,
            message=f"Successfully purchased {request.structure_name} for {request.price} coins",
            balance=updated_balance,
            inventory=updated_inventory
        )
        
    except ValueError as e:
        logger.warning(f"Purchase failed for user {request.user_id}: {e}")
        return PurchaseResponse(
            success=False,
            message=str(e)
        )
    except Exception as e:
        logger.error(f"Error processing purchase for user {request.user_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")