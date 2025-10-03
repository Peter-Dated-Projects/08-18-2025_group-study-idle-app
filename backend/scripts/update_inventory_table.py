#!/usr/bin/env python3
"""
Update PostgreSQL user_structure_inventory table to match current setup.

This script:
1. Runs the data cleanup to remove currently_in_use fields
2. Updates table default value to use new object format instead of array format
3. Validates the changes

Run from the project root directory:
    python backend/scripts/update_inventory_table.py
"""

import os
import sys
import json
import logging
import argparse
from typing import Dict, Any

# Add the backend directory to Python path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

# Import database models and session
from app.models.database import SessionLocal
from sqlalchemy import text

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def clean_inventory_data(inventory_data: Any) -> Dict:
    """
    Clean inventory data by removing currently_in_use fields and converting to object format.
    
    Args:
        inventory_data: Raw inventory data from database
        
    Returns:
        Cleaned inventory data in new object format
    """
    if isinstance(inventory_data, str):
        try:
            inventory_data = json.loads(inventory_data)
        except json.JSONDecodeError:
            logger.warning("Failed to parse inventory data as JSON")
            return {}
    
    if isinstance(inventory_data, list):
        # Old array format - convert to new object format
        cleaned_inventory = {}
        for item in inventory_data:
            if isinstance(item, dict) and "structure_name" in item:
                structure_name = item["structure_name"]
                cleaned_inventory[structure_name] = {
                    "count": item.get("count", 0)
                }
        return cleaned_inventory
    
    if isinstance(inventory_data, dict):
        # New object format - just remove currently_in_use if present
        cleaned_inventory = {}
        for structure_name, data in inventory_data.items():
            if isinstance(data, dict):
                cleaned_inventory[structure_name] = {
                    "count": data.get("count", 0)
                }
            else:
                # Handle legacy data format
                cleaned_inventory[structure_name] = {
                    "count": data if isinstance(data, int) else 0
                }
        return cleaned_inventory
    
    return {}


def update_table_structure():
    """Update table structure and defaults."""
    logger.info("🔧 Updating table structure...")
    
    try:
        with SessionLocal() as db:
            # Update the default value to use object format instead of array
            update_default_sql = """
            ALTER TABLE user_structure_inventory 
            ALTER COLUMN structure_inventory SET DEFAULT '{}'::jsonb;
            """
            
            db.execute(text(update_default_sql))
            db.commit()
            
            logger.info("✅ Updated table default value to object format")
            
    except Exception as e:
        logger.error(f"❌ Error updating table structure: {e}")
        raise


def clean_inventory_data_in_db():
    """Clean inventory data in database."""
    logger.info("🧹 Cleaning inventory data...")
    
    updated_count = 0
    error_count = 0
    
    try:
        with SessionLocal() as db:
            # Get all user inventory records
            query = text("""
                SELECT user_id, structure_inventory
                FROM user_structure_inventory
            """)
            
            results = db.execute(query).fetchall()
            total_users = len(results)
            
            logger.info(f"📊 Found {total_users} user inventory records to process")
            
            for user_record in results:
                user_id = user_record.user_id
                current_inventory = user_record.structure_inventory
                
                try:
                    # Clean the inventory data
                    cleaned_inventory = clean_inventory_data(current_inventory)
                    
                    # Update the database with cleaned data
                    update_query = text("""
                        UPDATE user_structure_inventory
                        SET structure_inventory = :cleaned_inventory, updated_at = CURRENT_TIMESTAMP
                        WHERE user_id = :user_id
                    """)
                    
                    db.execute(update_query, {
                        "user_id": user_id,
                        "cleaned_inventory": json.dumps(cleaned_inventory)
                    })
                    
                    updated_count += 1
                    if updated_count % 50 == 0:
                        logger.info(f"🔄 Processed {updated_count}/{total_users} users...")
                    
                except Exception as e:
                    logger.error(f"❌ Error processing user {user_id}: {e}")
                    error_count += 1
            
            # Commit all changes
            db.commit()
            
            logger.info("✅ Data cleanup completed!")
            logger.info(f"📈 Updated: {updated_count} users")
            logger.info(f"❌ Errors: {error_count} users")
            
    except Exception as e:
        logger.error(f"💥 Fatal error during data cleanup: {e}")
        raise


