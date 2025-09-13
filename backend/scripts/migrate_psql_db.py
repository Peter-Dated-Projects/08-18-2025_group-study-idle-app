#!/usr/bin/env python3
"""
PostgreSQL Database Migration Script
Populates new tables with default data for existing users.

This script:
1. Finds all existing users from UserRelation and UserStats tables
2. Creates default pomo_leaderboard entries for users who don't have them
3. Optionally migrates existing pomo_count from UserStats to PomoLeaderboard
"""

import sys
import logging
import argparse
from pathlib import Path
from datetime import datetime, UTC

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def setup_imports():
    """Setup imports after adding parent directory to path."""
    # Add the parent directory to the Python path to import app modules
    parent_dir = Path(__file__).parent.parent
    sys.path.append(str(parent_dir))
    
    from app.models.database import engine, SessionLocal, UserRelation, UserStats, PomoLeaderboard
    from sqlalchemy.orm import Session
    from sqlalchemy import text
    
    return engine, SessionLocal, UserRelation, UserStats, PomoLeaderboard, Session, text

def get_all_existing_users(session):
    """
    Get all unique user IDs from existing tables.
    
    Returns:
        set: Set of unique user IDs from UserRelation and UserStats tables
    """
    engine, SessionLocal, UserRelation, UserStats, PomoLeaderboard, Session, text = setup_imports()
    
    user_ids = set()
    
    # Get users from UserRelation table
    user_relations = session.query(UserRelation).all()
    for relation in user_relations:
        user_ids.add(relation.user_id)
        logger.debug(f"Found user in UserRelation: {relation.user_id}")
    
    # Get users from UserStats table
    user_stats = session.query(UserStats).all()
    for stats in user_stats:
        user_ids.add(stats.user_id)
        logger.debug(f"Found user in UserStats: {stats.user_id}")
    
    # Get users from StudyGroup table (creators and members)
    result = session.execute(text("SELECT creator_id, member_ids FROM study_groups"))
    for row in result:
        creator_id, member_ids = row
        if creator_id:
            user_ids.add(creator_id)
            logger.debug(f"Found creator in StudyGroup: {creator_id}")
        
        if member_ids:
            for member_id in member_ids:
                if member_id:
                    user_ids.add(member_id)
                    logger.debug(f"Found member in StudyGroup: {member_id}")
    
    logger.info(f"Found {len(user_ids)} unique users across all tables")
    return user_ids

def migrate_existing_pomo_counts(session, user_id, user_stats):
    """
    Migrate existing pomo_count from UserStats to PomoLeaderboard.
    
    Args:
        session: Database session
        user_id: User ID to migrate
        user_stats: UserStats object containing pomo_count
        
    Returns:
        int: Migrated pomo count (converted to integer)
    """
    try:
        # Convert string pomo_count to integer
        existing_pomo = int(user_stats.pomo_count) if user_stats.pomo_count else 0
        logger.debug(f"Migrating {existing_pomo} pomodoros for user {user_id}")
        return existing_pomo
    except (ValueError, AttributeError):
        logger.warning(f"Could not parse pomo_count for user {user_id}, defaulting to 0")
        return 0

