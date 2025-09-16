#!/usr/bin/env python3
"""
Pytest test suite for group leaderboard endpoints.

This script creates sample group and leaderboard data in Redis and tests
all the group leaderboard endpoints to ensure they work correctly.
"""
import pytest
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent.absolute()))

from app.utils.redis_json_utils import set_json, get_json, delete_json
from app.utils.redis_utils import redis_client
import requests
import time


@pytest.fixture(scope="session")
def backend_server():
    """Ensure backend server is running."""
    base_url = "http://localhost:8000"
    try:
        response = requests.get(f"{base_url}/healthz")
        if response.status_code != 200:
            pytest.skip("Backend server is not running")
    except requests.exceptions.ConnectionError:
        pytest.skip("Cannot connect to backend server")
    return base_url


@pytest.fixture
def test_data():
    """Create and cleanup test data in Redis."""
    # Test groups data
    test_groups = {
        "group_001": {
            "id": "group_001",
            "creator_id": "user_alice",
            "member_ids": ["user_alice", "user_bob", "user_charlie"],
            "group_name": "Study Warriors",
            "created_at": "2025-09-13T18:00:00",
            "updated_at": "2025-09-13T18:00:00"
        },
        "group_002": {
            "id": "group_002", 
            "creator_id": "user_diana",
            "member_ids": ["user_diana", "user_eve"],
            "group_name": "Focus Masters",
            "created_at": "2025-09-13T18:00:00",
            "updated_at": "2025-09-13T18:00:00"
        }
    }
    
    # Test leaderboard data
    test_leaderboard = {
        "user_alice": {
            "user_id": "user_alice",
            "daily_pomo": 8,
            "weekly_pomo": 35,
            "monthly_pomo": 150,
            "yearly_pomo": 1200,
            "created_at": "2025-09-13T18:00:00",
            "updated_at": "2025-09-13T18:00:00"
        },
        "user_bob": {
            "user_id": "user_bob", 
            "daily_pomo": 5,
            "weekly_pomo": 28,
            "monthly_pomo": 120,
            "yearly_pomo": 980,
            "created_at": "2025-09-13T18:00:00",
            "updated_at": "2025-09-13T18:00:00"
        },
        "user_charlie": {
            "user_id": "user_charlie",
            "daily_pomo": 12,
            "weekly_pomo": 42,
            "monthly_pomo": 180,
            "yearly_pomo": 1500,
            "created_at": "2025-09-13T18:00:00", 
            "updated_at": "2025-09-13T18:00:00"
        },
        "user_diana": {
            "user_id": "user_diana",
            "daily_pomo": 10,
            "weekly_pomo": 45,
            "monthly_pomo": 200,
            "yearly_pomo": 1800,
            "created_at": "2025-09-13T18:00:00",
            "updated_at": "2025-09-13T18:00:00"
        },
        "user_eve": {
            "user_id": "user_eve",
            "daily_pomo": 7,
            "weekly_pomo": 32,
            "monthly_pomo": 140,
            "yearly_pomo": 1100,
            "created_at": "2025-09-13T18:00:00",
            "updated_at": "2025-09-13T18:00:00"
        }
    }
    
    # Setup: Store test data in Redis
    try:
        assert set_json("study_groups", test_groups), "Failed to create study_groups data"
        assert set_json("leaderboard", test_leaderboard), "Failed to create leaderboard data"
        
        yield {
            "groups": test_groups,
            "leaderboard": test_leaderboard
        }
        
    finally:
        # Cleanup: Remove test data
        delete_json("study_groups")
        delete_json("leaderboard")

def test_group_leaderboard_daily(backend_server, test_data):
    """Test group leaderboard for daily period."""
    base_url = f"{backend_server}/api/group-leaderboard"
    response = requests.get(f"{base_url}/group/group_001/daily")
    
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    
    assert "users" in data, "Response should contain 'users' key"
    users = data["users"]
    assert len(users) == 3, f"Expected 3 users, got {len(users)}"
    
    # Verify users are sorted by daily_pomo (descending)
    daily_scores = [user["daily_pomo"] for user in users]
    assert daily_scores == sorted(daily_scores, reverse=True), "Users should be sorted by daily_pomo in descending order"


