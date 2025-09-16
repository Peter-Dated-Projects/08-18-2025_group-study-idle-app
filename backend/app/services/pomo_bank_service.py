"""
Pomo Bank Service
Handles operations for the pomo currency system including balance queries and updates.
"""

import logging
from sqlalchemy import text

from ..models.database import SessionLocal
from .websocket_manager import manager, PomoBankEvent

logger = logging.getLogger(__name__)

class PomoBankService:
    """Service class for pomo bank operations."""
    
    @staticmethod
    async def get_user_balance(user_id: str) -> int:
        """
        Get user's pomo bank balance. Creates account with 0 balance if it doesn't exist.
        
        Args:
            user_id (str): User ID to get balance for
            
        Returns:
            int: User's current balance
        """
        try:
            with SessionLocal() as session:
                # Try to get existing balance
                result = session.execute(
                    text("SELECT bank_value FROM pomo_bank WHERE user_id = :user_id"),
                    {"user_id": user_id}
                )
                
                row = result.fetchone()
                
                if row:
                    # User exists, return balance
                    balance = row[0]
                    logger.debug(f"Retrieved balance for user {user_id}: {balance}")
                    return balance
                else:
                    # User doesn't exist, create account with 0 balance
                    session.execute(
                        text("""
                            INSERT INTO pomo_bank (user_id, bank_value, created_at, updated_at) 
                            VALUES (:user_id, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                        """),
                        {"user_id": user_id}
                    )
                    session.commit()
                    logger.info(f"Created new pomo bank account for user {user_id} with balance 0")
                    return 0
                    
        except Exception as e:
            logger.error(f"Error getting balance for user {user_id}: {e}")
            # Return 0 as safe default
            return 0
    
    @staticmethod
    async def update_user_balance(user_id: str, amount: int, operation: str = "add", reason: str = "Manual update") -> int:
        """
        Update user's pomo bank balance. Creates account if it doesn't exist.
        
        Args:
            user_id (str): User ID to update balance for
            amount (int): Amount to add/subtract/set
            operation (str): "add", "subtract", or "set"
            reason (str): Reason for the balance change (for websocket notification)
            
        Returns:
            int: New balance after update
        """
        try:
            with SessionLocal() as session:
                # Get current balance (this will create account if it doesn't exist)
                current_balance = await PomoBankService.get_user_balance(user_id)
                
                # Calculate new balance based on operation
                if operation == "add":
                    new_balance = current_balance + amount
                elif operation == "subtract":
                    new_balance = max(0, current_balance - amount)  # Don't allow negative balance
                elif operation == "set":
                    new_balance = max(0, amount)  # Don't allow negative balance
                else:
                    raise ValueError(f"Invalid operation: {operation}. Must be 'add', 'subtract', or 'set'")
                
                # Update the balance
                session.execute(
                    text("""
                        UPDATE pomo_bank 
                        SET bank_value = :new_balance, updated_at = CURRENT_TIMESTAMP 
                        WHERE user_id = :user_id
                    """),
                    {"user_id": user_id, "new_balance": new_balance}
                )
                session.commit()
                
                logger.info(f"Updated balance for user {user_id}: {current_balance} -> {new_balance} (operation: {operation}, amount: {amount})")
                
                # Send websocket notification to user
                try:
                    event = PomoBankEvent(
                        user_id=user_id,
                        new_balance=new_balance,
                        old_balance=current_balance,
                        change_amount=new_balance - current_balance,
                        reason=reason
                    )
                    await manager.send_pomo_bank_event(event)
                except Exception as ws_error:
                    logger.warning(f"Failed to send websocket notification for user {user_id}: {ws_error}")
                
                return new_balance
                
        except Exception as e:
            logger.error(f"Error updating balance for user {user_id}: {e}")
            raise
    
    @staticmethod
    async def add_pomo_earnings(user_id: str, minutes_completed: int, was_skipped: bool = False) -> int:
        """
        Add pomo earnings to user's account based on session completion.
        
        Args:
            user_id (str): User ID to add earnings for
            minutes_completed (int): Number of minutes completed in the session
            was_skipped (bool): Whether the session was skipped (affects earnings calculation)
            
        Returns:
            int: New balance after adding earnings
        """
        try:
            if was_skipped:
                # If skipped, only add floored minutes
                earnings = int(minutes_completed)  # floor() equivalent for positive numbers
                reason = f"Pomo session skipped ({minutes_completed} minutes)"
                logger.debug(f"Calculating skipped pomo earnings for user {user_id}: {minutes_completed} minutes -> {earnings} coins (floored)")
            else:
                # If completed normally, add full minutes
                earnings = minutes_completed
                reason = f"Pomo session completed ({minutes_completed} minutes)"
                logger.debug(f"Calculating normal pomo earnings for user {user_id}: {minutes_completed} minutes -> {earnings} coins")
            
            # Add earnings to account
            new_balance = await PomoBankService.update_user_balance(user_id, earnings, "add", reason)
            
            logger.info(f"Added pomo earnings to user {user_id}: +{earnings} coins (was_skipped: {was_skipped}), new balance: {new_balance}")
            return new_balance
            
        except Exception as e:
            logger.error(f"Error adding pomo earnings for user {user_id}: {e}")
            raise
    
    @staticmethod
    async def get_account_info(user_id: str) -> dict:
        """
        Get detailed account information for a user.
        
        Args:
            user_id (str): User ID to get info for
            
        Returns:
            dict: Account information including balance, created_at, updated_at
        """
        try:
            with SessionLocal() as session:
                result = session.execute(
                    text("""
                        SELECT user_id, bank_value, created_at, updated_at 
                        FROM pomo_bank 
                        WHERE user_id = :user_id
                    """),
                    {"user_id": user_id}
                )
                
                row = result.fetchone()
                
                if row:
                    return {
                        "user_id": row[0],
                        "balance": row[1],
                        "created_at": row[2].isoformat() if row[2] else None,
                        "updated_at": row[3].isoformat() if row[3] else None,
                        "exists": True
                    }
                else:
                    # Create account and return new info
                    await PomoBankService.get_user_balance(user_id)  # This will create the account
                    
                    # Get the newly created account info
                    result = session.execute(
                        text("""
                            SELECT user_id, bank_value, created_at, updated_at 
                            FROM pomo_bank 
                            WHERE user_id = :user_id
                        """),
                        {"user_id": user_id}
                    )
                    row = result.fetchone()
                    
                    return {
                        "user_id": row[0],
                        "balance": row[1],
                        "created_at": row[2].isoformat() if row[2] else None,
                        "updated_at": row[3].isoformat() if row[3] else None,
                        "exists": False  # Was just created
                    }
                    
        except Exception as e:
            logger.error(f"Error getting account info for user {user_id}: {e}")
            raise