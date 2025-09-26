#!/usr/bin/env python3
"""
Debug the specific UserInfo model creation issue in the update profile picture endpoint.
"""

import sys
import logging
from pathlib import Path

# Add the backend directory to Python path
sys.path.append(str(Path(__file__).parent))

from app.services.user_service_arangodb import get_user_service
from app.routers.users import UserInfo

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def debug_user_info_creation():
    """Debug the user info retrieval and model creation."""
    
    user_service = get_user_service()
    test_user_id = "test123"
    
    print(f"🔍 Testing UserInfo creation for user_id: {test_user_id}")
    
    # Test 1: Check if user service is available
    print(f"\n1. Checking ArangoDB availability...")
    is_available = user_service.is_available()
    print(f"   ArangoDB available: {is_available}")
    
    # Test 2: Try to update the picture URL (this should work even for non-existent users)
    print(f"\n2. Testing update_user_picture_url...")
    try:
        success = user_service.update_user_picture_url(test_user_id, "test-image-123")
        print(f"   Update result: {success}")
    except Exception as e:
        print(f"   ❌ Update error: {e}")
        return False
    
    # Test 3: Try to get user info
    print(f"\n3. Testing get_user_info...")
    try:
        user_data = user_service.get_user_info(test_user_id)
        print(f"   User data type: {type(user_data)}")
        print(f"   User data: {user_data}")
        
        if user_data is None:
            print(f"   ⚠️ User data is None - this will cause UserInfo creation to fail")
            return False
            
    except Exception as e:
        print(f"   ❌ Get user info error: {e}")
        return False
    
    # Test 4: Try to create UserInfo model
    print(f"\n4. Testing UserInfo model creation...")
    try:
        if user_data:
            user_info = UserInfo(**user_data)
            print(f"   ✅ UserInfo created successfully: {user_info}")
        else:
            print(f"   ⚠️ Cannot create UserInfo from None data")
            
            # Test with minimal required data
            minimal_data = {"user_id": test_user_id}
            user_info = UserInfo(**minimal_data)
            print(f"   ✅ UserInfo created with minimal data: {user_info}")
            
    except Exception as e:
        print(f"   ❌ UserInfo creation error: {e}")
        print(f"   Error type: {type(e)}")
        
        # Show what fields are missing or problematic
        if user_data and isinstance(user_data, dict):
            print(f"   Available fields: {list(user_data.keys())}")
            print(f"   Required fields: user_id")
        return False
    
    return True

def test_endpoint_logic():
    """Test the complete endpoint logic."""
    
    user_service = get_user_service()
    test_user_id = "test123"
    test_image_id = "test-image-123"
    
    print(f"\n🎯 Testing complete endpoint logic...")
    
    try:
        # Step 1: Update the user's profile picture URL
        success = user_service.update_user_picture_url(test_user_id, test_image_id)
        print(f"Step 1 - Update picture URL: {success}")
        
        if success:
            # Step 2: Get updated user info
            updated_user_data = user_service.get_user_info(test_user_id)
            print(f"Step 2 - Get updated data: {updated_user_data is not None}")
            
            # Step 3: Create UserInfo model  
            updated_user = UserInfo(**updated_user_data) if updated_user_data else None
            print(f"Step 3 - Create UserInfo: {updated_user is not None}")
            
            if updated_user:
                print(f"   UserInfo: {updated_user}")
                print("   ✅ Complete endpoint logic works!")
                return True
            else:
                print("   ❌ Failed to create UserInfo model")
                return False
        else:
            print("   ❌ Failed to update picture URL")
            return False
            
    except Exception as e:
        print(f"❌ Endpoint logic error: {e}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main function to run all debug tests."""
    print("🐛 Debugging Profile Picture Update Endpoint")
    print("=" * 60)
    
    # Debug user info creation
    if debug_user_info_creation():
        print("\n✅ UserInfo creation debug passed")
    else:
        print("\n❌ UserInfo creation debug failed")
        return
    
    # Test complete endpoint logic
    if test_endpoint_logic():
        print("\n✅ Complete endpoint logic works!")
        print("   The 500 error must be caused by something else.")
    else:
        print("\n❌ Endpoint logic failed - found the issue!")

if __name__ == "__main__":
    main()