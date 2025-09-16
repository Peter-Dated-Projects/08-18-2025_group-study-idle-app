"""
Test script for the new user information API endpoints.
This script demonstrates the functionality of the user cache system.
"""

import asyncio
import json
from typing import List, Dict

# Mock data for testing
mock_users_data = {
    "user123": {
        "user_id": "user123",
        "display_name": "John Doe",
        "email": "john.doe@example.com",
        "photo_url": "https://example.com/photo.jpg",
        "created_at": "2024-01-01T00:00:00Z",
        "last_login": "2024-09-14T12:00:00Z",
        "provider": "google"
    },
    "user456": {
        "user_id": "user456",
        "display_name": "Jane Smith",
        "email": "jane.smith@example.com",
        "photo_url": "https://example.com/photo2.jpg",
        "created_at": "2024-01-15T00:00:00Z",
        "last_login": "2024-09-14T11:00:00Z",
        "provider": "email"
    },
    "user789": {
        "user_id": "user789",
        "display_name": "Bob Wilson",
        "email": "bob.wilson@example.com",
        "photo_url": None,
        "created_at": "2024-02-01T00:00:00Z",
        "last_login": "2024-09-13T15:30:00Z",
        "provider": "google"
    }
}

def test_user_cache_service():
    """Test the user cache service functionality."""
    try:
        from app.services.user_cache_service import get_user_cache_service
        
        cache_service = get_user_cache_service()
        
        print("🧪 Testing User Cache Service")
        print("=" * 50)
        
        # Test 1: Check Redis connection
        print("1. Checking Redis connection...")
        try:
            redis_available = cache_service.redis_client.ping()
            print(f"   ✅ Redis available: {redis_available}")
        except Exception as e:
            print(f"   ❌ Redis connection failed: {e}")
            return
        
        # Test 2: Cache some user data
        print("\n2. Caching test user data...")
        for user_id, user_data in mock_users_data.items():
            success = cache_service.cache_user_info(user_id, user_data)
            print(f"   {'✅' if success else '❌'} Cached user {user_id}: {success}")
        
        # Test 3: Retrieve cached data
        print("\n3. Retrieving cached data...")
        user_ids = list(mock_users_data.keys())
        cached_users, missing_users = cache_service.get_users_from_cache(user_ids)
        print(f"   ✅ Found {len(cached_users)} cached users")
        print(f"   ✅ Missing {len(missing_users)} users")
        
        for user_id, user_data in cached_users.items():
            print(f"   📋 {user_id}: {user_data.get('display_name', 'No name')}")
        
        # Test 4: Cache statistics
        print("\n4. Cache statistics...")
        stats = cache_service.get_cache_stats()
        if 'error' not in stats:
            print(f"   📊 Cached users: {stats.get('cached_users', 0)}")
            print(f"   📊 Access tracked users: {stats.get('access_tracked_users', 0)}")
            print(f"   📊 Cache TTL: {stats.get('cache_ttl', 0)} seconds")
        else:
            print(f"   ❌ Error getting stats: {stats['error']}")
        
        # Test 5: Update access times
        print("\n5. Testing access time updates...")
        cache_service.update_access_times(user_ids)
        print("   ✅ Access times updated")
        
        # Test 6: Test cache expiration (short TTL)
        print("\n6. Testing cache expiration...")
        test_user_id = "temp_user"
        test_user_data = {
            "user_id": test_user_id,
            "display_name": "Temporary User",
            "email": "temp@example.com"
        }
        
        # Cache with 2 second expiration
        success = cache_service.cache_user_info(test_user_id, test_user_data, expire_seconds=2)
        print(f"   {'✅' if success else '❌'} Cached temporary user with 2s TTL")
        
        # Retrieve immediately
        temp_data = cache_service.get_user_from_cache(test_user_id)
        print(f"   {'✅' if temp_data else '❌'} Retrieved immediately: {temp_data is not None}")
        
        print("   ⏳ Waiting 3 seconds for expiration...")
        import time
        time.sleep(3)
        
        # Try to retrieve after expiration
        expired_data = cache_service.get_user_from_cache(test_user_id)
        print(f"   {'✅' if not expired_data else '❌'} After expiration: {expired_data is None}")
        
        print("\n🎉 User cache service test completed!")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

def test_redis_utils():
    """Test basic Redis utility functions."""
    try:
        from app.utils.redis_utils import RedisClient
        
        print("\n🧪 Testing Redis Utils")
        print("=" * 50)
        
        redis_client = RedisClient()
        
        # Test connection
        if not redis_client.ping():
            print("❌ Redis connection failed")
            return
        
        print("✅ Redis connection successful")
        
        # Test basic operations
        test_key = "test:user_api"
        test_data = {"name": "Test User", "id": "test123"}
        
        # Set value
        success = redis_client.set_value(test_key, test_data, expire_seconds=10)
        print(f"✅ Set value: {success}")
        
        # Get value
        retrieved = redis_client.get_value(test_key)
        print(f"✅ Retrieved value: {retrieved}")
        
        # Check existence
        exists = redis_client.exists(test_key)
        print(f"✅ Key exists: {exists}")
        
        # Clean up
        deleted = redis_client.delete_key(test_key)
        print(f"✅ Deleted key: {deleted}")
        
        print("🎉 Redis utils test completed!")
        
    except Exception as e:
        print(f"❌ Redis utils test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("🚀 Starting User Information API Tests")
    print("=" * 60)
    
    # Test Redis utilities first
    test_redis_utils()
    
    # Test user cache service
    test_user_cache_service()
    
    print("\n🏁 All tests completed!")