def verify_changes():
    """Verify that changes have been applied correctly."""
    logger.info("🔍 Verifying changes...")
    
    issues_found = 0
    users_checked = 0
    
    try:
        with SessionLocal() as db:
            # Check table default value
            default_query = text("""
                SELECT column_default 
                FROM information_schema.columns 
                WHERE table_name = 'user_structure_inventory' 
                AND column_name = 'structure_inventory'
            """)
            
            default_result = db.execute(default_query).fetchone()
            if default_result and "'{}'" in str(default_result.column_default):
                logger.info("✅ Table default value is correctly set to object format")
            else:
                logger.warning(f"⚠️ Table default value might not be updated: {default_result.column_default if default_result else 'None'}")
                issues_found += 1
            
            # Check sample data
            sample_query = text("""
                SELECT user_id, structure_inventory
                FROM user_structure_inventory
                LIMIT 10
            """)
            
            results = db.execute(sample_query).fetchall()
            
            for user_record in results:
                user_id = user_record.user_id
                inventory_data = user_record.structure_inventory
                users_checked += 1
                
                if isinstance(inventory_data, str):
                    try:
                        inventory_data = json.loads(inventory_data)
                    except json.JSONDecodeError:
                        continue
                
                # Check format
                if isinstance(inventory_data, list):
                    logger.warning(f"❌ User {user_id} still has array format")
                    issues_found += 1
                elif isinstance(inventory_data, dict):
                    # Check for currently_in_use fields
                    for structure_name, data in inventory_data.items():
                        if isinstance(data, dict) and "currently_in_use" in data:
                            logger.warning(f"❌ User {user_id} still has currently_in_use in {structure_name}")
                            issues_found += 1
                        elif isinstance(data, dict) and "count" in data:
                            logger.debug(f"✅ User {user_id} has clean object format for {structure_name}")
                        else:
                            logger.warning(f"⚠️ User {user_id} has unexpected format for {structure_name}: {data}")
                            issues_found += 1
            
            logger.info(f"📊 Checked {users_checked} users")
            if issues_found == 0:
                logger.info("✅ All verifications passed!")
            else:
                logger.warning(f"⚠️ Found {issues_found} issues")
                
    except Exception as e:
        logger.error(f"💥 Error during verification: {e}")
        raise


def show_table_info():
    """Show current table information."""
    logger.info("📋 Current table information:")
    
    try:
        with SessionLocal() as db:
            # Show table structure
            structure_query = text("""
                SELECT column_name, data_type, column_default, is_nullable
                FROM information_schema.columns 
                WHERE table_name = 'user_structure_inventory'
                ORDER BY ordinal_position
            """)
            
            results = db.execute(structure_query).fetchall()
            
            logger.info("🏗️ Table structure:")
            for row in results:
                logger.info(f"  {row.column_name}: {row.data_type} (default: {row.column_default}, nullable: {row.is_nullable})")
            
            # Show sample data
            sample_query = text("""
                SELECT user_id, structure_inventory, created_at, updated_at
                FROM user_structure_inventory
                LIMIT 3
            """)
            
            sample_results = db.execute(sample_query).fetchall()
            
            if sample_results:
                logger.info("📄 Sample data:")
                for row in sample_results:
                    inventory_preview = str(row.structure_inventory)[:100] + "..." if len(str(row.structure_inventory)) > 100 else str(row.structure_inventory)
                    logger.info(f"  User: {row.user_id[:8]}... | Inventory: {inventory_preview}")
            
            # Show record count
            count_query = text("SELECT COUNT(*) as count FROM user_structure_inventory")
            count_result = db.execute(count_query).fetchone()
            logger.info(f"📊 Total records: {count_result.count}")
            
    except Exception as e:
        logger.error(f"💥 Error getting table info: {e}")
        raise


def main():
    """Main script entry point."""
    parser = argparse.ArgumentParser(description='Update user_structure_inventory table')
    parser.add_argument('--info-only', action='store_true', help='Only show table information')
    parser.add_argument('--verify-only', action='store_true', help='Only verify, do not perform updates')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be changed without making changes')
    
    args = parser.parse_args()
    
    try:
        if args.info_only:
            show_table_info()
        elif args.verify_only:
            verify_changes()
        elif args.dry_run:
            logger.info("🧪 DRY RUN MODE - No changes will be made")
            show_table_info()
            logger.info("✅ Dry run completed (no changes made)")
        else:
            logger.info("🚀 Starting database update process...")
            
            # Show current state
            show_table_info()
            
            # Perform updates
            update_table_structure()
            clean_inventory_data_in_db()
            
            # Verify results
            verify_changes()
            
            logger.info("🎉 Database update completed successfully!")
            
    except KeyboardInterrupt:
        logger.info("🛑 Script interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"💥 Script failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()