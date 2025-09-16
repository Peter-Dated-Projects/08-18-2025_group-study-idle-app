"""
Pomo Bank API endpoints for currency system.
Handles balance queries, updates, and account management.
"""

import logging
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional

from ..auth_utils import require_authentication
from ..services.pomo_bank_service import PomoBankService

# Configure logging
logger = logging.getLogger(__name__)

# Create the router
router = APIRouter(
    prefix="/api/pomo-bank",
    tags=["pomo-bank"],
    responses={404: {"description": "Not found"}},
)

# ------------------------------------------------------------------ #
# Pydantic Models for Pomo Bank endpoints
# ------------------------------------------------------------------ #

class BalanceResponse(BaseModel):
    success: bool
    user_id: str
    balance: int
    message: str = ""

class UpdateBalanceRequest(BaseModel):
    amount: int
    operation: str = "add"  # "add", "subtract", or "set"

class UpdateBalanceResponse(BaseModel):
    success: bool
    user_id: str
    old_balance: int
    new_balance: int
    operation: str
    amount: int
    message: str = ""

class PomoEarningsRequest(BaseModel):
    minutes_completed: int
    was_skipped: bool = False

class PomoEarningsResponse(BaseModel):
    success: bool
    user_id: str
    minutes_completed: int
    was_skipped: bool
    earnings: int
    new_balance: int
    message: str = ""

class AccountInfoResponse(BaseModel):
    success: bool
    user_id: str
    balance: int
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    exists: bool
    message: str = ""

# ------------------------------------------------------------------ #
# Pomo Bank Endpoints
# ------------------------------------------------------------------ #

@router.get("/balance", response_model=BalanceResponse)
async def get_balance(request: Request):
    """Get current user's pomo bank balance."""
    try:
        # Require authentication and get user ID
        user_id = require_authentication(request)
        
        # Get balance from service
        balance = await PomoBankService.get_user_balance(user_id)
        
        logger.info(f"Retrieved balance for user {user_id}: {balance}")
        
        return BalanceResponse(
            success=True,
            user_id=user_id,
            balance=balance,
            message="Balance retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting balance: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve balance")

@router.get("/balance/{user_id}", response_model=BalanceResponse)
async def get_user_balance(request: Request, user_id: str):
    """Get specific user's pomo bank balance (admin endpoint)."""
    try:
        # Require authentication (could add admin check here later)
        current_user_id = require_authentication(request)
        
        # For now, users can only check their own balance
        if current_user_id != user_id:
            raise HTTPException(status_code=403, detail="Cannot access other user's balance")
        
        # Get balance from service
        balance = await PomoBankService.get_user_balance(user_id)
        
        logger.info(f"Retrieved balance for user {user_id}: {balance}")
        
        return BalanceResponse(
            success=True,
            user_id=user_id,
            balance=balance,
            message="Balance retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting balance for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve balance")

@router.post("/update", response_model=UpdateBalanceResponse)
async def update_balance(request: Request, update_request: UpdateBalanceRequest):
    """Update current user's pomo bank balance."""
    try:
        # Require authentication and get user ID
        user_id = require_authentication(request)
        
        # Validate operation
        if update_request.operation not in ["add", "subtract", "set"]:
            raise HTTPException(
                status_code=400, 
                detail="Invalid operation. Must be 'add', 'subtract', or 'set'"
            )
        
        # Validate amount
        if update_request.amount < 0:
            raise HTTPException(status_code=400, detail="Amount cannot be negative")
        
        # Get current balance
        old_balance = await PomoBankService.get_user_balance(user_id)
        
        # Update balance
        reason = f"Manual {update_request.operation} operation ({update_request.amount} coins)"
        new_balance = await PomoBankService.update_user_balance(
            user_id, 
            update_request.amount, 
            update_request.operation,
            reason
        )
        
        logger.info(f"Updated balance for user {user_id}: {old_balance} -> {new_balance}")
        
        return UpdateBalanceResponse(
            success=True,
            user_id=user_id,
            old_balance=old_balance,
            new_balance=new_balance,
            operation=update_request.operation,
            amount=update_request.amount,
            message="Balance updated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating balance: {e}")
        raise HTTPException(status_code=500, detail="Failed to update balance")

@router.post("/pomo-earnings", response_model=PomoEarningsResponse)
async def add_pomo_earnings(request: Request, earnings_request: PomoEarningsRequest):
    """Add pomo earnings based on session completion."""
    try:
        # Require authentication and get user ID
        user_id = require_authentication(request)
        
        # Validate minutes
        if earnings_request.minutes_completed < 0:
            raise HTTPException(status_code=400, detail="Minutes completed cannot be negative")
        
        if earnings_request.minutes_completed > 120:  # Reasonable upper limit
            raise HTTPException(status_code=400, detail="Minutes completed seems unreasonably high")
        
        # Calculate and add earnings
        new_balance = await PomoBankService.add_pomo_earnings(
            user_id,
            earnings_request.minutes_completed,
            earnings_request.was_skipped
        )
        
        # Calculate actual earnings added
        if earnings_request.was_skipped:
            earnings = int(earnings_request.minutes_completed)  # floored
        else:
            earnings = earnings_request.minutes_completed
        
        logger.info(f"Added pomo earnings for user {user_id}: +{earnings} coins, new balance: {new_balance}")
        
        return PomoEarningsResponse(
            success=True,
            user_id=user_id,
            minutes_completed=earnings_request.minutes_completed,
            was_skipped=earnings_request.was_skipped,
            earnings=earnings,
            new_balance=new_balance,
            message="Pomo earnings added successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding pomo earnings: {e}")
        raise HTTPException(status_code=500, detail="Failed to add pomo earnings")

@router.get("/account-info", response_model=AccountInfoResponse)
async def get_account_info(request: Request):
    """Get detailed account information for current user."""
    try:
        # Require authentication and get user ID
        user_id = require_authentication(request)
        
        # Get account info from service
        account_info = await PomoBankService.get_account_info(user_id)
        
        logger.info(f"Retrieved account info for user {user_id}")
        
        return AccountInfoResponse(
            success=True,
            user_id=account_info["user_id"],
            balance=account_info["balance"],
            created_at=account_info["created_at"],
            updated_at=account_info["updated_at"],
            exists=account_info["exists"],
            message="Account information retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting account info: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve account information")