"""
Study Groups management endpoints using ArangoDB.
Handles group creation, joining, leaving, and management functionality.
"""
import logging
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, validator, Field
from typing import List, Optional
from datetime import datetime

from ..services.group_service_arangodb import get_group_service, GroupService

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
    group_id: str = Field(..., alias='_key')
    creator_id: str
    member_ids: List[str]
    group_name: str
    created_at: datetime
    updated_at: datetime

    class Config:
        allow_population_by_field_name = True

class GroupCreateResponse(BaseModel):
    success: bool
    message: str
    group: Optional[GroupResponse] = None

class StandardResponse(BaseModel):
    success: bool
    message: str

class GroupListResponse(BaseModel):
    success: bool
    groups: List[GroupResponse]

# ------------------------------------------------------------------ #
# Groups endpoints
# ------------------------------------------------------------------ #

@router.post("/create", response_model=GroupCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_group(
    request: CreateGroupRequest,
    group_service: GroupService = Depends(get_group_service)
):
    """Create a new study group."""
    try:
        group_doc = group_service.create_group(request.creator_id, request.group_name)
        group_doc['member_ids'] = [request.creator_id] # Creator is the first member
        
        group_count = group_service.get_user_group_count(request.creator_id)
        return GroupCreateResponse(
            success=True,
            message=f"Group created successfully! You are now the group leader. ({group_count}/5 groups)",
            group=GroupResponse.parse_obj(group_doc)
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating group: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

@router.post("/join", response_model=StandardResponse)
async def join_group(
    request: JoinGroupRequest,
    group_service: GroupService = Depends(get_group_service)
):
    """Join a study group using group ID."""
    try:
        group_service.add_member(request.group_id, request.user_id)
        group_count = group_service.get_user_group_count(request.user_id)
        return StandardResponse(
            success=True, 
            message=f"Successfully joined group ({group_count}/5 groups)"
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error joining group: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

@router.post("/leave", response_model=StandardResponse)
async def leave_group(
    request: LeaveGroupRequest,
    group_service: GroupService = Depends(get_group_service)
):
    """Leave a study group."""
    try:
        result = group_service.remove_member(request.group_id, request.user_id)
        group_count = group_service.get_user_group_count(request.user_id)
        
        if result == "deleted":
            message = f"Left group and group was deleted (no members left) ({group_count}/5 groups)"
        else:
            message = f"Successfully left group ({group_count}/5 groups)"

        return StandardResponse(success=True, message=message)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error leaving group: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

@router.put("/update", response_model=StandardResponse)
async def update_group(
    request: UpdateGroupRequest,
    group_service: GroupService = Depends(get_group_service)
):
    """Update group details (only creator can update)."""
    try:
        group_service.update_group(request.group_id, request.user_id, request.group_name)
        return StandardResponse(success=True, message="Group updated successfully")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating group: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

@router.delete("/delete", response_model=StandardResponse)
async def delete_group(
    request: DeleteGroupRequest,
    group_service: GroupService = Depends(get_group_service)
):
    """Delete a group (only creator can delete)."""
    try:
        group_service.delete_group(request.group_id, request.user_id)
        return StandardResponse(success=True, message="Group deleted successfully")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        logger.error(f"Error deleting group: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

@router.get("/user/{user_id}", response_model=GroupListResponse)
async def get_user_groups(
    user_id: str,
    group_service: GroupService = Depends(get_group_service)
):
    """Get all groups that a user is a member of."""
    try:
        groups = group_service.get_user_groups(user_id)
        return GroupListResponse(success=True, groups=groups)
    except Exception as e:
        logger.error(f"Error getting user groups: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

@router.get("/details/{group_id}", response_model=GroupResponse)
async def get_group_details(
    group_id: str,
    group_service: GroupService = Depends(get_group_service)
):
    """Get details of a specific group."""
    try:
        group = group_service.get_group(group_id)
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")
        return group
    except Exception as e:
        logger.error(f"Error getting group details: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# The /user-stats/{user_id} endpoint from the old router is removed.
# Its functionality is now handled by the individual friend and group services.
# A new, dedicated stats endpoint could be created if needed.
