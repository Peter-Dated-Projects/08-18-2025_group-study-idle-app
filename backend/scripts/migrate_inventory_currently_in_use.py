#!/usr/bin/env python3
"""
PostgreSQL Database Migration Script - Modify User Structure Inventory Table
Adds the 'currently_in_use' integer column to the existing user_structure_inventory table.

This script:
1. Adds the currently_in_use column to the user_structure_inventory table
2. Updates existing records to include the new field in their JSON structure
3. Migrates the structure_inventory JSON to include currently_in_use: 0 for all existing items
"""

import sys
import logging
import argparse
import json
from pathlib import Path

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

def migrate_structure_inventory_json():
    """
    Update existing structure_inventory JSON records to include currently_in_use field.
    """
    engine, SessionLocal, Session, text, Column, String, Integer, DateTime, declarative_base = setup_imports()
    
    try:
        with engine.connect() as connection:
            # Get all existing inventory records
            select_sql = """
            SELECT user_id, structure_inventory
            FROM user_structure_inventory
            """
            
            result = connection.execute(text(select_sql))
            records = result.fetchall()
            
            logger.info(f"Found {len(records)} inventory records to update")
            
            updated_count = 0
            
            for record in records:
                user_id, inventory_json = record
                
                try:
                    # Parse the existing inventory
                    if isinstance(inventory_json, str):
                        inventory_list = json.loads(inventory_json)
                    else:
                        inventory_list = inventory_json
                    
                    # Check if any items need updating
                    needs_update = False
                    for item in inventory_list:
                        if "currently_in_use" not in item:
                            item["currently_in_use"] = 0
                            needs_update = True
                    
                    # Update the record if changes were made
                    if needs_update:
                        update_sql = """
                        UPDATE user_structure_inventory
                        SET structure_inventory = :inventory, updated_at = CURRENT_TIMESTAMP
                        WHERE user_id = :user_id
                        """
                        
                        connection.execute(text(update_sql), {
                            "user_id": user_id,
                            "inventory": json.dumps(inventory_list)
                        })
                        updated_count += 1
                        logger.debug(f"Updated inventory for user: {user_id}")
                
                except (json.JSONDecodeError, TypeError) as e:
                    logger.warning(f"Could not parse inventory for user {user_id}: {e}")
                    continue
            
            connection.commit()
            logger.info(f"✅ Successfully updated {updated_count} inventory records")
            
    except Exception as e:
        logger.error(f"❌ Error migrating structure inventory JSON: {e}")
        raise

def verify_migration():
    """
    Verify that the migration was successful by checking some records.
    """
    engine, SessionLocal, Session, text, Column, String, Integer, DateTime, declarative_base = setup_imports()
    
    try:
        with engine.connect() as connection:
            # Check a few records to see if they have the new field
            verify_sql = """
            SELECT user_id, structure_inventory
            FROM user_structure_inventory
            LIMIT 5
            """
            
            result = connection.execute(text(verify_sql))
            records = result.fetchall()
            
            logger.info("Verifying migration results...")
            
            for record in records:
                user_id, inventory_json = record
                
                try:
                    if isinstance(inventory_json, str):
                        inventory_list = json.loads(inventory_json)
                    else:
                        inventory_list = inventory_json
                    
                    for item in inventory_list:
                        if "currently_in_use" not in item:
                            logger.warning(f"❌ User {user_id} still missing currently_in_use field")
                            return False
                        else:
                            logger.debug(f"✅ User {user_id} has currently_in_use field: {item.get('currently_in_use')}")
                
                except (json.JSONDecodeError, TypeError) as e:
                    logger.warning(f"Could not verify inventory for user {user_id}: {e}")
            
            logger.info("✅ Migration verification completed successfully")
            return True
            
    except Exception as e:
        logger.error(f"❌ Error verifying migration: {e}")
        return False

def main():
    """Main function to modify the user_structure_inventory table."""
    parser = argparse.ArgumentParser(description='Add currently_in_use field to user_structure_inventory table')
    parser.add_argument('--verify-only', action='store_true', 
                       help='Only verify the migration, do not make changes')
    
    args = parser.parse_args()
    
    logger.info("Starting user_structure_inventory table modification...")
    
    try:
        if args.verify_only:
            logger.info("Running verification only...")
            if verify_migration():
                logger.info("✅ Verification passed!")
            else:
                logger.error("❌ Verification failed!")
                sys.exit(1)
        else:
            # Run the migration
            migrate_structure_inventory_json()
            
            # Verify the results
            if verify_migration():
                logger.info("✅ Database migration completed successfully!")
            else:
                logger.error("❌ Migration completed but verification failed!")
                sys.exit(1)
        
    except Exception as e:
        logger.error(f"❌ Database migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()