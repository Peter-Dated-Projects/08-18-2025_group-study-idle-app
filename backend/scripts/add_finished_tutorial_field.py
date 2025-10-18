"""
Migration script to add 'finished-tutorial' boolean field to all existing user documents in ArangoDB.
This script will update all users in the 'users' collection to have finished-tutorial=false by default.
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

def add_finished_tutorial_field_to_users():
    """
    Add 'finished-tutorial' field with default value False to all existing user documents.
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
        
        # Check how many users already have finished-tutorial field
        existing_finished_tutorial_query = f"""
        FOR user IN {USERS_COLLECTION}
        FILTER HAS(user, 'finished-tutorial')
        COLLECT WITH COUNT INTO length
        RETURN length
        """
        existing_finished_tutorial_count = list(db.aql.execute(existing_finished_tutorial_query))[0]
        logger.info(f"Users already with finished-tutorial field: {existing_finished_tutorial_count}")
        
        # Update all users to add finished-tutorial field if they don't have it
        update_query = f"""
        FOR user IN {USERS_COLLECTION}
        FILTER !HAS(user, 'finished-tutorial')
        UPDATE user WITH {{ 
            "finished-tutorial": false,
            updated_at: @timestamp
        }} IN {USERS_COLLECTION}
        RETURN {{ 
            _key: NEW._key, 
            user_id: NEW.user_id, 
            "finished-tutorial": NEW["finished-tutorial"],
            updated: true
        }}
        """
        
        logger.info("Starting update operation...")
        timestamp = datetime.utcnow().isoformat()
        
        # Execute the update query
        cursor = db.aql.execute(update_query, bind_vars={'timestamp': timestamp})
        updated_users = list(cursor)
        
        logger.info(f"Successfully updated {len(updated_users)} users with finished-tutorial=false")
        
        # Verify the update by counting users with finished-tutorial field
        verification_query = f"""
        FOR user IN {USERS_COLLECTION}
        FILTER HAS(user, 'finished-tutorial')
        COLLECT WITH COUNT INTO length
        RETURN length
        """
        final_count = list(db.aql.execute(verification_query))[0]
        logger.info(f"Verification: {final_count} users now have finished-tutorial field")
        
        # Show sample of updated users (first 5)
        if updated_users:
            logger.info("Sample of updated users:")
            for i, user in enumerate(updated_users[:5]):
                logger.info(f"  {i+1}. User {user.get('user_id', user.get('_key'))}: finished-tutorial={user.get('finished-tutorial')}")
        
        # Final verification - check that all users now have the field
        if final_count == total_users:
            logger.info("✅ SUCCESS: All users now have the finished-tutorial field!")
            return True
        else:
            logger.warning(f"⚠️  WARNING: Expected {total_users} users with finished-tutorial field, but found {final_count}")
            return False
            
    except Exception as e:
        logger.error(f"❌ ERROR during migration: {e}")
        return False

def verify_finished_tutorial_field():
    """
    Verify that all users have the finished-tutorial field and show statistics.
    """
    try:
        logger.info("Verifying finished-tutorial field across all users...")
        db = get_db()
        
        # Get statistics about finished-tutorial field
        stats_query = f"""
        FOR user IN {USERS_COLLECTION}
        COLLECT 
            has_finished_tutorial = HAS(user, 'finished-tutorial'),
            finished_tutorial_value = (HAS(user, 'finished-tutorial') ? user["finished-tutorial"] : null)
        WITH COUNT INTO count
        RETURN {{
            has_finished_tutorial: has_finished_tutorial,
            finished_tutorial_value: finished_tutorial_value,
            count: count
        }}
        """
        
        stats = list(db.aql.execute(stats_query))
        
        logger.info("finished-tutorial field statistics:")
        for stat in stats:
            has_field = stat['has_finished_tutorial']
            value = stat['finished_tutorial_value']
            count = stat['count']
            
            if has_field:
                logger.info(f"  Users with finished-tutorial={value}: {count}")
            else:
                logger.info(f"  Users WITHOUT finished-tutorial field: {count}")
        
        return True
        
    except Exception as e:
        logger.error(f"Error during verification: {e}")
        return False

if __name__ == "__main__":
    logger.info("=" * 60)
    logger.info("ArangoDB User Migration: Adding finished-tutorial Field")
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
        verify_finished_tutorial_field()
        
        # Perform the migration
        logger.info("\n--- PERFORMING MIGRATION ---")
        success = add_finished_tutorial_field_to_users()
        
        if success:
            # Show state after migration
            logger.info("\n--- AFTER MIGRATION ---")
            verify_finished_tutorial_field()
            
            logger.info("\n" + "=" * 60)
            logger.info("✅ MIGRATION COMPLETED SUCCESSFULLY!")
            logger.info("All users now have finished-tutorial=false by default.")
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
