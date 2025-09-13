#!/usr/bin/env python3
"""
Test script for friends-of-friends functionality.
Creates a network of users and tests second-degree connections.
"""
import requests
import logging
from typing import List

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# API base URL
BACKEND_URL = "http://localhost:8000"
FRIENDS_API_URL = f"{BACKEND_URL}/api/friends"

def add_friend(user_id: str, friend_id: str) -> bool:
    """Add a friendship between two users."""
    try:
        response = requests.post(f"{FRIENDS_API_URL}/add", 
                               json={"user_id": user_id, "friend_id": friend_id})
        data = response.json()
        logger.info(f"Add friend {user_id} -> {friend_id}: {data}")
        return data.get("success", False)
    except Exception as e:
        logger.error(f"Error adding friend: {e}")
        return False

def get_friends(user_id: str) -> List[str]:
    """Get direct friends of a user."""
    try:
        response = requests.get(f"{FRIENDS_API_URL}/list/{user_id}")
        data = response.json()
        return data.get("friends", [])
    except Exception as e:
        logger.error(f"Error getting friends: {e}")
        return []

def get_friends_of_friends(user_id: str) -> List[str]:
    """Get friends-of-friends (second-degree connections) of a user."""
    try:
        response = requests.get(f"{FRIENDS_API_URL}/friends-of-friends/{user_id}")
        data = response.json()
        return data.get("friends", [])
    except Exception as e:
        logger.error(f"Error getting friends-of-friends: {e}")
        return []

def remove_friend(user_id: str, friend_id: str) -> bool:
    """Remove a friendship between two users."""
    try:
        response = requests.post(f"{FRIENDS_API_URL}/remove", 
                               json={"user_id": user_id, "friend_id": friend_id})
        data = response.json()
        return data.get("success", False)
    except Exception as e:
        logger.error(f"Error removing friend: {e}")
        return False

def setup_test_network():
    """
    Create a test network of friends:
    
    Alice -> Bob -> Charlie
    Alice -> David -> Eve
    Bob -> Frank
    
    Expected friends-of-friends for Alice: [Charlie, Eve, Frank]
    Expected friends-of-friends for Bob: [David, Alice, Frank] (but Alice is already direct friend, so [David, Frank])
    """
    logger.info("Setting up test network...")
    
    # Create the network
    friendships = [
        ("alice", "bob"),
        ("alice", "david"),
        ("bob", "charlie"),
        ("bob", "frank"),
        ("david", "eve")
    ]
    
    for user1, user2 in friendships:
        success = add_friend(user1, user2)
        if not success:
            logger.warning(f"Failed to add friendship: {user1} <-> {user2}")
    
    return friendships

