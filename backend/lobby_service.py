"""
Lobby service module for handling lobby database operations.
"""
import secrets
import string
import logging
from datetime import datetime
from database import Lobby, SessionLocal
from typing import Optional, List

# Configure logging
logger = logging.getLogger(__name__)

# ------------------------------------------------------------------ #
# Lobby Service Functions
# ------------------------------------------------------------------ #

def generate_lobby_code() -> str:
    """Generate a unique 16-character lobby code."""
    # Use uppercase letters and numbers for readability
    characters = string.ascii_uppercase + string.digits
    # Remove potentially confusing characters
    characters = characters.replace('0', '').replace('O', '').replace('1', '').replace('I', '')
    
    # Generate 16-character code
    return ''.join(secrets.choice(characters) for _ in range(16))

def create_lobby(host_id: str) -> Optional[Lobby]:
    """
    Create a new lobby with a unique code.
    
    Args:
        host_id: The user ID of the lobby host
        
    Returns:
        Lobby object if successful, None if failed
        
    Raises:
        Exception: With user-friendly error message
    """
    db = SessionLocal()
    try:
        # Generate unique code
        max_attempts = 10
        for attempt in range(max_attempts):
            code = generate_lobby_code()
            
            # Check if code already exists
            existing = db.query(Lobby).filter(Lobby.code == code).first()
            if not existing:
                break
                
            if attempt == max_attempts - 1:
                logger.error("Failed to generate unique lobby code after maximum attempts")
                raise Exception("Unable to generate unique lobby code. Please try again.")
        
        # Create new lobby
        lobby = Lobby(
            code=code,
            host_user_id=host_id,
            users=[host_id],  # Host automatically joins the lobby
            created_at=datetime.utcnow()
        )
        
        db.add(lobby)
        db.commit()
        db.refresh(lobby)
        
        logger.info(f"Created lobby {code} hosted by {host_id}")
        return lobby
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating lobby: {e}")
        if "Unable to generate unique lobby code" in str(e):
            raise e  # Re-raise user-friendly error
        raise Exception("Database error occurred while creating lobby")
    finally:
        db.close()

def get_lobby(code: str) -> Optional[Lobby]:
    """
    Get lobby by code.
    
    Args:
        code: The lobby code
        
    Returns:
        Lobby object if found, None otherwise
    """
    db = SessionLocal()
    try:
        lobby = db.query(Lobby).filter(Lobby.code == code).first()
        return lobby
    except Exception as e:
        logger.error(f"Error getting lobby {code}: {e}")
        return None
    finally:
        db.close()

def join_lobby(code: str, user_id: str) -> Optional[Lobby]:
    """
    Add a user to an existing lobby.
    
    Args:
        code: The lobby code
        user_id: The user ID to add
        
    Returns:
        Updated Lobby object if successful, None if failed
        
    Raises:
        Exception: With user-friendly error message
    """
    db = SessionLocal()
    try:
        lobby = db.query(Lobby).filter(Lobby.code == code).first()
        if not lobby:
            logger.warning(f"Lobby {code} not found")
            raise Exception(f"Lobby with code '{code}' not found")
        
        # Check if user is already in the lobby
        if user_id not in lobby.users:
            lobby.users = lobby.users + [user_id]  # Append to array
            
            db.commit()
            db.refresh(lobby)
            
            logger.info(f"User {user_id} joined lobby {code}")
        else:
            logger.info(f"User {user_id} already in lobby {code}")
        
        return lobby
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error joining lobby {code}: {e}")
        if "not found" in str(e):
            raise e  # Re-raise user-friendly error
        raise Exception("Database error occurred while joining lobby")
    finally:
        db.close()

def leave_lobby(code: str, user_id: str) -> Optional[Lobby]:
    """
    Remove a user from a lobby.
    
    Args:
        code: The lobby code
        user_id: The user ID to remove
        
    Returns:
        Updated Lobby object if successful
        
    Raises:
        Exception: With user-friendly error message
    """
    db = SessionLocal()
    try:
        lobby = db.query(Lobby).filter(Lobby.code == code).first()
        if not lobby:
            logger.warning(f"Lobby {code} not found")
            raise Exception(f"Lobby {code} not found")
        
        # Check if user is in the lobby
        if user_id not in lobby.users:
            logger.warning(f"User {user_id} not in lobby {code}")
            raise Exception(f"User is not in lobby {code}")
        
        # Remove user from the lobby
        lobby.users = [uid for uid in lobby.users if uid != user_id]
        
        db.commit()
        db.refresh(lobby)
        
        logger.info(f"User {user_id} left lobby {code}")
        return lobby
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error leaving lobby {code}: {e}")
        if "not found" in str(e) or "not in lobby" in str(e):
            raise e  # Re-raise user-friendly errors
        raise Exception("Database error occurred while leaving lobby")
    finally:
        db.close()

def close_lobby(code: str, host_id: str) -> bool:
    """
    Delete a lobby (host only).
    
    Args:
        code: The lobby code
        host_id: The user ID of the requester (must be host)
        
    Returns:
        True if successful, False if failed
        
    Raises:
        Exception: With user-friendly error message
    """
    db = SessionLocal()
    try:
        lobby = db.query(Lobby).filter(Lobby.code == code).first()
        if not lobby:
            logger.warning(f"Lobby {code} not found")
            raise Exception(f"Lobby with code '{code}' not found")
        
        # Verify the requester is the host
        if lobby.host_user_id != host_id:
            logger.warning(f"User {host_id} tried to close lobby {code} but is not the host")
            raise Exception("Only the lobby host can close the lobby")
        
        # Delete the lobby
        db.delete(lobby)
        db.commit()
        
        logger.info(f"Lobby {code} closed by host {host_id}")
        return True
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error closing lobby {code}: {e}")
        if "not found" in str(e) or "Only the lobby host" in str(e):
            raise e  # Re-raise user-friendly error
        raise Exception("Database error occurred while closing lobby")
    finally:
        db.close()

def get_lobby_users(code: str) -> List[str]:
    """
    Get list of user IDs in a lobby.
    
    Args:
        code: The lobby code
        
    Returns:
        List of user IDs, empty list if lobby not found
    """
    lobby = get_lobby(code)
    return lobby.users if lobby else []
