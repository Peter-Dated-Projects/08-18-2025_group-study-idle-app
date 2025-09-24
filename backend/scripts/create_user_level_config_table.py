#!/usr/bin/env python3
"""
PostgreSQL Database Migration Script - Add User Level Config Table
Creates the user_level_config table for storing user world/land configurations.

This script:
1. Creates the user_level_config table with user_id, created_at, updated_at, and level_config columns
2. The level_config column stores a JSON array of 7 strings (initially all "empty")
3. Sets up proper constraints and indexing
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
    
    from app.models.database import engine, SessionLocal
    from sqlalchemy.orm import Session
    from sqlalchemy import text, Column, String, Integer, DateTime
    from sqlalchemy.ext.declarative import declarative_base
    
    return engine, SessionLocal, Session, text, Column, String, Integer, DateTime, declarative_base

def create_user_level_config_table():
    """
    Create the user_level_config table if it doesn't exist.
    """
    engine, SessionLocal, Session, text, Column, String, Integer, DateTime, declarative_base = setup_imports()
    
    # SQL to create the user_level_config table
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS user_level_config (
        user_id VARCHAR(255) PRIMARY KEY,
        level_config JSONB NOT NULL DEFAULT '["empty", "empty", "empty", "empty", "empty", "empty", "empty"]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Create index for faster lookups
    CREATE INDEX IF NOT EXISTS idx_user_level_config_user_id ON user_level_config(user_id);
    
    -- Create GIN index for JSONB array searches (for efficient level config lookups)
    CREATE INDEX IF NOT EXISTS idx_user_level_config_level_config 
    ON user_level_config USING GIN (level_config);
    
    -- Add trigger to update updated_at timestamp
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql';
    
    DROP TRIGGER IF EXISTS update_user_level_config_updated_at ON user_level_config;
    CREATE TRIGGER update_user_level_config_updated_at
        BEFORE UPDATE ON user_level_config
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    """
    
    try:
        with engine.connect() as connection:
            # Execute the table creation
            connection.execute(text(create_table_sql))
            connection.commit()
            logger.info("✅ Successfully created user_level_config table")
            
    except Exception as e:
        logger.error(f"❌ Error creating user_level_config table: {e}")
        raise

def initialize_existing_users():
    """
    Initialize existing users with default level config (7 "empty" strings).
    """
    engine, SessionLocal, Session, text, Column, String, Integer, DateTime, declarative_base = setup_imports()
    
    try:
        with engine.connect() as connection:
            # Get users who don't have level config records yet
            init_sql = """
            INSERT INTO user_level_config (user_id, level_config)
            SELECT DISTINCT u.user_id, '["empty", "empty", "empty", "empty", "empty", "empty", "empty"]'::jsonb
            FROM (
                -- Get users from existing tables
                SELECT DISTINCT user_id FROM pomo_leaderboard
                UNION
                SELECT DISTINCT user_id FROM pomo_bank
                UNION
                SELECT DISTINCT user_id FROM user_structure_inventory
            ) u
            WHERE u.user_id NOT IN (
                SELECT user_id FROM user_level_config
            );
            """
            
            result = connection.execute(text(init_sql))
            connection.commit()
            logger.info(f"✅ Initialized {result.rowcount} users with default level config")
            
    except Exception as e:
        logger.error(f"❌ Error initializing existing users: {e}")
        # Don't raise here as this is optional

def main():
    """Main function to create the table and optionally initialize users."""
    parser = argparse.ArgumentParser(description='Create user_level_config table')
    parser.add_argument('--init-users', action='store_true', 
                       help='Initialize existing users with default level config')
    
    args = parser.parse_args()
    
    logger.info("Starting user_level_config table creation...")
    
    try:
        # Create the table
        create_user_level_config_table()
        
        # Initialize existing users if requested
        if args.init_users:
            logger.info("Initializing existing users...")
            initialize_existing_users()
        
        logger.info("✅ Database migration completed successfully!")
        
    except Exception as e:
        logger.error(f"❌ Database migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()