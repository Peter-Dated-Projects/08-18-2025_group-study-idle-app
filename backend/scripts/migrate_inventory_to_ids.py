#!/usr/bin/env python3
"""
Migration script to standardize structure inventory to use IDs instead of display names.

This script will:
1. Load all user inventories
2. Merge display name counts into their corresponding ID counts
3. Remove display name entries
4. Update the database

Mapping:
- "Mailbox" → "mailbox"
- "Workbench" → "workbench" 
- "Water Well" → "water-well"
- "Chicken Coop" → "chicken-coop"
- "Picnic Table" → "picnic"
"""

import sys
import os
import json
import logging
from sqlalchemy import text

# Add the parent directory to the path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.database import SessionLocal

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Structure name mapping: display_name -> id
STRUCTURE_NAME_MAPPING = {
    "Mailbox": "mailbox",
    "Workbench": "workbench",
    "Water Well": "water-well", 
    "Chicken Coop": "chicken-coop",
    "Picnic Table": "picnic"
}

def get_database_connection():
    """Get database connection using the app's database configuration."""
    try:
        session = SessionLocal()
        return session, None
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        raise

def migrate_user_inventory(session, user_id: str, current_inventory: dict) -> dict:
    """
    Migrate a single user's inventory from display names to IDs.
    
    Args:
        session: Database session
        user_id: User ID
        current_inventory: Current inventory data as dict
        
    Returns:
        Updated inventory data
    """
    logger.info(f"Migrating inventory for user: {user_id}")
    logger.info(f"Original inventory: {json.dumps(current_inventory, indent=2)}")
    
    migrated_inventory = {}
    migration_log = []
    
    # First, copy all existing ID-based entries
    for structure_name, data in current_inventory.items():
        if structure_name not in STRUCTURE_NAME_MAPPING:
            # This is already an ID or unknown structure
            migrated_inventory[structure_name] = data.copy()
            logger.info(f"  Keeping ID-based entry: {structure_name} = {data}")
    
    # Then, merge display name entries into their corresponding IDs
    for display_name, structure_id in STRUCTURE_NAME_MAPPING.items():
        if display_name in current_inventory:
            display_count = current_inventory[display_name].get("count", 0)
            
            if structure_id in migrated_inventory:
                # Merge counts
                old_count = migrated_inventory[structure_id].get("count", 0)
                new_count = old_count + display_count
                migrated_inventory[structure_id]["count"] = new_count
                migration_log.append(f"{display_name} ({display_count}) + {structure_id} ({old_count}) = {structure_id} ({new_count})")
            else:
                # Create new ID entry
                migrated_inventory[structure_id] = {"count": display_count}
                migration_log.append(f"{display_name} ({display_count}) → {structure_id} ({display_count})")
            
            logger.info(f"  Migrated: {migration_log[-1]}")
    
    # Remove entries with 0 count
    migrated_inventory = {k: v for k, v in migrated_inventory.items() if v.get("count", 0) > 0}
    
    logger.info(f"Final inventory: {json.dumps(migrated_inventory, indent=2)}")
    logger.info(f"Migration summary: {migration_log}")
    
    return migrated_inventory

def migrate_all_inventories():
    """Migrate all user inventories to use structure IDs."""
    session, _ = get_database_connection()
    
    try:
        # Get all users with inventory data
        query = text("""
            SELECT user_id, structure_inventory 
            FROM user_structure_inventory 
            WHERE structure_inventory IS NOT NULL
        """)
        
        results = session.execute(query).fetchall()
        logger.info(f"Found {len(results)} users with inventory data")
        
        migration_count = 0
        
        for row in results:
            user_id = row.user_id
            inventory_json = row.structure_inventory
            
            # Parse current inventory
            if isinstance(inventory_json, str):
                current_inventory = json.loads(inventory_json)
            else:
                current_inventory = inventory_json
            
            # Check if migration is needed
            needs_migration = any(name in current_inventory for name in STRUCTURE_NAME_MAPPING.keys())
            
            if not needs_migration:
                logger.info(f"User {user_id} inventory already uses IDs, skipping")
                continue
            
            # Migrate the inventory
            migrated_inventory = migrate_user_inventory(session, user_id, current_inventory)
            
            # Update database
            update_query = text("""
                UPDATE user_structure_inventory 
                SET structure_inventory = :inventory, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = :user_id
            """)
            
            session.execute(update_query, {
                "user_id": user_id,
                "inventory": json.dumps(migrated_inventory)
            })
            
            migration_count += 1
            logger.info(f"✅ Updated inventory for user {user_id}")
        
        # Commit all changes
        session.commit()
        logger.info(f"🎉 Successfully migrated {migration_count} user inventories")
        
        return migration_count
        
    except Exception as e:
        session.rollback()
        logger.error(f"❌ Error during migration: {e}")
        raise
    finally:
        session.close()

def verify_migration():
    """Verify that the migration was successful."""
    session, _ = get_database_connection()
    
    try:
        # Check for any remaining display names
        query = text("""
            SELECT user_id, structure_inventory 
            FROM user_structure_inventory 
            WHERE structure_inventory IS NOT NULL
        """)
        
        results = session.execute(query).fetchall()
        issues_found = 0
        
        for row in results:
            user_id = row.user_id
            inventory_json = row.structure_inventory
            
            if isinstance(inventory_json, str):
                inventory = json.loads(inventory_json)
            else:
                inventory = inventory_json
            
            # Check for display names
            remaining_display_names = [name for name in inventory.keys() if name in STRUCTURE_NAME_MAPPING.keys()]
            
            if remaining_display_names:
                logger.warning(f"User {user_id} still has display names: {remaining_display_names}")
                issues_found += 1
            else:
                logger.info(f"✅ User {user_id} inventory is clean")
        
        if issues_found == 0:
            logger.info("🎉 Migration verification passed - all inventories use IDs")
        else:
            logger.warning(f"⚠️ Migration verification found {issues_found} issues")
        
        return issues_found == 0
        
    except Exception as e:
        logger.error(f"❌ Error during verification: {e}")
        raise
    finally:
        session.close()

def main():
    """Main migration function."""
    logger.info("🚀 Starting structure inventory migration to IDs")
    logger.info("=" * 60)
    
    try:
        # Run migration
        migrated_count = migrate_all_inventories()
        
        # Verify migration
        logger.info("\n" + "=" * 60)
        logger.info("🔍 Verifying migration...")
        verification_passed = verify_migration()
        
        # Summary
        logger.info("\n" + "=" * 60)
        logger.info("📊 MIGRATION SUMMARY")
        logger.info(f"Users migrated: {migrated_count}")
        logger.info(f"Verification: {'PASSED' if verification_passed else 'FAILED'}")
        
        if verification_passed:
            logger.info("🎉 Migration completed successfully!")
            return True
        else:
            logger.error("❌ Migration completed with issues!")
            return False
            
    except Exception as e:
        logger.error(f"💥 Migration failed: {e}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)