def populate_pomo_leaderboard(migrate_existing=True, dry_run=False):
    """
    Populate the pomo_leaderboard table with default data for existing users.
    
    Args:
        migrate_existing (bool): Whether to migrate existing pomo_count from UserStats
        dry_run (bool): If True, show what would be done without making changes
    """
    engine, SessionLocal, UserRelation, UserStats, PomoLeaderboard, Session, text = setup_imports()
    
    session = SessionLocal()
    
    try:
        logger.info("Starting pomo_leaderboard migration...")
        
        # Get all existing users
        all_user_ids = get_all_existing_users(session)
        
        if not all_user_ids:
            logger.warning("No existing users found! Nothing to migrate.")
            return
        
        # Get existing pomo_leaderboard entries
        existing_leaderboard = session.query(PomoLeaderboard).all()
        existing_leaderboard_ids = {entry.user_id for entry in existing_leaderboard}
        
        logger.info(f"Found {len(existing_leaderboard_ids)} existing pomo_leaderboard entries")
        
        # Find users who need pomo_leaderboard entries
        users_to_migrate = all_user_ids - existing_leaderboard_ids
        
        if not users_to_migrate:
            logger.info("All users already have pomo_leaderboard entries! Nothing to migrate.")
            return
        
        logger.info(f"Need to create pomo_leaderboard entries for {len(users_to_migrate)} users")
        
        # Get UserStats for existing pomo counts if migrating
        user_stats_map = {}
        if migrate_existing:
            user_stats = session.query(UserStats).all()
            user_stats_map = {stats.user_id: stats for stats in user_stats}
        
        # Create new pomo_leaderboard entries
        new_entries = []
        for user_id in users_to_migrate:
            # Determine initial pomo counts
            if migrate_existing and user_id in user_stats_map:
                existing_pomo = migrate_existing_pomo_counts(session, user_id, user_stats_map[user_id])
                # Distribute existing pomos across time periods (simple heuristic)
                daily_pomo = existing_pomo
                weekly_pomo = existing_pomo  
                monthly_pomo = existing_pomo
                yearly_pomo = existing_pomo
            else:
                # Default values for new users
                daily_pomo = 0
                weekly_pomo = 0
                monthly_pomo = 0
                yearly_pomo = 0
            
            new_entry = PomoLeaderboard(
                user_id=user_id,
                daily_pomo=daily_pomo,
                weekly_pomo=weekly_pomo,
                monthly_pomo=monthly_pomo,
                yearly_pomo=yearly_pomo,
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC)
            )
            
            new_entries.append(new_entry)
            
            if migrate_existing and user_id in user_stats_map:
                logger.info(f"📊 User {user_id}: Migrating {existing_pomo} pomodoros")
            else:
                logger.info(f"👤 User {user_id}: Creating with default values (0 pomodoros)")
        
        if dry_run:
            logger.info("🔍 DRY RUN: Would create the following entries:")
            for entry in new_entries:
                logger.info(f"  User {entry.user_id}: daily={entry.daily_pomo}, weekly={entry.weekly_pomo}, monthly={entry.monthly_pomo}, yearly={entry.yearly_pomo}")
            logger.info(f"🔍 DRY RUN: Would create {len(new_entries)} new pomo_leaderboard entries")
        else:
            # Insert new entries
            session.add_all(new_entries)
            session.commit()
            
            logger.info(f"✅ Successfully created {len(new_entries)} new pomo_leaderboard entries!")
            
            # Verify the migration
            total_leaderboard_entries = session.query(PomoLeaderboard).count()
            logger.info(f"✅ Total pomo_leaderboard entries after migration: {total_leaderboard_entries}")
    
    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        session.rollback()
        raise
    
    finally:
        session.close()

def show_migration_status():
    """Show current migration status and statistics."""
    engine, SessionLocal, UserRelation, UserStats, PomoLeaderboard, Session, text = setup_imports()
    
    session = SessionLocal()
    
    try:
        logger.info("📊 Current Migration Status:")
        
        # Count users in each table
        user_relation_count = session.query(UserRelation).count()
        user_stats_count = session.query(UserStats).count()
        pomo_leaderboard_count = session.query(PomoLeaderboard).count()
        
        logger.info(f"  UserRelation entries: {user_relation_count}")
        logger.info(f"  UserStats entries: {user_stats_count}")
        logger.info(f"  PomoLeaderboard entries: {pomo_leaderboard_count}")
        
        # Get unique users across all tables
        all_user_ids = get_all_existing_users(session)
        logger.info(f"  Total unique users: {len(all_user_ids)}")
        
        # Show migration gap
        migration_gap = len(all_user_ids) - pomo_leaderboard_count
        if migration_gap > 0:
            logger.warning(f"  ⚠️  {migration_gap} users missing from pomo_leaderboard")
        else:
            logger.info("  ✅ All users have pomo_leaderboard entries")
        
        # Show sample data
        if pomo_leaderboard_count > 0:
            logger.info("📋 Sample pomo_leaderboard entries:")
            sample_entries = session.query(PomoLeaderboard).limit(5).all()
            for entry in sample_entries:
                logger.info(f"  {entry.user_id}: daily={entry.daily_pomo}, weekly={entry.weekly_pomo}, monthly={entry.monthly_pomo}, yearly={entry.yearly_pomo}")
    
    except Exception as e:
        logger.error(f"❌ Failed to show status: {e}")
        raise
    
    finally:
        session.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate PostgreSQL database tables")
    parser.add_argument(
        "--status", 
        action="store_true",
        help="Show current migration status without making changes"
    )
    parser.add_argument(
        "--dry-run", 
        action="store_true",
        help="Show what would be migrated without making changes"
    )
    parser.add_argument(
        "--no-migrate-existing", 
        action="store_true",
        help="Don't migrate existing pomo_count values from UserStats"
    )
    
    args = parser.parse_args()
    
    if args.status:
        show_migration_status()
    else:
        migrate_existing = not args.no_migrate_existing
        populate_pomo_leaderboard(migrate_existing=migrate_existing, dry_run=args.dry_run)