def test_group_leaderboard_weekly(backend_server, test_data):
    """Test group leaderboard for weekly period."""
    base_url = f"{backend_server}/api/group-leaderboard"
    response = requests.get(f"{base_url}/group/group_001/weekly")
    
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    
    assert "users" in data, "Response should contain 'users' key"
    users = data["users"]
    assert len(users) == 3, f"Expected 3 users, got {len(users)}"
    
    # Verify users are sorted by weekly_pomo (descending)
    weekly_scores = [user["weekly_pomo"] for user in users]
    assert weekly_scores == sorted(weekly_scores, reverse=True), "Users should be sorted by weekly_pomo in descending order"


def test_group_rankings_all_periods(backend_server, test_data):
    """Test group rankings for all periods."""
    base_url = f"{backend_server}/api/group-leaderboard"
    response = requests.get(f"{base_url}/group/group_001/rankings")
    
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    
    assert "rankings" in data, "Response should contain 'rankings' key"
    rankings = data["rankings"]
    assert len(rankings) == 4, f"Expected 4 periods, got {len(rankings)}"
    
    expected_periods = ["daily", "weekly", "monthly", "yearly"]
    for period in expected_periods:
        assert period in rankings, f"Period '{period}' should be in rankings"
        assert isinstance(rankings[period], list), f"Rankings for '{period}' should be a list"


def test_member_rank_in_group(backend_server, test_data):
    """Test member rank in group."""
    base_url = f"{backend_server}/api/group-leaderboard"
    response = requests.get(f"{base_url}/member/user_alice/group/group_001")
    
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    
    assert "user_id" in data, "Response should contain 'user_id' key"
    assert data["user_id"] == "user_alice", f"Expected user_alice, got {data['user_id']}"
    
    # Should contain ranking information for different periods
    expected_keys = ["daily_rank", "weekly_rank", "monthly_rank", "yearly_rank"]
    for key in expected_keys:
        assert key in data, f"Response should contain '{key}' key"


def test_user_group_rankings(backend_server, test_data):
    """Test user's group rankings."""
    base_url = f"{backend_server}/api/group-leaderboard"
    response = requests.get(f"{base_url}/user/user_alice/groups")
    
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    
    assert "groups" in data, "Response should contain 'groups' key"
    groups = data["groups"]
    assert len(groups) >= 1, f"Expected at least 1 group, got {len(groups)}"
    
    # Alice should be in group_001
    group_ids = [group["group_id"] for group in groups]
    assert "group_001" in group_ids, "user_alice should be in group_001"


def test_compare_groups(backend_server, test_data):
    """Test compare groups functionality."""
    base_url = f"{backend_server}/api/group-leaderboard"
    response = requests.get(f"{base_url}/compare-groups?group_ids=group_001,group_002&period=daily")
    
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    
    assert "groups" in data, "Response should contain 'groups' key"
    groups = data["groups"]
    assert len(groups) == 2, f"Expected 2 groups, got {len(groups)}"
    
    group_ids = [group["group_id"] for group in groups]
    assert "group_001" in group_ids, "group_001 should be in comparison"
    assert "group_002" in group_ids, "group_002 should be in comparison"


def test_invalid_group_id(backend_server, test_data):
    """Test behavior with invalid group ID."""
    base_url = f"{backend_server}/api/group-leaderboard"
    response = requests.get(f"{base_url}/group/nonexistent_group/daily")
    
    # Should return 404 or appropriate error status
    assert response.status_code in [404, 400], f"Expected 404 or 400 for invalid group, got {response.status_code}"



