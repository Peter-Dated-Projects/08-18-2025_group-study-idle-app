#!/usr/bin/env python3
"""
Migration script to update pomo_leaderboard table structure:
- Rename columns from pomo counts to pomo durations
- Update existing data if any exists

This script will:
1. Check current table structure
2. Add new duration columns
3. Copy data from old columns to new ones (if data exists)
4. Drop old columns
5. Update Redis cache structure if needed
"""

import sys
import logging
import argparse
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def setup_imports():
    """Setup imports after adding parent directory to path."""
    # Add the parent directory to the Python path to import app modules
    parent_dir = Path(__file__).parent.parent
    sys.path.append(str(parent_dir))
    
    from app.models.database import engine
    from sqlalchemy import text, inspect
    return engine, text, inspect

def check_table_structure():
    """Check current table structure."""
    try:
        engine, text, inspect = setup_imports()
        inspector = inspect(engine)
        
        if 'pomo_leaderboard' not in inspector.get_table_names():
            logger.error("❌ pomo_leaderboard table not found!")
            return False
            
        columns = inspector.get_columns('pomo_leaderboard')
        logger.info("📋 Current table structure:")
        for col in columns:
            logger.info(f"  - {col['name']}: {col['type']} (nullable: {col['nullable']})")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to check table structure: {e}")
        return False

def migrate_to_duration_fields():
    """Migrate the table structure from count to duration fields."""
    try:
        engine, text, inspect = setup_imports()
        
        logger.info("🔄 Starting migration to duration fields...")
        
        with engine.connect() as conn:
            # Start transaction
            trans = conn.begin()
            
            try:
                # Check if old columns exist
                inspector = inspect(engine)
                columns = [col['name'] for col in inspector.get_columns('pomo_leaderboard')]
                
                old_columns = ['daily_pomo', 'weekly_pomo', 'monthly_pomo', 'yearly_pomo']
                new_columns = ['daily_pomo_duration', 'weekly_pomo_duration', 'monthly_pomo_duration', 'yearly_pomo_duration']
                
                # Check what columns exist
                has_old_columns = any(col in columns for col in old_columns)
                has_new_columns = any(col in columns for col in new_columns)
                
                if has_new_columns and not has_old_columns:
                    logger.info("✅ Table already has new duration columns. No migration needed.")
                    return True
                
                if has_old_columns:
                    logger.info("🔧 Found old count columns. Adding new duration columns...")
                    
                    # Add new duration columns
                    for new_col in new_columns:
                        if new_col not in columns:
                            logger.info(f"   Adding column: {new_col}")
                            conn.execute(text(f"ALTER TABLE pomo_leaderboard ADD COLUMN {new_col} INTEGER DEFAULT 0"))
                    
                    # Copy data from old columns to new ones (assuming 1 pomo = 25 minutes for conversion)
                    logger.info("📊 Converting count data to duration data (assuming 25 minutes per pomodoro)...")
                    
                    for old_col, new_col in zip(old_columns, new_columns):
                        if old_col in columns:
                            logger.info(f"   Converting {old_col} -> {new_col}")
                            conn.execute(text(f"UPDATE pomo_leaderboard SET {new_col} = {old_col} * 25"))
                    
                    # Drop old columns
                    logger.info("🗑️ Dropping old count columns...")
                    for old_col in old_columns:
                        if old_col in columns:
                            logger.info(f"   Dropping column: {old_col}")
                            conn.execute(text(f"ALTER TABLE pomo_leaderboard DROP COLUMN {old_col}"))
                
                else:
                    logger.info("🆕 No existing columns found. Adding new duration columns...")
                    
                    # Add new duration columns
                    for new_col in new_columns:
                        logger.info(f"   Adding column: {new_col}")
                        conn.execute(text(f"ALTER TABLE pomo_leaderboard ADD COLUMN {new_col} INTEGER DEFAULT 0"))
                
                # Commit transaction
                trans.commit()
                logger.info("✅ Migration completed successfully!")
                
                # Verify new structure
                logger.info("🔍 Verifying new table structure...")
                inspector = inspect(engine)
                columns = inspector.get_columns('pomo_leaderboard')
                logger.info("📋 Updated table structure:")
                for col in columns:
                    logger.info(f"  - {col['name']}: {col['type']} (nullable: {col['nullable']})")
                
                return True
                
            except Exception as e:
                trans.rollback()
                logger.error(f"❌ Migration failed, rolling back: {e}")
                return False
                
    except Exception as e:
        logger.error(f"❌ Failed to migrate table: {e}")
        return False

def clear_redis_cache():
    """Clear Redis cache to ensure fresh data."""
    try:
        # Try to import Redis utilities
        parent_dir = Path(__file__).parent.parent
        sys.path.append(str(parent_dir))
        
        import redis
        import os
        from dotenv import load_dotenv
        
        # Load environment variables
        config_dir = Path(__file__).parent.parent / "config"
        env_file = config_dir / ".env"
        load_dotenv(env_file)
        
        # Connect to Redis
        redis_host = os.getenv("REDIS_HOST", "localhost")
        redis_port = int(os.getenv("REDIS_PORT", 6379))
        redis_password = os.getenv("REDIS_PASSWORD")
        
        logger.info(f"🔄 Connecting to Redis at {redis_host}:{redis_port}...")
        
        r = redis.Redis(
            host=redis_host,
            port=redis_port,
            password=redis_password,
            decode_responses=True
        )
        
        # Test connection
        r.ping()
        
        # Clear relevant cache keys
        logger.info("🧹 Clearing Redis cache for leaderboard data...")
        
        # Clear any existing leaderboard cache keys
        patterns = [
            "leaderboard:*",
            "user_stats:*",
            "pomo:*"
        ]
        
        for pattern in patterns:
            keys = r.keys(pattern)
            if keys:
                logger.info(f"   Deleting {len(keys)} keys matching pattern: {pattern}")
                r.delete(*keys)
        
        logger.info("✅ Redis cache cleared successfully!")
        return True
        
    except ImportError:
        logger.warning("⚠️ Redis not available, skipping cache clear")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to clear Redis cache: {e}")
        return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate pomo_leaderboard table to duration fields")
    parser.add_argument(
        "--check-only", 
        action="store_true", 
        help="Only check current table structure, don't migrate"
    )
    parser.add_argument(
        "--skip-redis", 
        action="store_true", 
        help="Skip Redis cache clearing"
    )
    
    args = parser.parse_args()
    
    # Check table structure first
    if not check_table_structure():
        logger.error("❌ Cannot proceed without valid table structure")
        sys.exit(1)
    
    if args.check_only:
        logger.info("✅ Table structure check completed.")
        sys.exit(0)
    
    # Run migration
    if migrate_to_duration_fields():
        logger.info("✅ Database migration successful!")
        
        # Clear Redis cache unless skipped
        if not args.skip_redis:
            clear_redis_cache()
        
        logger.info("🎉 Migration completed successfully!")
    else:
        logger.error("❌ Migration failed!")
        sys.exit(1)
