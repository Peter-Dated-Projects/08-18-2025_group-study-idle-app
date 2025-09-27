"""
Test script to verify the is_paid field migration works correctly.
This script creates test users, runs the migration, and verifies the results.
"""
import logging
import sys
from pathlib import Path
from datetime import datetime

# Add the project root to the python path to allow for absolute imports
sys.path.append(str(Path(__file__).parent.parent))

from app.utils.arangodb_utils import get_db, get_arango_client, USERS_COLLECTION

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def create_test_users():
    """Create some test users without is_paid field for testing."""
    try:
        db = get_db()
        users_collection = db.collection(USERS_COLLECTION)
        
        test_users = [
            {
                "_key": "test_user_1",
                "user_id": "test_user_1",
                "display_name": "Test User 1",
                "email": "test1@example.com",
                "provider": "test"
            },
            {
                "_key": "test_user_2", 
                "user_id": "test_user_2",
                "display_name": "Test User 2",
                "email": "test2@example.com",
                "provider": "test"
            },
            {
                "_key": "test_user_3",
                "user_id": "test_user_3", 
                "display_name": "Test User 3",
                "email": "test3@example.com",
                "provider": "test",
                "is_paid": True  # This user already has is_paid field
            }
        ]
        
        created_count = 0
        for user in test_users:
            try:
                if not users_collection.has(user["_key"]):
                    users_collection.insert(user)
                    created_count += 1
                    logger.info(f"Created test user: {user['user_id']}")
                else:
                    logger.info(f"Test user already exists: {user['user_id']}")
            except Exception as e:
                logger.error(f"Error creating test user {user['user_id']}: {e}")
        
        logger.info(f"Created {created_count} new test users")
        return True
        
    except Exception as e:
        logger.error(f"Error creating test users: {e}")
        return False

def verify_test_users():
    """Verify the test users and their is_paid status."""
    try:
        db = get_db()
        
        # Query all test users
        query = f"""
        FOR user IN {USERS_COLLECTION}
        FILTER STARTS_WITH(user._key, 'test_user_')
        RETURN {{
            user_id: user.user_id,
            display_name: user.display_name,
            has_is_paid: HAS(user, 'is_paid'),
            is_paid: user.is_paid
        }}
        """
        
        cursor = db.aql.execute(query)
        test_users = list(cursor)
        
        logger.info("Test users verification:")
        for user in test_users:
            has_field = user['has_is_paid']
            is_paid_value = user['is_paid']
            logger.info(f"  {user['user_id']}: has_is_paid={has_field}, is_paid={is_paid_value}")
        
        return test_users
        
    except Exception as e:
        logger.error(f"Error verifying test users: {e}")
        return []

def cleanup_test_users():
    """Remove test users from the database."""
    try:
        db = get_db()
        users_collection = db.collection(USERS_COLLECTION)
        
        test_user_keys = ["test_user_1", "test_user_2", "test_user_3"]
        removed_count = 0
        
        for key in test_user_keys:
            try:
                if users_collection.has(key):
                    users_collection.delete(key)
                    removed_count += 1
                    logger.info(f"Removed test user: {key}")
            except Exception as e:
                logger.error(f"Error removing test user {key}: {e}")
        
        logger.info(f"Cleaned up {removed_count} test users")
        return True
        
    except Exception as e:
        logger.error(f"Error cleaning up test users: {e}")
        return False

if __name__ == "__main__":
    logger.info("=" * 60)
    logger.info("ArangoDB is_paid Migration Test")
    logger.info("=" * 60)
    
    try:
        # Test ArangoDB connection
        client = get_arango_client()
        if not client.ping():
            logger.error("❌ Cannot connect to ArangoDB. Please check your connection settings.")
            sys.exit(1)
        
        logger.info("✅ ArangoDB connection successful")
        
        # Create test users
        logger.info("\n--- CREATING TEST USERS ---")
        if not create_test_users():
            logger.error("Failed to create test users")
            sys.exit(1)
        
        # Verify test users before migration
        logger.info("\n--- BEFORE MIGRATION ---")
        before_users = verify_test_users()
        
        # Import and run the migration
        logger.info("\n--- RUNNING MIGRATION ---")
        from add_is_paid_field import add_is_paid_field_to_users
        
        success = add_is_paid_field_to_users()
        
        if success:
            # Verify test users after migration
            logger.info("\n--- AFTER MIGRATION ---")
            after_users = verify_test_users()
            
            # Verify that all test users now have is_paid field
            all_have_field = all(user['has_is_paid'] for user in after_users)
            correct_defaults = all(
                user['is_paid'] == False for user in after_users 
                if user['user_id'] in ['test_user_1', 'test_user_2']
            )
            preserved_existing = any(
                user['is_paid'] == True for user in after_users 
                if user['user_id'] == 'test_user_3'
            )
            
            if all_have_field and correct_defaults and preserved_existing:
                logger.info("\n✅ MIGRATION TEST PASSED!")
                logger.info("- All test users have is_paid field")
                logger.info("- New users got default is_paid=False")
                logger.info("- Existing is_paid values were preserved")
            else:
                logger.error("\n❌ MIGRATION TEST FAILED!")
                logger.error(f"- All have field: {all_have_field}")
                logger.error(f"- Correct defaults: {correct_defaults}")
                logger.error(f"- Preserved existing: {preserved_existing}")
        else:
            logger.error("\n❌ MIGRATION FAILED!")
        
        # Cleanup test users
        logger.info("\n--- CLEANUP ---")
        cleanup_test_users()
        
        logger.info("\n" + "=" * 60)
        logger.info("Test completed!")
        logger.info("=" * 60)
        
    except KeyboardInterrupt:
        logger.info("\n⚠️  Test interrupted by user")
        cleanup_test_users()
        sys.exit(1)
    except Exception as e:
        logger.error(f"\n❌ Unexpected error: {e}")
        cleanup_test_users()
        sys.exit(1)
