"""
Migration script to add 'is_paid' boolean field to all existing user documents in ArangoDB.
This script will update all users in the 'users' collection to have is_paid=false by default.
"""
import logging
import sys
from pathlib import Path
from datetime import datetime

# Add the project root to the python path to allow for absolute imports
sys.path.append(str(Path(__file__).parent.parent))

from app.utils.arangodb_utils import (
    get_db, 
    get_arango_client,
    USERS_COLLECTION,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def add_is_paid_field_to_users():
    """
    Add 'is_paid' field with default value False to all existing user documents.
    """
    try:
        # Get database connection
        logger.info("Connecting to ArangoDB...")
        db = get_db()
        client = get_arango_client()
        
        if not db:
            logger.error("Failed to connect to ArangoDB")
            return False
        
        logger.info(f"Connected to ArangoDB database: {client.arango_db_name}")
        
        # Get users collection
        users_collection = db.collection(USERS_COLLECTION)
        
        if not users_collection:
            logger.error(f"Users collection '{USERS_COLLECTION}' not found")
            return False
        
        logger.info(f"Found users collection: {USERS_COLLECTION}")
        
        # Count total users before update
        total_users_query = f"FOR user IN {USERS_COLLECTION} COLLECT WITH COUNT INTO length RETURN length"
        total_users = list(db.aql.execute(total_users_query))[0]
        logger.info(f"Total users in collection: {total_users}")
        
        if total_users == 0:
            logger.info("No users found in collection. Nothing to update.")
            return True
        
        # Check how many users already have is_paid field
        existing_is_paid_query = f"""
        FOR user IN {USERS_COLLECTION}
        FILTER HAS(user, 'is_paid')
        COLLECT WITH COUNT INTO length
        RETURN length
        """
        existing_is_paid_count = list(db.aql.execute(existing_is_paid_query))[0]
        logger.info(f"Users already with is_paid field: {existing_is_paid_count}")
        
        # Update all users to add is_paid field if they don't have it
        update_query = f"""
        FOR user IN {USERS_COLLECTION}
        FILTER !HAS(user, 'is_paid')
        UPDATE user WITH {{ 
            is_paid: false,
            updated_at: @timestamp
        }} IN {USERS_COLLECTION}
        RETURN {{ 
            _key: NEW._key, 
            user_id: NEW.user_id, 
            is_paid: NEW.is_paid,
            updated: true
        }}
        """
        
        logger.info("Starting update operation...")
        timestamp = datetime.utcnow().isoformat()
        
        # Execute the update query
        cursor = db.aql.execute(update_query, bind_vars={'timestamp': timestamp})
        updated_users = list(cursor)
        
        logger.info(f"Successfully updated {len(updated_users)} users with is_paid=false")
        
        # Verify the update by counting users with is_paid field
        verification_query = f"""
        FOR user IN {USERS_COLLECTION}
        FILTER HAS(user, 'is_paid')
        COLLECT WITH COUNT INTO length
        RETURN length
        """
        final_count = list(db.aql.execute(verification_query))[0]
        logger.info(f"Verification: {final_count} users now have is_paid field")
        
        # Show sample of updated users (first 5)
        if updated_users:
            logger.info("Sample of updated users:")
            for i, user in enumerate(updated_users[:5]):
                logger.info(f"  {i+1}. User {user.get('user_id', user.get('_key'))}: is_paid={user.get('is_paid')}")
        
        # Final verification - check that all users now have the field
        if final_count == total_users:
            logger.info("✅ SUCCESS: All users now have the is_paid field!")
            return True
        else:
            logger.warning(f"⚠️  WARNING: Expected {total_users} users with is_paid field, but found {final_count}")
            return False
            
    except Exception as e:
        logger.error(f"❌ ERROR during migration: {e}")
        return False

def verify_is_paid_field():
    """
    Verify that all users have the is_paid field and show statistics.
    """
    try:
        logger.info("Verifying is_paid field across all users...")
        db = get_db()
        
        # Get statistics about is_paid field
        stats_query = f"""
        FOR user IN {USERS_COLLECTION}
        COLLECT 
            has_is_paid = HAS(user, 'is_paid'),
            is_paid_value = (HAS(user, 'is_paid') ? user.is_paid : null)
        WITH COUNT INTO count
        RETURN {{
            has_is_paid: has_is_paid,
            is_paid_value: is_paid_value,
            count: count
        }}
        """
        
        stats = list(db.aql.execute(stats_query))
        
        logger.info("is_paid field statistics:")
        for stat in stats:
            has_field = stat['has_is_paid']
            value = stat['is_paid_value']
            count = stat['count']
            
            if has_field:
                logger.info(f"  Users with is_paid={value}: {count}")
            else:
                logger.info(f"  Users WITHOUT is_paid field: {count}")
        
        return True
        
    except Exception as e:
        logger.error(f"Error during verification: {e}")
        return False

if __name__ == "__main__":
    logger.info("=" * 60)
    logger.info("ArangoDB User Migration: Adding is_paid Field")
    logger.info("=" * 60)
    
    try:
        # Test ArangoDB connection first
        client = get_arango_client()
        if not client.ping():
            logger.error("❌ Cannot connect to ArangoDB. Please check your connection settings.")
            sys.exit(1)
        
        logger.info("✅ ArangoDB connection successful")
        
        # Show current state before migration
        logger.info("\n--- BEFORE MIGRATION ---")
        verify_is_paid_field()
        
        # Perform the migration
        logger.info("\n--- PERFORMING MIGRATION ---")
        success = add_is_paid_field_to_users()
        
        if success:
            # Show state after migration
            logger.info("\n--- AFTER MIGRATION ---")
            verify_is_paid_field()
            
            logger.info("\n" + "=" * 60)
            logger.info("✅ MIGRATION COMPLETED SUCCESSFULLY!")
            logger.info("All users now have is_paid=false by default.")
            logger.info("=" * 60)
        else:
            logger.error("\n" + "=" * 60)
            logger.error("❌ MIGRATION FAILED!")
            logger.error("Please check the logs above for details.")
            logger.error("=" * 60)
            sys.exit(1)
            
    except KeyboardInterrupt:
        logger.info("\n⚠️  Migration interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"\n❌ Unexpected error: {e}")
        sys.exit(1)
