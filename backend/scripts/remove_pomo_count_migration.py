#!/usr/bin/env python3
"""
Remove pomo_count from UserStats and migrate all functionality to PomoLeaderboard.

This script:
1. Ensures all pomo_count data is migrated to PomoLeaderboard
2. Removes the pomo_count column from user_stats table
3. Provides verification of the migration
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
    
    from app.models.database import engine, SessionLocal, UserStats, PomoLeaderboard
    from sqlalchemy.orm import Session
    from sqlalchemy import text, inspect
    
    return engine, SessionLocal, UserStats, PomoLeaderboard, Session, text, inspect

def migrate_remaining_pomo_counts(dry_run=False):
    """
    Migrate any remaining pomo_count data from UserStats to PomoLeaderboard.
    
    Args:
        dry_run (bool): If True, show what would be done without making changes
    """
    engine, SessionLocal, UserStats, PomoLeaderboard, Session, text, inspect = setup_imports()
    
    session = SessionLocal()
    
    try:
        logger.info("Checking for pomo_count data that needs migration...")
        
        # Get all UserStats with non-zero pomo_count
        user_stats = session.query(UserStats).all()
        users_with_pomo = []
        
        for stats in user_stats:
            try:
                pomo_count = int(stats.pomo_count) if stats.pomo_count else 0
                if pomo_count > 0:
                    users_with_pomo.append((stats.user_id, pomo_count))
            except ValueError:
                logger.warning(f"Invalid pomo_count for user {stats.user_id}: {stats.pomo_count}")
        
        if not users_with_pomo:
            logger.info("✅ No pomo_count data needs migration - all values are 0")
            return True
        
        logger.info(f"Found {len(users_with_pomo)} users with pomo_count > 0")
        
        # Check existing PomoLeaderboard entries
        existing_leaderboard = session.query(PomoLeaderboard).all()
        existing_ids = {entry.user_id for entry in existing_leaderboard}
        
        updates_needed = []
        creates_needed = []
        
        for user_id, pomo_count in users_with_pomo:
            if user_id in existing_ids:
                # Update existing entry
                updates_needed.append((user_id, pomo_count))
            else:
                # Create new entry
                creates_needed.append((user_id, pomo_count))
        
        if dry_run:
            logger.info("🔍 DRY RUN: Would perform the following migrations:")
            for user_id, pomo_count in updates_needed:
                logger.info(f"  UPDATE: User {user_id} - add {pomo_count} to all time periods")
            for user_id, pomo_count in creates_needed:
                logger.info(f"  CREATE: User {user_id} - new entry with {pomo_count} pomodoros")
            return True
        
        # Perform updates
        for user_id, pomo_count in updates_needed:
            entry = session.query(PomoLeaderboard).filter_by(user_id=user_id).first()
            entry.daily_pomo += pomo_count
            entry.weekly_pomo += pomo_count  
            entry.monthly_pomo += pomo_count
            entry.yearly_pomo += pomo_count
            entry.updated_at = datetime.now(UTC)
            logger.info(f"📊 Updated user {user_id}: added {pomo_count} pomodoros to all periods")
        
        # Perform creates
        for user_id, pomo_count in creates_needed:
            new_entry = PomoLeaderboard(
                user_id=user_id,
                daily_pomo=pomo_count,
                weekly_pomo=pomo_count,
                monthly_pomo=pomo_count,
                yearly_pomo=pomo_count,
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC)
            )
            session.add(new_entry)
            logger.info(f"🆕 Created user {user_id}: {pomo_count} pomodoros in all periods")
        
        session.commit()
        logger.info(f"✅ Successfully migrated {len(users_with_pomo)} users with pomo_count data")
        return True
        
    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        session.rollback()
        return False
    
    finally:
        session.close()

def remove_pomo_count_column(dry_run=False):
    """
    Remove the pomo_count column from user_stats table.
    
    Args:
        dry_run (bool): If True, show what would be done without making changes
    """
    engine, SessionLocal, UserStats, PomoLeaderboard, Session, text, inspect = setup_imports()
    
    try:
        # Check if column exists
        inspector = inspect(engine)
        columns = inspector.get_columns('user_stats')
        column_names = [col['name'] for col in columns]
        
        if 'pomo_count' not in column_names:
            logger.info("✅ pomo_count column already removed from user_stats table")
            return True
        
        if dry_run:
            logger.info("🔍 DRY RUN: Would remove pomo_count column from user_stats table")
            return True
        
        logger.info("Removing pomo_count column from user_stats table...")
        
        # Execute the ALTER TABLE statement
        with engine.connect() as connection:
            connection.execute(text("ALTER TABLE user_stats DROP COLUMN IF EXISTS pomo_count"))
            connection.commit()
        
        logger.info("✅ Successfully removed pomo_count column from user_stats table")
        
        # Verify removal
        inspector = inspect(engine)
        columns = inspector.get_columns('user_stats')
        column_names = [col['name'] for col in columns]
        
        if 'pomo_count' not in column_names:
            logger.info("✅ Verified: pomo_count column no longer exists in user_stats")
        else:
            logger.error("❌ Error: pomo_count column still exists after removal attempt")
            return False
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to remove pomo_count column: {e}")
        return False

def verify_migration():
    """Verify the migration was successful."""
    engine, SessionLocal, UserStats, PomoLeaderboard, Session, text, inspect = setup_imports()
    
    session = SessionLocal()
    
    try:
        logger.info("🔍 Verifying migration results...")
        
        # Check user_stats table structure
        inspector = inspect(engine)
        columns = inspector.get_columns('user_stats')
        column_names = [col['name'] for col in columns]
        
        logger.info(f"📋 user_stats columns: {column_names}")
        
        if 'pomo_count' in column_names:
            logger.warning("⚠️  pomo_count column still exists in user_stats")
        else:
            logger.info("✅ pomo_count column successfully removed from user_stats")
        
        # Check PomoLeaderboard data
        pomo_entries = session.query(PomoLeaderboard).all()
        user_stats_count = session.query(UserStats).count()
        
        logger.info("📊 Statistics:")
        logger.info(f"  UserStats entries: {user_stats_count}")
        logger.info(f"  PomoLeaderboard entries: {len(pomo_entries)}")
        
        if len(pomo_entries) >= user_stats_count:
            logger.info("✅ All users have PomoLeaderboard entries")
        else:
            logger.warning(f"⚠️  {user_stats_count - len(pomo_entries)} users missing from PomoLeaderboard")
        
        # Show sample data
        if pomo_entries:
            logger.info("📋 Sample PomoLeaderboard entries:")
            for entry in pomo_entries[:3]:
                logger.info(f"  {entry.user_id}: daily={entry.daily_pomo}, weekly={entry.weekly_pomo}, monthly={entry.monthly_pomo}, yearly={entry.yearly_pomo}")
        
    except Exception as e:
        logger.error(f"❌ Verification failed: {e}")
        
    finally:
        session.close()

def full_migration(dry_run=False):
    """
    Perform the complete migration from UserStats.pomo_count to PomoLeaderboard.
    
    Args:
        dry_run (bool): If True, show what would be done without making changes
    """
    logger.info("🚀 Starting complete pomo_count migration...")
    
    # Step 1: Migrate any remaining pomo_count data
    if not migrate_remaining_pomo_counts(dry_run=dry_run):
        logger.error("❌ Failed to migrate pomo_count data. Aborting.")
        return False
    
    # Step 2: Remove pomo_count column (only if not dry run)
    if not dry_run:
        if not remove_pomo_count_column(dry_run=dry_run):
            logger.error("❌ Failed to remove pomo_count column. Aborting.")
            return False
    else:
        remove_pomo_count_column(dry_run=dry_run)
    
    # Step 3: Verify migration
    if not dry_run:
        verify_migration()
    
    logger.info("✅ Complete pomo_count migration finished!")
    return True

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Remove pomo_count from UserStats and migrate to PomoLeaderboard")
    parser.add_argument(
        "--dry-run", 
        action="store_true",
        help="Show what would be done without making changes"
    )
    parser.add_argument(
        "--verify-only", 
        action="store_true",
        help="Only verify the current state without making changes"
    )
    
    args = parser.parse_args()
    
    if args.verify_only:
        verify_migration()
    else:
        full_migration(dry_run=args.dry_run)
