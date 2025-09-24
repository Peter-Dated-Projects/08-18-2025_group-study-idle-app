"""
Balance service for managing user account balances.
Handles PostgreSQL database operations for user balance data.
"""
import logging
from typing import Dict, Optional, Any

from sqlalchemy.orm import Session
from sqlalchemy import text
from ..models.database import SessionLocal

logger = logging.getLogger(__name__)

class BalanceService:
    """Service for managing user account balances."""
    
    def __init__(self):
        self.logger = logger
    
    def _get_db(self) -> Session:
        """Get database session."""
        return SessionLocal()
    
    def get_user_balance(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get user's balance from database.
        
        Args:
            user_id: User ID to get balance for
            
        Returns:
            Dictionary with balance data or None if not found
        """
        try:
            with self._get_db() as db:
                query = text("""
                    SELECT user_id, bank_value, created_at, updated_at
                    FROM pomo_bank
                    WHERE user_id = :user_id
                """)
                
                result = db.execute(query, {"user_id": user_id}).fetchone()
                
                if result:
                    return {
                        "user_id": result.user_id,
                        "bank_value": result.bank_value,
                        "created_at": result.created_at.isoformat() if result.created_at else None,
                        "updated_at": result.updated_at.isoformat() if result.updated_at else None
                    }
                return None
                
        except Exception as e:
            self.logger.error(f"Error getting balance for user {user_id}: {e}")
            raise
    
    def create_user_balance(self, user_id: str, initial_balance: int = 0) -> Dict[str, Any]:
        """
        Create balance entry for a new user.
        
        Args:
            user_id: User ID to create balance for
            initial_balance: Starting balance (default: 0)
            
        Returns:
            Dictionary with created balance data
        """
        try:
            with self._get_db() as db:
                query = text("""
                    INSERT INTO pomo_bank (user_id, bank_value)
                    VALUES (:user_id, :bank_value)
                    ON CONFLICT (user_id) DO NOTHING
                    RETURNING user_id, bank_value, created_at, updated_at
                """)
                
                result = db.execute(query, {
                    "user_id": user_id,
                    "bank_value": initial_balance
                }).fetchone()
                
                db.commit()
                
                if result:
                    return {
                        "user_id": result.user_id,
                        "bank_value": result.bank_value,
                        "created_at": result.created_at.isoformat() if result.created_at else None,
                        "updated_at": result.updated_at.isoformat() if result.updated_at else None
                    }
                else:
                    # User already exists, get their balance
                    return self.get_user_balance(user_id)
                
        except Exception as e:
            self.logger.error(f"Error creating balance for user {user_id}: {e}")
            raise
    
    def update_user_balance(self, user_id: str, amount: int) -> Dict[str, Any]:
        """
        Update user's balance by adding/subtracting amount.
        
        Args:
            user_id: User ID
            amount: Amount to add (can be negative to subtract)
            
        Returns:
            Dictionary with updated balance data
        """
        try:
            with self._get_db() as db:
                # First ensure user has a balance record
                current_balance = self.get_user_balance(user_id)
                if not current_balance:
                    current_balance = self.create_user_balance(user_id, max(0, amount))
                    return current_balance
                
                # Update balance
                query = text("""
                    UPDATE pomo_bank
                    SET bank_value = bank_value + :amount, updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = :user_id AND bank_value + :amount >= 0
                    RETURNING user_id, bank_value, created_at, updated_at
                """)
                
                result = db.execute(query, {
                    "user_id": user_id,
                    "amount": amount
                }).fetchone()
                
                if not result:
                    # Balance would go negative, throw error
                    raise ValueError(f"Insufficient balance. Current: {current_balance['bank_value']}, Attempted: {amount}")
                
                db.commit()
                
                return {
                    "user_id": result.user_id,
                    "bank_value": result.bank_value,
                    "created_at": result.created_at.isoformat() if result.created_at else None,
                    "updated_at": result.updated_at.isoformat() if result.updated_at else None
                }
                
        except Exception as e:
            self.logger.error(f"Error updating balance for user {user_id}: {e}")
            raise
    
    def set_user_balance(self, user_id: str, balance: int) -> Dict[str, Any]:
        """
        Set user's balance to specific amount.
        
        Args:
            user_id: User ID
            balance: New balance amount
            
        Returns:
            Dictionary with updated balance data
        """
        try:
            with self._get_db() as db:
                # First ensure user has a balance record
                current_balance = self.get_user_balance(user_id)
                if not current_balance:
                    return self.create_user_balance(user_id, balance)
                
                # Set balance
                query = text("""
                    UPDATE pomo_bank
                    SET bank_value = :balance, updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = :user_id
                    RETURNING user_id, bank_value, created_at, updated_at
                """)
                
                result = db.execute(query, {
                    "user_id": user_id,
                    "balance": balance
                }).fetchone()
                
                db.commit()
                
                return {
                    "user_id": result.user_id,
                    "bank_value": result.bank_value,
                    "created_at": result.created_at.isoformat() if result.created_at else None,
                    "updated_at": result.updated_at.isoformat() if result.updated_at else None
                }
                
        except Exception as e:
            self.logger.error(f"Error setting balance for user {user_id}: {e}")
            raise


# Dependency for FastAPI
_balance_service = None

def get_balance_service() -> BalanceService:
    """Get the balance service instance."""
    global _balance_service
    if _balance_service is None:
        _balance_service = BalanceService()
    return _balance_service