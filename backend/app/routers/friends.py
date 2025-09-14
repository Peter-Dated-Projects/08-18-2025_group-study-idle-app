"""
Friends management endpoints using ArangoDB.
Handles friend adding, removing, and listing functionality.
"""
import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional

from ..services.friend_service_arangodb import get_friend_service, FriendService
from ..services.user_service_firestore import get_user_service, UserService

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
    user_service: UserService = Depends(get_user_service)
):
    """Get user's friends list with detailed user information from Firestore."""
    try:
        # Get friend IDs from ArangoDB
        friend_ids = friend_service.get_friends(user_id)
        
        if not friend_ids:
            return FriendsListResponse(success=True, friends=[])
        
        # Fetch user information from Firestore for all friends
        if user_service.is_available():
            user_info_map = user_service.get_users_info(friend_ids)
            
            # Build FriendInfo objects with Firestore data
            friends_with_info = []
            for friend_id in friend_ids:
                user_info = user_info_map.get(friend_id, {})
                friend_info = FriendInfo(
                    friend_id=friend_id,
                    display_name=user_info.get('display_name'),
                    email=user_info.get('email'),
                    photo_url=user_info.get('photo_url'),
                    created_at=user_info.get('created_at'),
                    last_login=user_info.get('last_login'),
                    provider=user_info.get('provider')
                )
                friends_with_info.append(friend_info)
        else:
            # Fallback: if Firestore is not available, return minimal info
            logger.warning("Firestore service not available, returning minimal friend info")
            friends_with_info = [
                FriendInfo(friend_id=friend_id) for friend_id in friend_ids
            ]
        
        return FriendsListResponse(success=True, friends=friends_with_info)
        
    except Exception as e:
        logger.error(f"Error getting friends list: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/friends-of-friends/{user_id}", response_model=FriendsListResponse)
async def get_friends_of_friends(
    user_id: str,
    friend_service: FriendService = Depends(get_friend_service),
    user_service: UserService = Depends(get_user_service)
):
    """Get user's friends-of-friends (second-degree connections) with detailed user information."""
    try:
        # Get friends-of-friends IDs from ArangoDB
        friend_of_friend_ids = friend_service.get_friends_of_friends(user_id)
        
        if not friend_of_friend_ids:
            return FriendsListResponse(success=True, friends=[])
        
        # Fetch user information from Firestore for all friends-of-friends
        if user_service.is_available():
            user_info_map = user_service.get_users_info(friend_of_friend_ids)
            
            # Build FriendInfo objects with Firestore data
            friends_with_info = []
            for friend_id in friend_of_friend_ids:
                user_info = user_info_map.get(friend_id, {})
                friend_info = FriendInfo(
                    friend_id=friend_id,
                    display_name=user_info.get('display_name'),
                    email=user_info.get('email'),
                    photo_url=user_info.get('photo_url'),
                    created_at=user_info.get('created_at'),
                    last_login=user_info.get('last_login'),
                    provider=user_info.get('provider')
                )
                friends_with_info.append(friend_info)
        else:
            # Fallback: if Firestore is not available, return minimal info
            logger.warning("Firestore service not available, returning minimal friend info")
            friends_with_info = [
                FriendInfo(friend_id=friend_id) for friend_id in friend_of_friend_ids
            ]
        
        return FriendsListResponse(success=True, friends=friends_with_info)
        
    except Exception as e:
        logger.error(f"Error getting friends-of-friends: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
