#!/usr/bin/env python3
"""
Direct test of friend service functionality.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.friend_service_arangodb import friend_service

def test_friend_service_directly():
    """Test the friend service directly without API layer."""
    test_user_id = "803db0b1a2085280bdc9a1ba40e5bfbef8f4c9723e423a7e505d3e33f9f762cd"
    
    print(f"Testing friend service directly for user: {test_user_id}")
    
    # Test get_friends
    print("\n1. Getting friends directly...")
    friends = friend_service.get_friends(test_user_id)
    print(f"Friends returned: {friends}")
    print(f"Number of friends: {len(friends)}")
    
    # Test with a friend we know exists (from the debug output)
    existing_friend = "5a7b661593f73212460242713dd442c0cc0523fb8a4ad238ba01a0e726eaf911"
    print(f"\n2. Testing if {existing_friend} is in the friends list...")
    if existing_friend in friends:
        print("✅ Expected friend found!")
    else:
        print("❌ Expected friend NOT found!")
        
    # Try adding a new friend
    new_friend = "alice"  # We saw this user in the debug output
    print(f"\n3. Trying to add {new_friend} as friend...")
    result = friend_service.add_friend(test_user_id, new_friend)
    print(f"Add friend result: {result}")
    
    # Check friends again
    print(f"\n4. Getting friends after adding {new_friend}...")
    updated_friends = friend_service.get_friends(test_user_id)
    print(f"Updated friends: {updated_friends}")
    print(f"Number of friends: {len(updated_friends)}")

if __name__ == "__main__":
    test_friend_service_directly()