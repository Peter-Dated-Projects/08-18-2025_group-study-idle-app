#!/usr/bin/env python3
"""
Script to add user_picture_url field to all users in ArangoDB.
Sets default value to None for existing users and ensures new users get this field.
"""

import sys
import logging
from pathlib import Path

# Add the backend directory to Python path
sys.path.append(str(Path(__file__).parent.parent))

from app.utils.arangodb_utils import get_arango_client, USERS_COLLECTION

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def add_user_picture_url_field():
    """
    Add user_picture_url field to all existing users in ArangoDB.
    Sets the field to None for all existing users.
    """
    try:
        # Get ArangoDB connection
        arango_client = get_arango_client()
        
        # Test connection
        if not arango_client.ping():
            logger.error("❌ Cannot connect to ArangoDB. Please check your connection.")
            return False
            
        logger.info("✅ Connected to ArangoDB successfully")
        db = arango_client.db
        
        # Check if users collection exists
        if not db.has_collection(USERS_COLLECTION):
            logger.warning(f"⚠️ Users collection '{USERS_COLLECTION}' does not exist. Creating it...")
            db.create_collection(USERS_COLLECTION)
            logger.info(f"✅ Created users collection: {USERS_COLLECTION}")
            return True
        
        users_collection = db.collection(USERS_COLLECTION)
        
        # Get all users
        logger.info("📊 Fetching all users from ArangoDB...")
        cursor = users_collection.all()
        users = list(cursor)
        
        if not users:
            logger.info("ℹ️ No users found in the database. The field will be available for future users.")
            return True
            
        logger.info(f"📈 Found {len(users)} users in the database")
        
        # Update each user to add user_picture_url field
        updated_count = 0
        already_has_field_count = 0
        
        for user in users:
            user_key = user.get('_key')
            user_id = user_key or user.get('_id', 'unknown')
            
            # Check if user already has user_picture_url field
            if 'user_picture_url' in user:
                already_has_field_count += 1
                logger.debug(f"User {user_id} already has user_picture_url field")
                continue
                
            # Update user to add user_picture_url field set to None
            try:
                # Create updated document with user_picture_url field
                updated_doc = user.copy()
                updated_doc['user_picture_url'] = None
                
                # Use the document for update (not just the key)
                result = users_collection.update(updated_doc)
                if result:
                    updated_count += 1
                    logger.debug(f"✅ Updated user {user_id} with user_picture_url: None")
                else:
                    logger.error(f"❌ Update returned empty result for user {user_id}")
                
            except Exception as e:
                logger.error(f"❌ Failed to update user {user_id}: {e}")
                continue
                
        # Summary
        logger.info("🎯 Update Summary:")
        logger.info(f"   📊 Total users found: {len(users)}")
        logger.info(f"   ✅ Users updated: {updated_count}")
        logger.info(f"   ℹ️ Users already had field: {already_has_field_count}")
        
        if updated_count > 0:
            logger.info(f"🎉 Successfully added user_picture_url field to {updated_count} users!")
        else:
            logger.info("ℹ️ All users already had the user_picture_url field")
            
        return True
        
    except Exception as e:
        logger.error(f"❌ Error updating users: {e}")
        return False

def main():
    """Main function to run the update script."""
    print("🖼️  Adding user_picture_url field to ArangoDB users")
    print("=" * 60)
    
    success = add_user_picture_url_field()
    
    if success:
        print("\n✅ Script completed successfully!")
        print("   Users now have user_picture_url field (set to None by default)")
        print("   New users will automatically get this field")
    else:
        print("\n❌ Script failed. Please check the logs above.")
        sys.exit(1)

if __name__ == "__main__":
    main()