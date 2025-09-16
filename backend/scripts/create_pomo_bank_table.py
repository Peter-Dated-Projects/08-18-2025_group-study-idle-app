#!/usr/bin/env python3
"""
PostgreSQL Database Migration Script - Add Pomo Bank Table
Creates the pomo_bank table for storing user currency balances.

This script:
1. Creates the pomo_bank table with user_id and bank_value columns
2. Sets up proper constraints and indexing
3. Optionally initializes existing users with default balance
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

def create_pomo_bank_table():
    """
    Create the pomo_bank table if it doesn't exist.
    """
    engine, SessionLocal, Session, text, Column, String, Integer, DateTime, declarative_base = setup_imports()
    
    # SQL to create the pomo_bank table
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS pomo_bank (
        user_id VARCHAR(255) PRIMARY KEY,
        bank_value INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Create index for faster lookups
    CREATE INDEX IF NOT EXISTS idx_pomo_bank_user_id ON pomo_bank(user_id);
    
    -- Add trigger to update updated_at timestamp
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql';
    
    DROP TRIGGER IF EXISTS update_pomo_bank_updated_at ON pomo_bank;
    CREATE TRIGGER update_pomo_bank_updated_at
        BEFORE UPDATE ON pomo_bank
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    """
    
    try:
        with engine.connect() as connection:
            # Execute the table creation
            connection.execute(text(create_table_sql))
            connection.commit()
            logger.info("✅ Successfully created pomo_bank table")
            
    except Exception as e:
        logger.error(f"❌ Error creating pomo_bank table: {e}")
        raise

def initialize_existing_users(default_balance=0):
    """
    Initialize existing users with default bank balance.
    
    Args:
        default_balance (int): Default balance to set for existing users
    """
    engine, SessionLocal, Session, text, Column, String, Integer, DateTime, declarative_base = setup_imports()
    
    try:
        with SessionLocal() as session:
            # Get all existing user IDs from various tables
            user_ids = set()
            
            # Check if tables exist and get users
            try:
                # Get users from user_stats table if it exists
                result = session.execute(text("SELECT DISTINCT user_id FROM user_stats"))
                for row in result:
                    user_ids.add(row[0])
                logger.info(f"Found {len(user_ids)} users in user_stats table")
            except Exception as e:
                logger.warning(f"Could not get users from user_stats: {e}")
            
            try:
                # Get users from user_relation table if it exists  
                result = session.execute(text("SELECT DISTINCT user_id FROM user_relation"))
                for row in result:
                    user_ids.add(row[0])
                logger.info(f"Total unique users found: {len(user_ids)}")
            except Exception as e:
                logger.warning(f"Could not get users from user_relation: {e}")
            
            if not user_ids:
                logger.info("No existing users found to initialize")
                return
            
            # Initialize users with default balance
            initialized_count = 0
            for user_id in user_ids:
                try:
                    # Insert with ON CONFLICT DO NOTHING to avoid duplicates
                    insert_sql = """
                    INSERT INTO pomo_bank (user_id, bank_value) 
                    VALUES (:user_id, :bank_value)
                    ON CONFLICT (user_id) DO NOTHING
                    """
                    
                    result = session.execute(
                        text(insert_sql),
                        {"user_id": user_id, "bank_value": default_balance}
                    )
                    
                    if result.rowcount > 0:
                        initialized_count += 1
                        logger.debug(f"Initialized bank account for user: {user_id}")
                        
                except Exception as e:
                    logger.error(f"Error initializing user {user_id}: {e}")
            
            session.commit()
            logger.info(f"✅ Successfully initialized {initialized_count} user bank accounts")
            
    except Exception as e:
        logger.error(f"❌ Error initializing existing users: {e}")
        raise

def verify_table_creation():
    """
    Verify that the pomo_bank table was created successfully.
    """
    engine, SessionLocal, Session, text, Column, String, Integer, DateTime, declarative_base = setup_imports()
    
    try:
        with engine.connect() as connection:
            # Check if table exists and get schema info
            result = connection.execute(text("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'pomo_bank'
                ORDER BY ordinal_position
            """))
            
            columns = result.fetchall()
            if not columns:
                logger.error("❌ pomo_bank table was not created")
                return False
            
            logger.info("✅ pomo_bank table structure:")
            for column in columns:
                logger.info(f"  - {column[0]}: {column[1]} (nullable: {column[2]}, default: {column[3]})")
            
            # Check row count
            result = connection.execute(text("SELECT COUNT(*) FROM pomo_bank"))
            count = result.fetchone()[0]
            logger.info(f"✅ pomo_bank table contains {count} records")
            
            return True
            
    except Exception as e:
        logger.error(f"❌ Error verifying table creation: {e}")
        return False

def main():
    """Main function to run the migration."""
    parser = argparse.ArgumentParser(description="Create pomo_bank table and initialize users")
    parser.add_argument("--init-users", action="store_true", help="Initialize existing users with default balance")
    parser.add_argument("--default-balance", type=int, default=0, help="Default balance for existing users (default: 0)")
    parser.add_argument("--verify-only", action="store_true", help="Only verify table exists, don't create")
    
    args = parser.parse_args()
    
    try:
        if args.verify_only:
            logger.info("🔍 Verifying pomo_bank table...")
            success = verify_table_creation()
            sys.exit(0 if success else 1)
        
        logger.info("🚀 Starting pomo_bank table migration...")
        
        # Create the table
        logger.info("📝 Creating pomo_bank table...")
        create_pomo_bank_table()
        
        # Initialize existing users if requested
        if args.init_users:
            logger.info(f"👥 Initializing existing users with balance: {args.default_balance}")
            initialize_existing_users(args.default_balance)
        
        # Verify creation
        logger.info("🔍 Verifying table creation...")
        verify_table_creation()
        
        logger.info("✅ Pomo bank migration completed successfully!")
        
    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()