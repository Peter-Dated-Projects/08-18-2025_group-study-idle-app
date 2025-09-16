#!/usr/bin/env python3
"""
Firestore Functionality Test for FastAPI Backend
Tests all aspects of Firestore integration including user lookup, caching, and direct collection access.
"""

import os
import sys
from datetime import datetime
from pathlib import Path

# Add the current directory to Python path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

# Set environment variables if not already set
if not os.getenv('FIREBASE_PROJECT_ID'):
    os.environ['FIREBASE_PROJECT_ID'] = 'group-study-idle-app'
if not os.getenv('FIRESTORE_USER_SESSIONS'):
    os.environ['FIRESTORE_USER_SESSIONS'] = 'user_sessions'
if not os.getenv('FIRESTORE_DATABASE_NAME'):
    os.environ['FIRESTORE_DATABASE_NAME'] = 'user-notion-tokens'

from app.services.user_service_firestore import get_user_service
from app.utils.redis_utils import RedisClient

def test_firestore_functionality():
    """Test Firestore functionality in the FastAPI backend"""
    
    print("🔥 Testing Firestore Functionality in FastAPI Backend")
    print("=" * 60)
    
    # Initialize services
    user_service = get_user_service()
    redis_client = RedisClient()
    
    # Test 1: Check Firestore initialization
    print("\n1. Testing Firestore Initialization...")
    try:
        is_available = user_service.is_available()
        print(f"   ✅ Firestore available: {is_available}")
        
        if not is_available:
            print("   ❌ Firestore is not available. Check configuration.")
            return False
            
    except Exception as e:
        print(f"   ❌ Firestore initialization failed: {e}")
        return False
    
    # Test 2: Test existing user lookup
    print("\n2. Testing User Lookup...")
    test_user_ids = [
        "803db0b1a2085280bdc9a1ba40e5bfbef8f4c9723e423a7e505d3e33f9f762cd",
        "5a7b661593f73212460242713dd442c0cc0523fb8a4ad238ba01a0e726eaf911"
    ]
    
    for user_id in test_user_ids:
        try:
            user_info = user_service.get_user_info(user_id)
            if user_info and user_info.get('display_name'):
                print(f"   ✅ Found user {user_id[:8]}...")
                print(f"      Display Name: {user_info.get('display_name')}")
                print(f"      Email: {user_info.get('email')}")
                print(f"      Created: {user_info.get('created_at')}")
                print(f"      Last Login: {user_info.get('last_login')}")
            else:
                print(f"   ⚠️  User {user_id[:8]}... not found or has no display_name")
        except Exception as e:
            print(f"   ❌ Error looking up user {user_id[:8]}...: {e}")
    
    # Test 3: Test batch user lookup
    print("\n3. Testing Batch User Lookup...")
    try:
        users_info = user_service.get_users_info(test_user_ids)
        print(f"   ✅ Batch lookup returned {len(users_info)} results")
        
        for user_id, info in users_info.items():
            if info and info.get('display_name'):
                print(f"      {user_id[:8]}...: {info.get('display_name')} ({info.get('email')})")
            else:
                print(f"      {user_id[:8]}...: No display_name found")
                
    except Exception as e:
        print(f"   ❌ Batch lookup failed: {e}")
    
    # Test 4: Test direct Firestore collection access
    print("\n4. Testing Direct Firestore Collection Access...")
    try:
        # Get a reference to the user sessions collection
        collection_name = os.getenv('FIRESTORE_USER_SESSIONS', 'user_sessions')
        db_name = os.getenv('FIRESTORE_DATABASE_NAME', 'user-notion-tokens')
        
        print(f"   Testing collection: {collection_name} in database: {db_name}")
        
        if hasattr(user_service, 'db') and user_service.db:
            # Try to get the first few documents
            docs = user_service.db.collection(collection_name).limit(3).get()
            doc_count = len(docs)
            
            print(f"   ✅ Found {doc_count} documents in collection")
            
            for doc in docs:
                doc_data = doc.to_dict()
                user_account_info = doc_data.get('userAccountInformation', {})
                if user_account_info:
                    username = user_account_info.get('userName', 'No username')
                    email = user_account_info.get('email', 'No email')
                    print(f"      Doc ID: {doc.id[:8]}... → {username} ({email})")
                else:
                    print(f"      Doc ID: {doc.id[:8]}... → No userAccountInformation")
        else:
            print("   ❌ Firestore database client not available")
                
    except Exception as e:
        print(f"   ❌ Direct collection access failed: {e}")
    
    # Test 5: Test Redis cache integration
    print("\n5. Testing Redis Cache Integration...")
    try:
        # Check if Redis is working
        redis_available = redis_client.ping()
        print(f"   ✅ Redis available: {redis_available}")
        
        if redis_available:
            # Test setting and getting a value
            test_key = "firestore_test"
            test_value = {"test": "data", "timestamp": datetime.now().isoformat()}
            
            success = redis_client.set_value(test_key, test_value, expire_seconds=60)
            print(f"   ✅ Redis set operation: {success}")
            
            retrieved_value = redis_client.get_value(test_key)
            print(f"   ✅ Redis get operation: {retrieved_value is not None}")
            
            # Clean up
            redis_client.client.delete(test_key)
            
    except Exception as e:
        print(f"   ❌ Redis cache test failed: {e}")
    
    # Test 6: Test environment variables
    print("\n6. Testing Environment Configuration...")
    env_vars = {
        'FIREBASE_PROJECT_ID': os.getenv('FIREBASE_PROJECT_ID'),
        'FIRESTORE_USER_SESSIONS': os.getenv('FIRESTORE_USER_SESSIONS'),
        'FIRESTORE_DATABASE_NAME': os.getenv('FIRESTORE_DATABASE_NAME'),
        'FIRESTORE_SERVICE_ACCOUNT_JSON': 'Present' if os.getenv('FIRESTORE_SERVICE_ACCOUNT_JSON') else 'Missing'
    }
    
    for key, value in env_vars.items():
        status = "✅" if value else "❌"
        print(f"   {status} {key}: {value}")
    
    # Test 7: Test force Firestore check
    print("\n7. Testing Force Firestore Check...")
    if test_user_ids:
        try:
            user_id = test_user_ids[0]
            if hasattr(user_service, 'get_user_info_force_firestore'):
                force_result = user_service.get_user_info_force_firestore(user_id)
                
                if force_result and force_result.get('display_name'):
                    print(f"   ✅ Force check found user: {force_result.get('display_name')}")
                    print(f"      Bypassed cache successfully")
                else:
                    print(f"   ⚠️  Force check: User not found or no display_name")
            else:
                print("   ❌ Force Firestore check method not available")
                
        except Exception as e:
            print(f"   ❌ Force Firestore check failed: {e}")
    
    # Test 8: Test Username Resolution Service
    print("\n8. Testing Username Resolution Service...")
    try:
        from app.services.username_resolution_service import get_username_resolution_service
        
        username_service = get_username_resolution_service()
        
        # Test single user resolution
        user_id = test_user_ids[0]
        resolved_user = username_service.resolve_username(user_id)
        
        if resolved_user:
            print(f"   ✅ Username resolution found: {resolved_user.display_name}")
            print(f"      Email: {resolved_user.email}")
            print(f"      Provider: {resolved_user.provider}")
        else:
            print(f"   ⚠️  Username resolution: User not found")
            
        # Test batch resolution
        resolved_users = username_service.resolve_usernames(test_user_ids)
        print(f"   ✅ Batch username resolution: {len(resolved_users)} results")
        
        # Get cache stats
        cache_stats = username_service.get_cache_stats()
        print(f"   ✅ Cache stats: {cache_stats}")
        
    except Exception as e:
        print(f"   ❌ Username resolution service test failed: {e}")
    
    print("\n" + "=" * 60)
    print("🎯 Firestore Functionality Test Complete!")
    return True

if __name__ == "__main__":
    success = test_firestore_functionality()
    sys.exit(0 if success else 1)