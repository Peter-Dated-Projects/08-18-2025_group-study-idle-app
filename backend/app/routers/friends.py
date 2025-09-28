"""
Friends management endpoints using ArangoDB.
Handles friend adding, removing, and listing functionality.
"""
import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional

from ..services.friend_service_arangodb import get_friend_service, FriendService
from ..services.username_resolution_service import get_username_resolution_service, UsernameResolutionService

# Configure logging
logger = logging.getLogger(__name__)

# Create the router
router = APIRouter(
    prefix="/api/friends",
    tags=["friends"],
    responses={404: {"description": "Not found"}},
)

# ------------------------------------------------------------------ #
# Pydantic Models for Friends endpoints
# ------------------------------------------------------------------ #

class FriendInfo(BaseModel):
    friend_id: str
    display_name: Optional[str] = None
    email: Optional[str] = None
    photo_url: Optional[str] = None
    created_at: Optional[str] = None
    last_login: Optional[str] = None
    provider: Optional[str] = None

class AddFriendRequest(BaseModel):
    user_id: str
    friend_id: str

class RemoveFriendRequest(BaseModel):
    user_id: str
    friend_id: str

class FriendsListResponse(BaseModel):
    success: bool
    friends: List[FriendInfo]

class StandardResponse(BaseModel):
    success: bool
    message: str

# ------------------------------------------------------------------ #
# Friends endpoints
# ------------------------------------------------------------------ #

@router.post("/add", response_model=StandardResponse)
async def add_friend(
    request: AddFriendRequest,
    friend_service: FriendService = Depends(get_friend_service)
):
    """Add a friend to user's friend list (bidirectional)."""
    try:
        if request.user_id == request.friend_id:
            return StandardResponse(success=False, message="Cannot add yourself as a friend")

        success = friend_service.add_friend(request.user_id, request.friend_id)

        if success:
            return StandardResponse(success=True, message="Friend added successfully (bidirectional)")
        else:
            return StandardResponse(success=False, message="User is already a friend")

    except Exception as e:
        logger.error(f"Error adding friend: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/remove", response_model=StandardResponse)
async def remove_friend(
    request: RemoveFriendRequest,
    friend_service: FriendService = Depends(get_friend_service)
):
    """Remove a friend from user's friend list (bidirectional)."""
    try:
        success = friend_service.remove_friend(request.user_id, request.friend_id)
        
        if success:
            return StandardResponse(success=True, message="Friend removed successfully (bidirectional)")
        else:
            return StandardResponse(success=False, message="Users are not friends")

    except Exception as e:
        logger.error(f"Error removing friend: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/list/{user_id}", response_model=FriendsListResponse)
async def get_friends_list(
    user_id: str,
    friend_service: FriendService = Depends(get_friend_service),
    username_service: UsernameResolutionService = Depends(get_username_resolution_service)
):
    """Get user's friends list with detailed user information using unified username resolution."""
    try:
        # Get friend IDs from ArangoDB
        friend_ids = friend_service.get_friends(user_id)
        
        if not friend_ids:
            return FriendsListResponse(success=True, friends=[])
        
        # Use username resolution service for batch user lookup
        resolved_users = username_service.resolve_usernames(friend_ids)
        
        # Build FriendInfo objects with resolved user data
        friends_with_info = []
        for friend_id in friend_ids:
            resolved_user = resolved_users.get(friend_id)
            if resolved_user:
                friend_info = FriendInfo(
                    friend_id=friend_id,
                    display_name=resolved_user.display_name,
                    email=resolved_user.email,
                    photo_url=resolved_user.photo_url,
                    created_at=resolved_user.created_at,
                    last_login=resolved_user.last_login,
                    provider=resolved_user.provider
                )
            else:
                # Fallback: include friend even if username resolution fails
                logger.warning(f"Could not resolve username for friend_id: {friend_id}, including with fallback data")
                friend_info = FriendInfo(
                    friend_id=friend_id,
                    display_name=friend_id,  # Use friend_id as fallback display name
                    email=None,
                    photo_url=None,
                    created_at=None,
                    last_login=None,
                    provider=None
                )
            friends_with_info.append(friend_info)
        
        return FriendsListResponse(success=True, friends=friends_with_info)
        
    except Exception as e:
        logger.error(f"Error getting friends list: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/friends-of-friends/{user_id}", response_model=FriendsListResponse)
async def get_friends_of_friends(
    user_id: str,
    friend_service: FriendService = Depends(get_friend_service),
    username_service: UsernameResolutionService = Depends(get_username_resolution_service)
):
    """Get user's friends-of-friends (second-degree connections) with detailed user information."""
    try:
        # Get friends-of-friends IDs from ArangoDB
        friend_of_friend_ids = friend_service.get_friends_of_friends(user_id)
        
        if not friend_of_friend_ids:
            return FriendsListResponse(success=True, friends=[])
        
        # Use username resolution service for batch user lookup
        resolved_users = username_service.resolve_usernames(friend_of_friend_ids)
        
        # Build FriendInfo objects with resolved user data
        friends_with_info = []
        for friend_id in friend_of_friend_ids:
            resolved_user = resolved_users.get(friend_id)
            if resolved_user:
                friend_info = FriendInfo(
                    friend_id=friend_id,
                    display_name=resolved_user.display_name,
                    email=resolved_user.email,
                    photo_url=resolved_user.photo_url,
                    created_at=resolved_user.created_at,
                    last_login=resolved_user.last_login,
                    provider=resolved_user.provider
                )
                friends_with_info.append(friend_info)
        
        return FriendsListResponse(success=True, friends=friends_with_info)
        
    except Exception as e:
        logger.error(f"Error getting friends-of-friends: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
