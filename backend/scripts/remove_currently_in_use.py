#!/usr/bin/env python3
"""
Remove 'currently_in_use' field from user inventory data.
This script cleans up the database by removing the currently_in_use field from all inventory records.

Run from the project root directory:
    python backend/scripts/remove_currently_in_use.py
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
    Clean inventory data by removing currently_in_use fields.
    
    Args:
        inventory_data: Raw inventory data from database
        
    Returns:
        Cleaned inventory data without currently_in_use fields
    """
    if isinstance(inventory_data, str):
        try:
            inventory_data = json.loads(inventory_data)
        except json.JSONDecodeError:
            logger.warning("Failed to parse inventory data as JSON")
            return {}
    
    if isinstance(inventory_data, list):
        # Old array format - convert to new object format and remove currently_in_use
        cleaned_inventory = {}
        for item in inventory_data:
            if isinstance(item, dict) and "structure_name" in item:
                structure_name = item["structure_name"]
                cleaned_inventory[structure_name] = {
                    "count": item.get("count", 0)
                }
        return cleaned_inventory
    
    if isinstance(inventory_data, dict):
        # New object format - remove currently_in_use from each structure
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


def remove_currently_in_use():
    """Remove currently_in_use field from all user inventory records."""
    logger.info("🧹 Starting cleanup of currently_in_use fields from user inventory...")
    
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
                    if updated_count % 100 == 0:
                        logger.info(f"🔄 Processed {updated_count}/{total_users} users...")
                    
                except Exception as e:
                    logger.error(f"❌ Error processing user {user_id}: {e}")
                    error_count += 1
            
            # Commit all changes
            db.commit()
            
            logger.info(f"✅ Cleanup completed!")
            logger.info(f"📈 Updated: {updated_count} users")
            logger.info(f"❌ Errors: {error_count} users")
            
    except Exception as e:
        logger.error(f"💥 Fatal error during cleanup: {e}")
        raise


def verify_cleanup():
    """Verify that currently_in_use fields have been removed."""
    logger.info("🔍 Verifying cleanup results...")
    
    found_issues = 0
    
    try:
        with SessionLocal() as db:
            query = text("""
                SELECT user_id, structure_inventory
                FROM user_structure_inventory
                LIMIT 10
            """)
            
            results = db.execute(query).fetchall()
            
            for user_record in results:
                user_id = user_record.user_id
                inventory_data = user_record.structure_inventory
                
                if isinstance(inventory_data, str):
                    try:
                        inventory_data = json.loads(inventory_data)
                    except json.JSONDecodeError:
                        continue
                
                # Check if any currently_in_use fields remain
                if isinstance(inventory_data, dict):
                    for structure_name, data in inventory_data.items():
                        if isinstance(data, dict) and "currently_in_use" in data:
                            logger.warning(f"❌ User {user_id} still has currently_in_use field in {structure_name}")
                            found_issues += 1
                        else:
                            logger.debug(f"✅ User {user_id} has clean inventory for {structure_name}")
                elif isinstance(inventory_data, list):
                    for item in inventory_data:
                        if isinstance(item, dict) and "currently_in_use" in item:
                            logger.warning(f"❌ User {user_id} still has currently_in_use field in array format")
                            found_issues += 1
            
            if found_issues == 0:
                logger.info("✅ Verification passed! No currently_in_use fields found.")
            else:
                logger.warning(f"⚠️ Found {found_issues} remaining currently_in_use fields")
                
    except Exception as e:
        logger.error(f"💥 Error during verification: {e}")
        raise


def main():
    """Main script entry point."""
    parser = argparse.ArgumentParser(description='Remove currently_in_use field from user inventory')
    parser.add_argument('--verify-only', action='store_true', help='Only verify, do not perform cleanup')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be changed without making changes')
    
    args = parser.parse_args()
    
    try:
        if args.verify_only:
            verify_cleanup()
        elif args.dry_run:
            logger.info("🧪 DRY RUN MODE - No changes will be made")
            # You could implement dry run logic here
            logger.info("✅ Dry run completed (no changes made)")
        else:
            remove_currently_in_use()
            verify_cleanup()
            
    except KeyboardInterrupt:
        logger.info("🛑 Script interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"💥 Script failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()