def test_friends_of_friends():
    """Test the friends-of-friends functionality."""
    logger.info("=" * 50)
    logger.info("TESTING FRIENDS-OF-FRIENDS FUNCTIONALITY")
    logger.info("=" * 50)
    
    # Setup network
    setup_test_network()
    
    # Test Alice's friends-of-friends
    logger.info("\n--- Testing Alice's connections ---")
    alice_friends = get_friends("alice")
    alice_fof = get_friends_of_friends("alice")
    
    logger.info(f"Alice's direct friends: {alice_friends}")
    logger.info(f"Alice's friends-of-friends: {alice_fof}")
    
    # Expected: Charlie (through Bob), Eve (through David)
    expected_alice_fof = ["charlie", "eve"]
    missing = [f for f in expected_alice_fof if f not in alice_fof]
    unexpected = [f for f in alice_fof if f not in expected_alice_fof]
    
    if not missing and not unexpected:
        logger.info("✅ Alice's friends-of-friends test PASSED")
    else:
        logger.error("❌ Alice's friends-of-friends test FAILED")
        if missing:
            logger.error(f"  Missing: {missing}")
        if unexpected:
            logger.error(f"  Unexpected: {unexpected}")
    
    # Test Bob's friends-of-friends  
    logger.info("\n--- Testing Bob's connections ---")
    bob_friends = get_friends("bob")
    bob_fof = get_friends_of_friends("bob")
    
    logger.info(f"Bob's direct friends: {bob_friends}")
    logger.info(f"Bob's friends-of-friends: {bob_fof}")
    
    # Expected: David (through Alice), but not Alice herself since she's direct friend
    expected_bob_fof = ["david"]
    missing = [f for f in expected_bob_fof if f not in bob_fof]
    unexpected = [f for f in bob_fof if f not in expected_bob_fof and f not in bob_friends]
    
    if not missing and not unexpected:
        logger.info("✅ Bob's friends-of-friends test PASSED")
    else:
        logger.error("❌ Bob's friends-of-friends test FAILED")
        if missing:
            logger.error(f"  Missing: {missing}")
        if unexpected:
            logger.error(f"  Unexpected: {unexpected}")
    
    # Test Charlie's friends-of-friends
    logger.info("\n--- Testing Charlie's connections ---")
    charlie_friends = get_friends("charlie")
    charlie_fof = get_friends_of_friends("charlie")
    
    logger.info(f"Charlie's direct friends: {charlie_friends}")
    logger.info(f"Charlie's friends-of-friends: {charlie_fof}")
    
    # Expected: Alice, Frank (through Bob)
    expected_charlie_fof = ["alice", "frank"]
    missing = [f for f in expected_charlie_fof if f not in charlie_fof]
    unexpected = [f for f in charlie_fof if f not in expected_charlie_fof]
    
    if not missing and not unexpected:
        logger.info("✅ Charlie's friends-of-friends test PASSED")
    else:
        logger.error("❌ Charlie's friends-of-friends test FAILED")
        if missing:
            logger.error(f"  Missing: {missing}")
        if unexpected:
            logger.error(f"  Unexpected: {unexpected}")
    
    # Test edge case: user with no friends
    logger.info("\n--- Testing user with no friends ---")
    lonely_user_fof = get_friends_of_friends("lonely_user")
    logger.info(f"Lonely user's friends-of-friends: {lonely_user_fof}")
    
    if not lonely_user_fof:
        logger.info("✅ Empty friends-of-friends test PASSED")
    else:
        logger.error(f"❌ Empty friends-of-friends test FAILED: {lonely_user_fof}")

def cleanup_test_network():
    """Clean up the test network."""
    logger.info("\n--- Cleaning up test network ---")
    
    friendships = [
        ("alice", "bob"),
        ("alice", "david"), 
        ("bob", "charlie"),
        ("bob", "frank"),
        ("david", "eve")
    ]
    
    for user1, user2 in friendships:
        remove_friend(user1, user2)
    
    logger.info("Test network cleaned up")

def print_network_summary():
    """Print a summary of the current network."""
    logger.info("\n--- Network Summary ---")
    users = ["alice", "bob", "charlie", "david", "eve", "frank"]
    
    for user in users:
        friends = get_friends(user)
        fof = get_friends_of_friends(user)
        logger.info(f"{user}: friends={friends}, friends-of-friends={fof}")

if __name__ == "__main__":
    try:
        # Check if backend is running
        response = requests.get(f"{BACKEND_URL}/healthz")
        if response.status_code != 200:
            logger.error("Backend is not running! Please start the backend server.")
            exit(1)
        
        logger.info("Backend is running, starting tests...")
        
        # Run the test
        test_friends_of_friends()
        
        # Print summary
        print_network_summary()
        
        # Cleanup
        cleanup_test_network()
        
        logger.info("\n🎉 Friends-of-friends testing completed!")
        
    except requests.exceptions.ConnectionError:
        logger.error("❌ Cannot connect to backend server. Please ensure it's running on http://localhost:8000")
    except Exception as e:
        logger.error(f"❌ Test failed with error: {e}")
