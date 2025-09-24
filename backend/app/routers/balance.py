"""
User balance endpoints for managing account balances.
Handles retrieving and updating user account balances.
"""
import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from ..services.balance_service import get_balance_service, BalanceService

# Configure logging
logger = logging.getLogger(__name__)

# Create the router
router = APIRouter(
    prefix="/api/balance",
    tags=["balance"],
    responses={404: {"description": "Not found"}},
)

# ------------------------------------------------------------------ #
# Pydantic Models for Balance endpoints
# ------------------------------------------------------------------ #

class UserBalanceData(BaseModel):
    user_id: str
    bank_value: int
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class UpdateBalanceRequest(BaseModel):
    amount: int

class SetBalanceRequest(BaseModel):
    balance: int

class BalanceResponse(BaseModel):
    success: bool
    data: Optional[UserBalanceData] = None
    message: Optional[str] = None

# ------------------------------------------------------------------ #
# Balance endpoints
# ------------------------------------------------------------------ #

@router.get("/{user_id}", response_model=BalanceResponse)
async def get_user_balance(
    user_id: str,
    balance_service: BalanceService = Depends(get_balance_service)
):
    """
    Get user account balance.
    """
    try:
        balance_data = balance_service.get_user_balance(user_id)
        
        if balance_data:
            return BalanceResponse(
                success=True,
                data=UserBalanceData(**balance_data)
            )
        else:
            # Create new balance for new users
            empty_balance = balance_service.create_user_balance(user_id, 100)  # Start with 100 coins
            return BalanceResponse(
                success=True,
                data=UserBalanceData(**empty_balance)
            )
            
    except Exception as e:
        logger.error(f"Error getting user balance for {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/{user_id}/update", response_model=BalanceResponse)
async def update_user_balance(
    user_id: str,
    request: UpdateBalanceRequest,
    balance_service: BalanceService = Depends(get_balance_service)
):
    """
    Update user balance by adding/subtracting amount.
    """
    try:
        updated_balance = balance_service.update_user_balance(user_id, request.amount)
        
        return BalanceResponse(
            success=True,
            data=UserBalanceData(**updated_balance),
            message=f"Balance updated by {request.amount} coins"
        )
            
    except ValueError as e:
        logger.warning(f"Insufficient balance for user {user_id}: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating balance for {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/{user_id}/set", response_model=BalanceResponse)
async def set_user_balance(
    user_id: str,
    request: SetBalanceRequest,
    balance_service: BalanceService = Depends(get_balance_service)
):
    """
    Set user balance to specific amount.
    """
    try:
        updated_balance = balance_service.set_user_balance(user_id, request.balance)
        
        return BalanceResponse(
            success=True,
            data=UserBalanceData(**updated_balance),
            message=f"Balance set to {request.balance} coins"
        )
            
    except Exception as e:
        logger.error(f"Error setting balance for {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")