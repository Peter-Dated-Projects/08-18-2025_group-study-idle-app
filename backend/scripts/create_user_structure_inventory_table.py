#!/usr/bin/env python3
"""
PostgreSQL Database Migration Script - Add User Structure Inventory Table
Creates the user_structure_inventory table for storing user-owned structure items.

This script:
1. Creates the user_structure_inventory table with user_id and structure_inventory columns
2. Sets up proper constraints and indexing
3. The structure_inventory column stores a JSON array of objects with structure_name (string) and count (int)
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

def create_user_structure_inventory_table():
    """
    Create the user_structure_inventory table if it doesn't exist.
    """
    engine, SessionLocal, Session, text, Column, String, Integer, DateTime, declarative_base = setup_imports()
    
    # SQL to create the user_structure_inventory table
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS user_structure_inventory (
        user_id VARCHAR(255) PRIMARY KEY,
        structure_inventory JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Create index for faster lookups
    CREATE INDEX IF NOT EXISTS idx_user_structure_inventory_user_id ON user_structure_inventory(user_id);
    
    -- Create GIN index for JSONB array searches (for efficient structure lookups)
    CREATE INDEX IF NOT EXISTS idx_user_structure_inventory_structures 
    ON user_structure_inventory USING GIN (structure_inventory);
    
    -- Add trigger to update updated_at timestamp
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql';
    
    DROP TRIGGER IF EXISTS update_user_structure_inventory_updated_at ON user_structure_inventory;
    CREATE TRIGGER update_user_structure_inventory_updated_at
        BEFORE UPDATE ON user_structure_inventory
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    """
    
    try:
        with engine.connect() as connection:
            # Execute the table creation
            connection.execute(text(create_table_sql))
            connection.commit()
            logger.info("✅ Successfully created user_structure_inventory table")
            
    except Exception as e:
        logger.error(f"❌ Error creating user_structure_inventory table: {e}")
        raise

def initialize_existing_users():
    """
    Initialize existing users with empty structure inventory.
    """
    engine, SessionLocal, Session, text, Column, String, Integer, DateTime, declarative_base = setup_imports()
    
    try:
        with engine.connect() as connection:
            # Get users who don't have inventory records yet
            # Assuming there's a users table - adjust as needed for your schema
            init_sql = """
            INSERT INTO user_structure_inventory (user_id, structure_inventory)
            SELECT DISTINCT u.user_id, '[]'::jsonb
            FROM (
                -- Replace this with your actual users source
                -- This example assumes there's a pomo_leaderboard table with user_id
                SELECT DISTINCT user_id FROM pomo_leaderboard
                UNION
                SELECT DISTINCT user_id FROM pomo_bank
            ) u
            WHERE u.user_id NOT IN (
                SELECT user_id FROM user_structure_inventory
            );
            """
            
            result = connection.execute(text(init_sql))
            connection.commit()
            logger.info(f"✅ Initialized {result.rowcount} users with empty structure inventory")
            
    except Exception as e:
        logger.error(f"❌ Error initializing existing users: {e}")
        # Don't raise here as this is optional

def main():
    """Main function to create the table and optionally initialize users."""
    parser = argparse.ArgumentParser(description='Create user_structure_inventory table')
    parser.add_argument('--init-users', action='store_true', 
                       help='Initialize existing users with empty inventory')
    
    args = parser.parse_args()
    
    logger.info("Starting user_structure_inventory table creation...")
    
    try:
        # Create the table
        create_user_structure_inventory_table()
        
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