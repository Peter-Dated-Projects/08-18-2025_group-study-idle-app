"""
Study Groups management endpoints.
Handles group creation, joining, leaving, and management functionality.
"""
import logging
import uuid
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, validator
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from ..models.database import get_db, StudyGroup, UserStats

# Configure logging
logger = logging.getLogger(__name__)

# Create the router
router = APIRouter(
    prefix="/api/groups",
    tags=["groups"],
    responses={404: {"description": "Not found"}},
)

# ------------------------------------------------------------------ #
# Pydantic Models for Groups endpoints
# ------------------------------------------------------------------ #

class CreateGroupRequest(BaseModel):
    creator_id: str
    group_name: str
    
    @validator('group_name')
    def validate_group_name(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Group name cannot be empty')
        if len(v) > 32:
            raise ValueError('Group name cannot exceed 32 characters')
        return v.strip()

class JoinGroupRequest(BaseModel):
    user_id: str
    group_id: str

class LeaveGroupRequest(BaseModel):
    user_id: str
    group_id: str

class UpdateGroupRequest(BaseModel):
    group_id: str
    user_id: str  # Only creator can update
    group_name: str
    
    @validator('group_name')
    def validate_group_name(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Group name cannot be empty')
        if len(v) > 32:
            raise ValueError('Group name cannot exceed 32 characters')
        return v.strip()

class DeleteGroupRequest(BaseModel):
    group_id: str
    user_id: str  # Only creator can delete

class GroupResponse(BaseModel):
    id: str
    creator_id: str
    member_ids: List[str]
    group_name: str
    created_at: datetime
    updated_at: datetime

class GroupCreateResponse(BaseModel):
    success: bool
    message: str
    group: GroupResponse = None

class StandardResponse(BaseModel):
    success: bool
    message: str

class GroupListResponse(BaseModel):
    success: bool
    groups: List[GroupResponse]

class UserStatsResponse(BaseModel):
    user_id: str
    group_count: str
    group_ids: List[str]
    friend_count: str
    pomo_count: str

class UserStatsGetResponse(BaseModel):
    success: bool
    stats: UserStatsResponse = None

# ------------------------------------------------------------------ #
# Helper functions
# ------------------------------------------------------------------ #

def generate_group_id():
    """Generate a 16-character unique ID for groups."""
    return str(uuid.uuid4()).replace('-', '')[:16]

# ------------------------------------------------------------------ #
# Groups endpoints
# ------------------------------------------------------------------ #

@router.post("/create", response_model=GroupCreateResponse)
async def create_group(request: CreateGroupRequest, db: Session = Depends(get_db)):
    """Create a new study group."""
    try:
        # Check user's current group count and enforce 5-group limit
        user_stats = db.query(UserStats).filter(UserStats.user_id == request.creator_id).first()
        if not user_stats:
            # Create new user stats entry
            user_stats = UserStats(
                user_id=request.creator_id,
                group_count="0",
                group_ids=[],
                friend_count="0",
                pomo_count="0"
            )
            db.add(user_stats)
        
        current_group_count = int(user_stats.group_count)
        if current_group_count >= 5:
            return GroupCreateResponse(
                success=False,
                message="Cannot create group: You have reached the maximum limit of 5 groups",
                group=None
            )
        
        # Generate unique group ID
        group_id = generate_group_id()
        
        # Ensure ID is unique (highly unlikely to collide, but be safe)
        while db.query(StudyGroup).filter(StudyGroup.id == group_id).first():
            group_id = generate_group_id()
        
        # Create new group with creator as first member and leader
        study_group = StudyGroup(
            id=group_id,
            creator_id=request.creator_id,
            member_ids=[request.creator_id],  # Creator is automatically added as first member
            group_name=request.group_name
        )
        
        # Update user's group count and group_ids
        user_stats.group_count = str(current_group_count + 1)
        user_stats.group_ids = (user_stats.group_ids or []) + [group_id]
        
        db.add(study_group)
        db.commit()
        db.refresh(study_group)
        db.refresh(user_stats)
        
        group_response = GroupResponse(
            id=study_group.id,
            creator_id=study_group.creator_id,
            member_ids=study_group.member_ids,
            group_name=study_group.group_name,
            created_at=study_group.created_at,
            updated_at=study_group.updated_at
        )
        
        return GroupCreateResponse(
            success=True,
            message=f"Group created successfully! You are now the group leader. ({current_group_count + 1}/5 groups)",
            group=group_response
        )
        
    except Exception as e:
        logger.error(f"Error creating group: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/join", response_model=StandardResponse)
async def join_group(request: JoinGroupRequest, db: Session = Depends(get_db)):
    """Join a study group using group ID."""
    try:
        # Check user's current group count and enforce 5-group limit
        user_stats = db.query(UserStats).filter(UserStats.user_id == request.user_id).first()
        if not user_stats:
            # Create new user stats entry
            user_stats = UserStats(
                user_id=request.user_id,
                group_count="0",
                group_ids=[],
                friend_count="0",
                pomo_count="0"
            )
            db.add(user_stats)
        
        current_group_count = int(user_stats.group_count)
        if current_group_count >= 5:
            return StandardResponse(
                success=False, 
                message="Cannot join group: You have reached the maximum limit of 5 groups"
            )
        
        # Find the group
        study_group = db.query(StudyGroup).filter(StudyGroup.id == request.group_id).first()
        
        if not study_group:
            return StandardResponse(success=False, message="Group not found")
        
        # Check if user is already a member
        if request.user_id in study_group.member_ids:
            return StandardResponse(success=False, message="User is already a member of this group")
        
        # Add user to group and update stats
        study_group.member_ids = study_group.member_ids + [request.user_id]
        user_stats.group_count = str(current_group_count + 1)
        user_stats.group_ids = (user_stats.group_ids or []) + [request.group_id]
        
        db.commit()
        db.refresh(study_group)
        db.refresh(user_stats)
        
        return StandardResponse(
            success=True, 
            message=f"Successfully joined group ({current_group_count + 1}/5 groups)"
        )
        
    except Exception as e:
        logger.error(f"Error joining group: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/leave", response_model=StandardResponse)
async def leave_group(request: LeaveGroupRequest, db: Session = Depends(get_db)):
    """Leave a study group."""
    try:
        # Find the group
        study_group = db.query(StudyGroup).filter(StudyGroup.id == request.group_id).first()
        
        if not study_group:
            return StandardResponse(success=False, message="Group not found")
        
        # Check if user is a member
        if request.user_id not in study_group.member_ids:
            return StandardResponse(success=False, message="User is not a member of this group")
        
        # Get user stats to update group count and group_ids
        user_stats = db.query(UserStats).filter(UserStats.user_id == request.user_id).first()
        if user_stats:
            current_group_count = int(user_stats.group_count)
            user_stats.group_count = str(max(0, current_group_count - 1))  # Prevent negative counts
            # Remove group ID from user's group_ids list
            if user_stats.group_ids and request.group_id in user_stats.group_ids:
                user_stats.group_ids = [gid for gid in user_stats.group_ids if gid != request.group_id]
        
        # Remove user from group
        new_member_ids = [mid for mid in study_group.member_ids if mid != request.user_id]
        study_group.member_ids = new_member_ids
        
        # If the creator leaves and there are other members, transfer ownership to first member
        if request.user_id == study_group.creator_id and new_member_ids:
            study_group.creator_id = new_member_ids[0]
            db.commit()
            if user_stats:
                db.refresh(user_stats)
            db.refresh(study_group)
            remaining_count = int(user_stats.group_count) if user_stats else 0
            return StandardResponse(
                success=True, 
                message=f"Left group and transferred leadership to another member ({remaining_count}/5 groups)"
            )
        # If the creator leaves and no other members, delete the group
        elif request.user_id == study_group.creator_id and not new_member_ids:
            db.delete(study_group)
            db.commit()
            if user_stats:
                db.refresh(user_stats)
            remaining_count = int(user_stats.group_count) if user_stats else 0
            return StandardResponse(
                success=True, 
                message=f"Left group and group was deleted (no members left) ({remaining_count}/5 groups)"
            )
        
        db.commit()
        if user_stats:
            db.refresh(user_stats)
        db.refresh(study_group)
        
        remaining_count = int(user_stats.group_count) if user_stats else 0
        return StandardResponse(
            success=True, 
            message=f"Successfully left group ({remaining_count}/5 groups)"
        )
        
    except Exception as e:
        logger.error(f"Error leaving group: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/update", response_model=StandardResponse)
async def update_group(request: UpdateGroupRequest, db: Session = Depends(get_db)):
    """Update group details (only creator can update)."""
    try:
        # Find the group
        study_group = db.query(StudyGroup).filter(StudyGroup.id == request.group_id).first()
        
        if not study_group:
            return StandardResponse(success=False, message="Group not found")
        
        # Check if user is the creator
        if request.user_id != study_group.creator_id:
            return StandardResponse(success=False, message="Only the creator can update the group")
        
        # Update group name
        study_group.group_name = request.group_name
        db.commit()
        db.refresh(study_group)
        
        return StandardResponse(success=True, message="Group updated successfully")
        
    except Exception as e:
        logger.error(f"Error updating group: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/delete", response_model=StandardResponse)
async def delete_group(request: DeleteGroupRequest, db: Session = Depends(get_db)):
    """Delete a group (only creator can delete)."""
    try:
        # Find the group
        study_group = db.query(StudyGroup).filter(StudyGroup.id == request.group_id).first()
        
        if not study_group:
            return StandardResponse(success=False, message="Group not found")
        
        # Check if user is the creator
        if request.user_id != study_group.creator_id:
            return StandardResponse(success=False, message="Only the creator can delete the group")
        
        # Delete the group
        db.delete(study_group)
        db.commit()
        
        return StandardResponse(success=True, message="Group deleted successfully")
        
    except Exception as e:
        logger.error(f"Error deleting group: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/user/{user_id}", response_model=GroupListResponse)
async def get_user_groups(user_id: str, db: Session = Depends(get_db)):
    """Get all groups that a user is a member of."""
    try:
        # retrieve array of group IDs from user stats
        user_stats = db.query(UserStats).filter(UserStats.user_id == user_id).first()
        if not user_stats or not user_stats.group_ids:
            return GroupListResponse(success=True, groups=[])
        
        # Fetch all groups where user is a member
        groups = db.query(StudyGroup).filter(StudyGroup.id.in_(user_stats.group_ids)).all()

        group_responses = [
            GroupResponse(
                id=group.id,
                creator_id=group.creator_id,
                member_ids=group.member_ids,
                group_name=group.group_name,
                created_at=group.created_at,
                updated_at=group.updated_at
            )
            for group in groups
        ]
        
        return GroupListResponse(success=True, groups=group_responses)
        
    except Exception as e:
        logger.error(f"Error getting user groups: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/details/{group_id}", response_model=GroupResponse)
async def get_group_details(group_id: str, db: Session = Depends(get_db)):
    """Get details of a specific group."""
    try:
        # Find the group
        study_group = db.query(StudyGroup).filter(StudyGroup.id == group_id).first()
        
        if not study_group:
            raise HTTPException(status_code=404, detail="Group not found")
        
        return GroupResponse(
            id=study_group.id,
            creator_id=study_group.creator_id,
            member_ids=study_group.member_ids,
            group_name=study_group.group_name,
            created_at=study_group.created_at,
            updated_at=study_group.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting group details: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/user-stats/{user_id}", response_model=UserStatsGetResponse)
async def get_user_stats(user_id: str, db: Session = Depends(get_db)):
    """Get user statistics including group memberships."""
    try:
        # Find user stats
        user_stats = db.query(UserStats).filter(UserStats.user_id == user_id).first()
        
        if not user_stats:
            # Return default stats if user doesn't exist
            default_stats = UserStatsResponse(
                user_id=user_id,
                group_count="0",
                group_ids=[],
                friend_count="0",
                pomo_count="0"
            )
            return UserStatsGetResponse(success=True, stats=default_stats)
        
        stats_response = UserStatsResponse(
            user_id=user_stats.user_id,
            group_count=user_stats.group_count,
            group_ids=user_stats.group_ids or [],
            friend_count=user_stats.friend_count,
            pomo_count=user_stats.pomo_count
        )
        
        return UserStatsGetResponse(success=True, stats=stats_response)
        
    except Exception as e:
        logger.error(f"Error getting user stats: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
