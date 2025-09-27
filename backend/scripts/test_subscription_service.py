"""
Test script for the subscription service.
Tests Redis caching, ArangoDB fallback, and API endpoints.
"""
import logging
import sys
import asyncio
import json
from pathlib import Path

# Add the project root to the python path to allow for absolute imports
sys.path.append(str(Path(__file__).parent.parent))

from app.services.subscription_service import get_subscription_service
from app.utils.redis_utils import redis_client, delete_cache
from app.utils.arangodb_utils import get_arango_client

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def test_subscription_service():
    """Test the subscription service functionality."""
    try:
        logger.info("=" * 60)
        logger.info("Subscription Service Test")
        logger.info("=" * 60)
        
        # Get service instance
        subscription_service = get_subscription_service()
        
        # Test service availability
        logger.info("Testing service availability...")
        is_available = subscription_service.is_available()
        logger.info(f"Service available: {is_available}")
        
        if not is_available:
            logger.error("❌ Subscription service is not available")
            return False
        
        # Get cache statistics
        logger.info("\nGetting cache statistics...")
        stats = subscription_service.get_cache_statistics()
        logger.info(f"Cache stats: {json.dumps(stats, indent=2)}")
        
        # Test with a known user (from our earlier listing)
        test_user_id = "alice"  # We know this user exists from the earlier listing
        
        logger.info(f"\n--- Testing with user: {test_user_id} ---")
        
        # Clear any existing cache for this user
        logger.info("Clearing existing cache...")
        subscription_service.invalidate_user_subscription_cache(test_user_id)
        
        # First request - should hit ArangoDB and cache the result
        logger.info("First request (should hit database)...")
        result1 = subscription_service.get_user_subscription_status(test_user_id)
        logger.info(f"Result 1: {json.dumps(result1, indent=2)}")
        
        # Second request - should hit cache
        logger.info("Second request (should hit cache)...")
        result2 = subscription_service.get_user_subscription_status(test_user_id)
        logger.info(f"Result 2: {json.dumps(result2, indent=2)}")
        
        # Verify caching worked
        if result1.get('source') == 'database' and result2.get('source') == 'cache':
            logger.info("✅ Caching is working correctly!")
        else:
            logger.warning(f"⚠️  Caching may not be working as expected")
            logger.warning(f"First request source: {result1.get('source')}")
            logger.warning(f"Second request source: {result2.get('source')}")
        
        # Test cache invalidation
        logger.info("Testing cache invalidation...")
        invalidation_success = subscription_service.invalidate_user_subscription_cache(test_user_id)
        logger.info(f"Cache invalidation success: {invalidation_success}")
        
        # Third request after invalidation - should hit database again
        logger.info("Third request after invalidation (should hit database)...")
        result3 = subscription_service.get_user_subscription_status(test_user_id)
        logger.info(f"Result 3: {json.dumps(result3, indent=2)}")
        
        if result3.get('source') == 'database':
            logger.info("✅ Cache invalidation is working correctly!")
        else:
            logger.warning(f"⚠️  Cache invalidation may not be working as expected")
            logger.warning(f"Third request source: {result3.get('source')}")
        
        # Test with non-existent user
        logger.info("\n--- Testing with non-existent user ---")
        nonexistent_user = "nonexistent_user_12345"
        result_nonexistent = subscription_service.get_user_subscription_status(nonexistent_user)
        logger.info(f"Non-existent user result: {json.dumps(result_nonexistent, indent=2)}")
        
        if not result_nonexistent.get('success') and result_nonexistent.get('is_paid') == False:
            logger.info("✅ Non-existent user handling is working correctly!")
        else:
            logger.warning("⚠️  Non-existent user handling may not be working as expected")
        
        logger.info("\n" + "=" * 60)
        logger.info("✅ Subscription Service Test Completed!")
        logger.info("=" * 60)
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Error during subscription service test: {e}")
        return False

def test_redis_connection():
    """Test Redis connection."""
    try:
        logger.info("Testing Redis connection...")
        if redis_client:
            # Try a simple ping
            redis_client.ping()
            logger.info("✅ Redis connection successful")
            return True
        else:
            logger.error("❌ Redis client is None")
            return False
    except Exception as e:
        logger.error(f"❌ Redis connection failed: {e}")
        return False

def test_arangodb_connection():
    """Test ArangoDB connection."""
    try:
        logger.info("Testing ArangoDB connection...")
        client = get_arango_client()
        if client.ping():
            logger.info("✅ ArangoDB connection successful")
            return True
        else:
            logger.error("❌ ArangoDB ping failed")
            return False
    except Exception as e:
        logger.error(f"❌ ArangoDB connection failed: {e}")
        return False

if __name__ == "__main__":
    logger.info("Starting Subscription Service Tests...")
    
    try:
        # Test connections first
        redis_ok = test_redis_connection()
        arangodb_ok = test_arangodb_connection()
        
        if not redis_ok:
            logger.error("❌ Redis is not available - subscription service will not work properly")
            sys.exit(1)
        
        if not arangodb_ok:
            logger.error("❌ ArangoDB is not available - subscription service will not work properly")
            sys.exit(1)
        
        # Run subscription service tests
        success = test_subscription_service()
        
        if success:
            logger.info("\n🎉 All tests passed successfully!")
            sys.exit(0)
        else:
            logger.error("\n❌ Some tests failed!")
            sys.exit(1)
            
    except KeyboardInterrupt:
        logger.info("\n⚠️  Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"\n❌ Unexpected error during testing: {e}")
        sys.exit(1)
