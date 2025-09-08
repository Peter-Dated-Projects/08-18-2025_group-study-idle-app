"""
Friends management endpoints.
Handles friend adding, removing, and listing functionality.
"""
import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List

from ..models.database import get_db, UserRelation, UserStats

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
async def add_friend(request: AddFriendRequest, db: Session = Depends(get_db)):
    """Add a friend to user's friend list (bidirectional)."""
    try:
        # Don't allow adding yourself as a friend
        if request.user_id == request.friend_id:
            return StandardResponse(success=False, message="Cannot add yourself as a friend")
        
        # Handle user_id -> friend_id relationship
        user_relation = db.query(UserRelation).filter(UserRelation.user_id == request.user_id).first()
        
        if user_relation:
            # User relation exists, add friend if not already added
            if request.friend_id not in user_relation.friend_ids:
                user_relation.friend_ids = user_relation.friend_ids + [request.friend_id]
            else:
                return StandardResponse(success=False, message="User is already a friend")
        else:
            # Create new user relation
            user_relation = UserRelation(
                user_id=request.user_id,
                friend_ids=[request.friend_id]
            )
            db.add(user_relation)
        
        # Handle friend_id -> user_id relationship (make it bidirectional)
        friend_relation = db.query(UserRelation).filter(UserRelation.user_id == request.friend_id).first()
        
        if friend_relation:
            # Friend relation exists, add user if not already added
            if request.user_id not in friend_relation.friend_ids:
                friend_relation.friend_ids = friend_relation.friend_ids + [request.user_id]
        else:
            # Create new friend relation
            friend_relation = UserRelation(
                user_id=request.friend_id,
                friend_ids=[request.user_id]
            )
            db.add(friend_relation)
        
        # Update user stats for both users
        # User stats for request.user_id
        user_stats = db.query(UserStats).filter(UserStats.user_id == request.user_id).first()
        if not user_stats:
            user_stats = UserStats(
                user_id=request.user_id,
                group_count="0",
                group_ids=[],
                friend_count="1",
                pomo_count="0"
            )
            db.add(user_stats)
        else:
            user_stats.friend_count = str(len(user_relation.friend_ids))
        
        # User stats for request.friend_id
        friend_stats = db.query(UserStats).filter(UserStats.user_id == request.friend_id).first()
        if not friend_stats:
            friend_stats = UserStats(
                user_id=request.friend_id,
                group_count="0",
                group_ids=[],
                friend_count="1",
                pomo_count="0"
            )
            db.add(friend_stats)
        else:
            friend_stats.friend_count = str(len(friend_relation.friend_ids))
        
        # Commit all changes
        db.commit()
        db.refresh(user_relation)
        if friend_relation:
            db.refresh(friend_relation)
        if user_stats:
            db.refresh(user_stats)
        if friend_stats:
            db.refresh(friend_stats)
        
        return StandardResponse(success=True, message="Friend added successfully (bidirectional)")
        
    except Exception as e:
        logger.error(f"Error adding friend: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/remove", response_model=StandardResponse)
async def remove_friend(request: RemoveFriendRequest, db: Session = Depends(get_db)):
    """Remove a friend from user's friend list (bidirectional)."""
    try:
        # Handle user_id -> friend_id relationship removal
        user_relation = db.query(UserRelation).filter(UserRelation.user_id == request.user_id).first()
        user_had_friend = False
        
        if user_relation and request.friend_id in user_relation.friend_ids:
            # Remove friend from user's list
            new_friend_ids = [fid for fid in user_relation.friend_ids if fid != request.friend_id]
            user_relation.friend_ids = new_friend_ids
            user_had_friend = True
        
        # Handle friend_id -> user_id relationship removal (make it bidirectional)
        friend_relation = db.query(UserRelation).filter(UserRelation.user_id == request.friend_id).first()
        friend_had_user = False
        
        if friend_relation and request.user_id in friend_relation.friend_ids:
            # Remove user from friend's list
            new_friend_ids = [fid for fid in friend_relation.friend_ids if fid != request.user_id]
            friend_relation.friend_ids = new_friend_ids
            friend_had_user = True
        
        if not user_had_friend and not friend_had_user:
            return StandardResponse(success=False, message="Users are not friends")
        
        # Update user stats for both users
        if user_had_friend and user_relation:
            user_stats = db.query(UserStats).filter(UserStats.user_id == request.user_id).first()
            if user_stats:
                user_stats.friend_count = str(len(user_relation.friend_ids))
        
        if friend_had_user and friend_relation:
            friend_stats = db.query(UserStats).filter(UserStats.user_id == request.friend_id).first()
            if friend_stats:
                friend_stats.friend_count = str(len(friend_relation.friend_ids))
        
        # Commit all changes
        db.commit()
        if user_relation:
            db.refresh(user_relation)
        if friend_relation:
            db.refresh(friend_relation)
            
        return StandardResponse(success=True, message="Friend removed successfully (bidirectional)")
        
    except Exception as e:
        logger.error(f"Error removing friend: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/list/{user_id}", response_model=FriendsListResponse)
async def get_friends_list(user_id: str, db: Session = Depends(get_db)):
    """Get user's friends list."""
    try:
        # Find user relation
        user_relation = db.query(UserRelation).filter(UserRelation.user_id == user_id).first()
        
        if not user_relation:
            return FriendsListResponse(success=True, friends=[])
        
        return FriendsListResponse(success=True, friends=user_relation.friend_ids or [])
        
    except Exception as e:
        logger.error(f"Error getting friends list: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
