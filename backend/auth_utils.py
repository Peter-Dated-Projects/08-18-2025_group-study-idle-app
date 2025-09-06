"""
Authentication utilities for the FastAPI backend.
Handles session-based authentication using cookies and user ID validation.
"""

import logging
from typing import Optional
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


def get_user_id_from_request(request: Request) -> Optional[str]:
    """
    Extract user ID from request cookies.
    Returns None if user is not authenticated.
    """
    try:
        user_id = request.cookies.get("user_id")
        if not user_id:
            logger.warning("No user_id cookie found in request")
            return None
        return user_id
    except Exception as e:
        logger.error(f"Error extracting user ID from request: {e}")
        return None


def require_authentication(request: Request) -> str:
    """
    Require user authentication and return user ID.
    Raises HTTPException if user is not authenticated.
    """
    user_id = get_user_id_from_request(request)
    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please log in."
        )
    return user_id


def create_auth_error_response(message: str = "Authentication required") -> JSONResponse:
    """
    Create a standardized authentication error response.
    """
    return JSONResponse(
        status_code=401,
        content={
            "success": False,
            "error": message,
            "redirect": "/login"
        }
    )
