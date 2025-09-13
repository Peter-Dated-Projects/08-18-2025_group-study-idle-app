"""
Integration tests for the friends API endpoints with ArangoDB.
"""
import requests
import pytest
import time
import os

# Base URL for the API, configurable via environment variable
BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8080")
FRIENDS_API_URL = f"{BASE_URL}/api/friends"

@pytest.fixture(scope="session", autouse=True)
def wait_for_api():
    """
    Waits for the API to be ready before running tests.
    """
    for _ in range(20):  # Wait for up to 20 seconds
        try:
            response = requests.get(f"{BASE_URL}/api/health")
            if response.status_code == 200:
                print("API is ready.")
                return
        except requests.exceptions.ConnectionError:
            pass
        time.sleep(1)
    pytest.fail("API did not become available in time.")

@pytest.fixture(autouse=True)
def cleanup_users(request):
    """
    A fixture to clean up users created during tests.
    It inspects the test function for markers to know which users to clean up.
    """
    yield
    # Teardown logic
    if hasattr(request.node, 'get_closest_marker'):
        marker = request.node.get_closest_marker('users')
        if marker:
            user_ids = marker.args
            for i in range(0, len(user_ids), 2):
                user1 = user_ids[i]
                user2 = user_ids[i+1] if i+1 < len(user_ids) else None
                if user2:
                    requests.post(f"{FRIENDS_API_URL}/remove", json={"user_id": user1, "friend_id": user2})
                else:
                    # Handle single user cleanup if needed
                    pass


@pytest.mark.users("user1", "friend1")
def test_add_friend():
    """Test adding a friend."""
    user_id = "user1"
    friend_id = "friend1"

    response = requests.post(f"{FRIENDS_API_URL}/add", json={"user_id": user_id, "friend_id": friend_id})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "Friend added successfully" in data["message"]

    # Verify friend list for user1
    response = requests.get(f"{FRIENDS_API_URL}/list/{user_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert friend_id in data["friends"]

    # Verify friend list for friend1
    response = requests.get(f"{FRIENDS_API_URL}/list/{friend_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert user_id in data["friends"]

@pytest.mark.users("user2", "friend2")
def test_add_existing_friend():
    """Test adding a friend that already exists."""
    user_id = "user2"
    friend_id = "friend2"

    requests.post(f"{FRIENDS_API_URL}/add", json={"user_id": user_id, "friend_id": friend_id})
    response = requests.post(f"{FRIENDS_API_URL}/add", json={"user_id": user_id, "friend_id": friend_id})

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False
    assert data["message"] == "User is already a friend"

@pytest.mark.users("user3", "friend3")
def test_remove_friend():
    """Test removing a friend."""
    user_id = "user3"
    friend_id = "friend3"

    requests.post(f"{FRIENDS_API_URL}/add", json={"user_id": user_id, "friend_id": friend_id})
    response = requests.post(f"{FRIENDS_API_URL}/remove", json={"user_id": user_id, "friend_id": friend_id})

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "Friend removed successfully" in data["message"]

    # Verify friend lists are empty
    response = requests.get(f"{FRIENDS_API_URL}/list/{user_id}")
    assert friend_id not in response.json()["friends"]
    response = requests.get(f"{FRIENDS_API_URL}/list/{friend_id}")
    assert user_id not in response.json()["friends"]

def test_remove_non_existing_friend():
    """Test removing a friend that does not exist."""
    user_id = "user4"
    friend_id = "friend4"
    response = requests.post(f"{FRIENDS_API_URL}/remove", json={"user_id": user_id, "friend_id": friend_id})

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False
    assert data["message"] == "Users are not friends"

def test_get_friends_list_for_new_user():
    """Test getting the friend list for a user that doesn't exist yet."""
    user_id = "new_user_without_friends"
    response = requests.get(f"{FRIENDS_API_URL}/list/{user_id}")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["friends"] == []
