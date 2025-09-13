"""
Integration tests for the groups API endpoints with ArangoDB.
"""
import requests
import pytest
import uuid
import os

# Base URL for the API, configurable via environment variable
BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8080")
GROUPS_API_URL = f"{BASE_URL}/api/groups"

def generate_user_id():
    return f"user_{uuid.uuid4().hex[:8]}"

def generate_group_name():
    return f"Test Group {uuid.uuid4().hex[:4]}"

@pytest.fixture
def test_user():
    """Provides a unique user ID for a test."""
    return generate_user_id()

@pytest.fixture
def test_group(test_user):
    """Creates a group for a test and returns its ID and the creator's ID."""
    group_name = generate_group_name()
    creator_id = test_user
    response = requests.post(f"{GROUPS_API_URL}/create", json={"creator_id": creator_id, "group_name": group_name})
    assert response.status_code == 201, f"Failed to create group: {response.text}"
    group_id = response.json()["group"]["group_id"]

    yield group_id, creator_id

    # Teardown: delete the group, if it still exists
    details_response = requests.get(f"{GROUPS_API_URL}/details/{group_id}")
    if details_response.status_code == 200:
        current_creator = details_response.json().get("creator_id", creator_id)
        requests.delete(f"{GROUPS_API_URL}/delete", json={"group_id": group_id, "user_id": current_creator})

def test_create_group(test_user):
    """Test creating a group."""
    group_name = generate_group_name()
    creator_id = test_user
    response = requests.post(f"{GROUPS_API_URL}/create", json={"creator_id": creator_id, "group_name": group_name})

    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert "Group created successfully" in data["message"]
    group = data["group"]
    assert group["group_name"] == group_name
    assert group["creator_id"] == creator_id
    assert creator_id in group["member_ids"]

    # Cleanup
    requests.delete(f"{GROUPS_API_URL}/delete", json={"group_id": group["group_id"], "user_id": creator_id})

def test_join_and_leave_group(test_group):
    """Test joining and leaving a group."""
    group_id, _ = test_group
    joiner_id = generate_user_id()

    # Join group
    response = requests.post(f"{GROUPS_API_URL}/join", json={"user_id": joiner_id, "group_id": group_id})
    assert response.status_code == 200
    assert response.json()["success"] is True

    # Verify member list
    response = requests.get(f"{GROUPS_API_URL}/details/{group_id}")
    assert joiner_id in response.json()["member_ids"]

    # Leave group
    response = requests.post(f"{GROUPS_API_URL}/leave", json={"user_id": joiner_id, "group_id": group_id})
    assert response.status_code == 200
    assert response.json()["success"] is True

    # Verify member list again
    response = requests.get(f"{GROUPS_API_URL}/details/{group_id}")
    assert joiner_id not in response.json()["member_ids"]

def test_group_limit(test_user):
    """Test the 5-group limit."""
    creator_id = test_user
    group_ids = []
    for i in range(5):
        response = requests.post(f"{GROUPS_API_URL}/create", json={"creator_id": creator_id, "group_name": f"Limit Test {i}"})
        assert response.status_code == 201
        group_ids.append(response.json()["group"]["group_id"])

    # Try to create a 6th group
    response = requests.post(f"{GROUPS_API_URL}/create", json={"creator_id": creator_id, "group_name": "6th Group"})
    assert response.status_code == 400
    assert "maximum limit of 5 groups" in response.json()["detail"]

    # Cleanup
    for group_id in group_ids:
        requests.delete(f"{GROUPS_API_URL}/delete", json={"group_id": group_id, "user_id": creator_id})

def test_creator_leaves_group_transfer_ownership(test_group):
    """Test that ownership is transferred when the creator leaves."""
    group_id, creator_id = test_group

    member2_id = generate_user_id()
    requests.post(f"{GROUPS_API_URL}/join", json={"user_id": member2_id, "group_id": group_id})

    requests.post(f"{GROUPS_API_URL}/leave", json={"user_id": creator_id, "group_id": group_id})

    response = requests.get(f"{GROUPS_API_URL}/details/{group_id}")
    assert response.status_code == 200
    assert response.json()["creator_id"] == member2_id

def test_creator_leaves_last_deletes_group(test_group):
    """Test that the group is deleted when the last member (creator) leaves."""
    group_id, creator_id = test_group

    response = requests.post(f"{GROUPS_API_URL}/leave", json={"user_id": creator_id, "group_id": group_id})
    assert response.status_code == 200
    assert "group was deleted" in response.json()["message"]

    response = requests.get(f"{GROUPS_API_URL}/details/{group_id}")
    assert response.status_code == 404
