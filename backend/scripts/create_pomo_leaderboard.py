#!/usr/bin/env python3
"""
Create the pomo_leaderboard table in the database.
This script can be run to add the new table to an existing database.
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
    
    from app.models.database import engine, Base, PomoLeaderboard
    return engine, Base, PomoLeaderboard

def create_pomo_leaderboard_table():
    """
    Create the pomo_leaderboard table if it doesn't exist.
    """
    try:
        engine, Base, PomoLeaderboard = setup_imports()
        
        logger.info("Creating pomo_leaderboard table...")
        
        # Create only the PomoLeaderboard table
        PomoLeaderboard.__table__.create(engine, checkfirst=True)
        
        logger.info("✅ pomo_leaderboard table created successfully!")
        
        # Verify the table was created
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        if 'pomo_leaderboard' in tables:
            logger.info("✅ Table verification: pomo_leaderboard exists in database")
            
            # Show table structure
            columns = inspector.get_columns('pomo_leaderboard')
            logger.info("📋 Table structure:")
            for col in columns:
                logger.info(f"  - {col['name']}: {col['type']} (nullable: {col['nullable']})")
        else:
            logger.error("❌ Table verification failed: pomo_leaderboard not found")
            
    except Exception as e:
        logger.error(f"❌ Failed to create pomo_leaderboard table: {e}")
        raise

def create_all_tables():
    """
    Create all database tables (in case you want to initialize the entire schema).
    """
    try:
        engine, Base, PomoLeaderboard = setup_imports()
        
        logger.info("Creating all database tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("✅ All database tables created successfully!")
        
    except Exception as e:
        logger.error(f"❌ Failed to create database tables: {e}")
        raise

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create database tables")
    parser.add_argument(
        "--all", 
        action="store_true", 
        help="Create all tables (not just pomo_leaderboard)"
    )
    
    args = parser.parse_args()
    
    if args.all:
        create_all_tables()
    else:
        create_pomo_leaderboard_table()