# Pytest runner and backwards compatibility
if __name__ == "__main__":
    # For backwards compatibility when run directly
    import sys
    
    print("🔧 Creating test data for group leaderboards...")
    
    # Test groups data  
    test_groups = {
        "group_001": {
            "id": "group_001",
            "creator_id": "user_alice",
            "member_ids": ["user_alice", "user_bob", "user_charlie"],
            "group_name": "Study Warriors",
            "created_at": "2025-09-13T18:00:00",
            "updated_at": "2025-09-13T18:00:00"
        },
        "group_002": {
            "id": "group_002", 
            "creator_id": "user_diana",
            "member_ids": ["user_diana", "user_eve"],
            "group_name": "Focus Masters",
            "created_at": "2025-09-13T18:00:00",
            "updated_at": "2025-09-13T18:00:00"
        }
    }
    
    # Test leaderboard data
    test_leaderboard = {
        "user_alice": {
            "user_id": "user_alice",
            "daily_pomo": 8,
            "weekly_pomo": 35,
            "monthly_pomo": 150,
            "yearly_pomo": 1200,
            "created_at": "2025-09-13T18:00:00",
            "updated_at": "2025-09-13T18:00:00"
        },
        "user_bob": {
            "user_id": "user_bob", 
            "daily_pomo": 5,
            "weekly_pomo": 28,
            "monthly_pomo": 120,
            "yearly_pomo": 980,
            "created_at": "2025-09-13T18:00:00",
            "updated_at": "2025-09-13T18:00:00"
        },
        "user_charlie": {
            "user_id": "user_charlie",
            "daily_pomo": 12,
            "weekly_pomo": 42,
            "monthly_pomo": 180,
            "yearly_pomo": 1500,
            "created_at": "2025-09-13T18:00:00", 
            "updated_at": "2025-09-13T18:00:00"
        },
        "user_diana": {
            "user_id": "user_diana",
            "daily_pomo": 10,
            "weekly_pomo": 45,
            "monthly_pomo": 200,
            "yearly_pomo": 1800,
            "created_at": "2025-09-13T18:00:00",
            "updated_at": "2025-09-13T18:00:00"
        },
        "user_eve": {
            "user_id": "user_eve",
            "daily_pomo": 7,
            "weekly_pomo": 32,
            "monthly_pomo": 140,
            "yearly_pomo": 1100,
            "created_at": "2025-09-13T18:00:00",
            "updated_at": "2025-09-13T18:00:00"
        }
    }
    
    try:
        # Check if backend is running
        base_url = "http://localhost:8000"
        response = requests.get(f"{base_url}/healthz")
        if response.status_code != 200:
            print("❌ Backend server is not running!")
            sys.exit(1)
        
        # Setup test data
        if not set_json("study_groups", test_groups):
            print("❌ Failed to create study_groups data")
            sys.exit(1)
        if not set_json("leaderboard", test_leaderboard):
            print("❌ Failed to create leaderboard data")
            sys.exit(1)
        
        print("✅ Test data created successfully")
        print("🧪 Running group leaderboard tests...")
        
        # Run tests manually (for backwards compatibility)
        test_data = {"groups": test_groups, "leaderboard": test_leaderboard}
        test_group_leaderboard_daily(base_url, test_data)
        test_group_leaderboard_weekly(base_url, test_data)
        test_group_rankings_all_periods(base_url, test_data)
        test_member_rank_in_group(base_url, test_data)
        test_user_group_rankings(base_url, test_data)
        test_compare_groups(base_url, test_data)
        
        print("🎉 All tests completed successfully!")
        
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend server")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        sys.exit(1)
    finally:
        # Cleanup
        try:
            delete_json("study_groups")
            delete_json("leaderboard")
            print("🧹 Test data cleaned up")
        except Exception:
            pass
    
    if server_down > 0:
        print("\n💡 To test the endpoints, start the server first:")
        print("  cd backend && python run_server.py")
    elif passed == len(results):
        print("\n🎉 All tests passed! Group leaderboard endpoints are working correctly.")
    else:
        print("\n⚠️  Some tests failed. Check the output above for details.")
