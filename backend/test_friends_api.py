#!/usr/bin/env python3
"""
Test script to verify friends functionality works.
"""
import requests
import json

def test_friends_api():
    """Test the friends API endpoints directly."""
    base_url = "http://localhost:8000"
    test_user_id = "803db0b1a2085280bdc9a1ba40e5bfbef8f4c9723e423a7e505d3e33f9f762cd"
    test_friend_id = "friend_test_123"  # This should be a real user ID if you have one
    
    print(f"Testing friends API for user: {test_user_id}")
    
    # 1. Get current friends list
    print("\n1. Getting current friends list...")
    get_response = requests.get(f"{base_url}/api/friends/list/{test_user_id}")
    print(f"Get friends response status: {get_response.status_code}")
    print(f"Raw response text: '{get_response.text}'")
    
    if get_response.status_code == 200 and get_response.text.strip():
        try:
            friends_data = get_response.json()
            print("Friends data:", json.dumps(friends_data, indent=2))
            current_friends = friends_data.get("friends", [])
            print(f"Current friends count: {len(current_friends)}")
        except json.JSONDecodeError:
            print("Failed to parse JSON response")
            return
    else:
        print("Get friends failed or empty response")
        return
    
    # 2. Try to add a friend (this might fail if friend doesn't exist)
    print(f"\n2. Adding friend {test_friend_id}...")
    add_data = {
        "user_id": test_user_id,
        "friend_id": test_friend_id
    }
    
    add_response = requests.post(
        f"{base_url}/api/friends/add",
        json=add_data,
        headers={"Content-Type": "application/json"}
    )
    
    print(f"Add friend response status: {add_response.status_code}")
    print(f"Add friend response text: '{add_response.text}'")
    if add_response.status_code == 200 and add_response.text.strip():
        try:
            add_result = add_response.json()
            print(f"Add result: {add_result}")
        except json.JSONDecodeError:
            print("Failed to parse add friend JSON response")
    else:
        print(f"Add friend failed: {add_response.text}")
    
    # 3. Check friends list again to see if friend was added
    print("\n3. Getting friends list after adding...")
    verify_response = requests.get(f"{base_url}/api/friends/list/{test_user_id}")
    print(f"Verify response status: {verify_response.status_code}")
    print(f"Verify response text: '{verify_response.text}'")
    
    if verify_response.status_code == 200 and verify_response.text.strip():
        try:
            updated_data = verify_response.json()
            print("Updated friends data:", json.dumps(updated_data, indent=2))
            updated_friends = updated_data.get("friends", [])
            print(f"Updated friends count: {len(updated_friends)}")
            
            if len(updated_friends) > len(current_friends):
                print("✅ Friend was successfully added!")
            else:
                print("❓ Friend might not have been added or friend user doesn't exist")
        except json.JSONDecodeError:
            print("Failed to parse verify JSON response")

if __name__ == "__main__":
    test_friends_api()