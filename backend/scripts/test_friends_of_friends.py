#!/usr/bin/env python3
"""
Pytest test suite for friends-of-friends functionality.
Creates a network of users and tests second-degree connections.
"""
import pytest
import requests
import logging
from typing import List

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# API base URL
BACKEND_URL = "http://localhost:8000"
FRIENDS_API_URL = f"{BACKEND_URL}/api/friends"


@pytest.fixture(scope="session")
def backend_server():
    """Ensure backend server is running for all tests."""
    try:
        response = requests.get(f"{BACKEND_URL}/healthz")
        if response.status_code != 200:
            pytest.skip("Backend server is not running")
    except requests.exceptions.ConnectionError:
        pytest.skip("Cannot connect to backend server")
    return BACKEND_URL


@pytest.fixture
def test_friendships():
    """Create and cleanup test friendship network."""
    friendships = [
        ("alice", "bob"),
        ("alice", "david"),
        ("bob", "charlie"),
        ("bob", "frank"),
        ("david", "eve")
    ]
    
    # Setup: Create friendships
    created_friendships = []
    for user1, user2 in friendships:
        if add_friend(user1, user2):
            created_friendships.append((user1, user2))
    
    yield created_friendships
    
    # Cleanup: Remove friendships
    for user1, user2 in created_friendships:
        remove_friend(user1, user2)

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


def test_alice_friends_of_friends(backend_server, test_friendships):
    """Test Alice's friends-of-friends connections."""
    logger.info("Testing Alice's connections")
    
    alice_friends = get_friends("alice")
    alice_fof = get_friends_of_friends("alice")
    
    logger.info(f"Alice's direct friends: {alice_friends}")
    logger.info(f"Alice's friends-of-friends: {alice_fof}")
    
    # Expected: Charlie (through Bob), Eve (through David)
    expected_alice_fof = ["charlie", "eve"]
    
    for expected_friend in expected_alice_fof:
        assert expected_friend in alice_fof, f"Expected {expected_friend} in Alice's friends-of-friends"
    
    # Ensure direct friends are not in friends-of-friends
    for direct_friend in alice_friends:
        assert direct_friend not in alice_fof, f"Direct friend {direct_friend} should not be in friends-of-friends"


def test_bob_friends_of_friends(backend_server, test_friendships):
    """Test Bob's friends-of-friends connections.""" 
    logger.info("Testing Bob's connections")
    
    bob_friends = get_friends("bob")
    bob_fof = get_friends_of_friends("bob")
    
    logger.info(f"Bob's direct friends: {bob_friends}")
    logger.info(f"Bob's friends-of-friends: {bob_fof}")
    
    # Expected: David (through Alice), but not Alice herself since she's direct friend
    expected_bob_fof = ["david"]
    
    for expected_friend in expected_bob_fof:
        assert expected_friend in bob_fof, f"Expected {expected_friend} in Bob's friends-of-friends"
    
    # Ensure direct friends are not in friends-of-friends
    for direct_friend in bob_friends:
        assert direct_friend not in bob_fof, f"Direct friend {direct_friend} should not be in friends-of-friends"


def test_charlie_friends_of_friends(backend_server, test_friendships):
    """Test Charlie's friends-of-friends connections."""
    logger.info("Testing Charlie's connections")
    
    charlie_friends = get_friends("charlie")
    charlie_fof = get_friends_of_friends("charlie")
    
    logger.info(f"Charlie's direct friends: {charlie_friends}")
    logger.info(f"Charlie's friends-of-friends: {charlie_fof}")
    
    # Expected: Alice, Frank (through Bob)
    expected_charlie_fof = ["alice", "frank"]
    
    for expected_friend in expected_charlie_fof:
        assert expected_friend in charlie_fof, f"Expected {expected_friend} in Charlie's friends-of-friends"


def test_empty_friends_of_friends(backend_server):
    """Test user with no friends has empty friends-of-friends."""
    logger.info("Testing user with no friends")
    
    lonely_user_fof = get_friends_of_friends("lonely_user")
    logger.info(f"Lonely user's friends-of-friends: {lonely_user_fof}")
    
    assert not lonely_user_fof, f"User with no friends should have empty friends-of-friends, got: {lonely_user_fof}"

def cleanup_test_network():
    """Clean up the test network."""
    logger.info("Cleaning up test network")
    
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
    logger.info("Network Summary")
    users = ["alice", "bob", "charlie", "david", "eve", "frank"]
    
    for user in users:
        friends = get_friends(user)
        fof = get_friends_of_friends(user)
        logger.info(f"{user}: friends={friends}, friends-of-friends={fof}")


# Pytest runner function
def test_complete_friends_of_friends_suite(backend_server):
    """Run the complete friends-of-friends test suite as a single integration test."""
    logger.info("=" * 50)
    logger.info("RUNNING COMPLETE FRIENDS-OF-FRIENDS TEST SUITE")
    logger.info("=" * 50)
    
    # Setup network
    setup_test_network()
    
    try:
        # Test all scenarios
        test_alice_friends_of_friends(backend_server, [])
        test_bob_friends_of_friends(backend_server, [])
        test_charlie_friends_of_friends(backend_server, [])
        test_empty_friends_of_friends(backend_server)
        
        # Print summary
        print_network_summary()
        
        logger.info("🎉 All friends-of-friends tests completed!")
        
    finally:
        # Cleanup
        cleanup_test_network()


if __name__ == "__main__":
    # For backwards compatibility when run directly
    import sys
    try:
        # Check if backend is running
        response = requests.get(f"{BACKEND_URL}/healthz")
        if response.status_code != 200:
            logger.error("Backend is not running! Please start the backend server.")
            sys.exit(1)
        
        logger.info("Backend is running, starting tests...")
        
        # Run as pytest would
        test_complete_friends_of_friends_suite(BACKEND_URL)
        
    except requests.exceptions.ConnectionError:
        logger.error("❌ Cannot connect to backend server. Please ensure it's running on http://localhost:8000")
        sys.exit(1)
    except Exception as e:
        logger.error(f"❌ Test failed with error: {e}")
        sys.exit(1)
