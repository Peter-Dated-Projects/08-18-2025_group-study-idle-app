"""
Router for user statistics.
Provides an endpoint to get aggregated user stats for the frontend.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session

from ..services.friend_service_arangodb import get_friend_service, FriendService
from ..services.group_service_arangodb import get_group_service, GroupService
from ..models.database import get_db, PomoLeaderboard

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/user-stats",
    tags=["user-stats"],
    responses={404: {"description": "Not found"}},
)

# Pydantic model for the response
class UserStatsData(BaseModel):
    user_id: str
    group_count: int
    group_ids: List[str]
    friend_count: int
    total_pomo: int

class UserStatsResponse(BaseModel):
    success: bool
    stats: Optional[UserStatsData] = None

@router.get("/{user_id}", response_model=UserStatsResponse)
async def get_user_stats(
    user_id: str,
    db: Session = Depends(get_db),
    friend_service: FriendService = Depends(get_friend_service),
    group_service: GroupService = Depends(get_group_service),
):
    """Get aggregated user statistics including group and friend counts."""
    try:
        # Get friend stats from ArangoDB
        friends = friend_service.get_friends(user_id)
        friend_count = len(friends)

        # Get group stats from ArangoDB
        groups = group_service.get_user_groups(user_id)
        group_count = len(groups)
        group_ids = [group['group_id'] for group in groups]

        # Get pomodoro stats from PostgreSQL
        pomo_stats = db.query(PomoLeaderboard).filter(PomoLeaderboard.user_id == user_id).first()
        total_pomo = pomo_stats.yearly_pomo_duration if pomo_stats else 0

        stats = UserStatsData(
            user_id=user_id,
            group_count=group_count,
            group_ids=group_ids,
            friend_count=friend_count,
            total_pomo=total_pomo,
        )

        return UserStatsResponse(success=True, stats=stats)

    except Exception as e:
        logger.error(f"Error getting user stats for user '{user_id}': {e}")
        # Return a failure response instead of raising an exception,
        # to match the pattern of the old endpoint.
        return UserStatsResponse(success=False, stats=None)
