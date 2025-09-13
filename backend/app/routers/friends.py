"""
Friends management endpoints using ArangoDB.
Handles friend adding, removing, and listing functionality.
"""
import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List

from ..services.friend_service_arangodb import get_friend_service, FriendService

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

class AddFriendRequest(BaseModel):
    user_id: str
    friend_id: str

class RemoveFriendRequest(BaseModel):
    user_id: str
    friend_id: str

class FriendsListResponse(BaseModel):
    success: bool
    friends: List[str]

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
    friend_service: FriendService = Depends(get_friend_service)
):
    """Get user's friends list."""
    try:
        friends = friend_service.get_friends(user_id)
        return FriendsListResponse(success=True, friends=friends)
        
    except Exception as e:
        logger.error(f"Error getting friends list: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/friends-of-friends/{user_id}", response_model=FriendsListResponse)
async def get_friends_of_friends(
    user_id: str,
    friend_service: FriendService = Depends(get_friend_service)
):
    """Get user's friends-of-friends (second-degree connections)."""
    try:
        friends_of_friends = friend_service.get_friends_of_friends(user_id)
        return FriendsListResponse(success=True, friends=friends_of_friends)
        
    except Exception as e:
        logger.error(f"Error getting friends-of-friends: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
