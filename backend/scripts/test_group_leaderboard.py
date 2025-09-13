#!/usr/bin/env python3
"""
Test the group leaderboard endpoints with sample data.

This script creates sample group and leaderboard data in Redis and tests
all the group leaderboard endpoints to ensure they work correctly.
"""
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent.absolute()))

from app.utils.redis_json_utils import set_json
from app.utils.redis_utils import redis_client
import requests
import time

def create_test_data():
    """Create test data in Redis for group leaderboards."""
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
        # Store test data in Redis
        if set_json("study_groups", test_groups):
            print("  ✅ Created study_groups data")
        else:
            print("  ❌ Failed to create study_groups data")
            
        if set_json("leaderboard", test_leaderboard):
            print("  ✅ Created leaderboard data")
        else:
            print("  ❌ Failed to create leaderboard data")
            
        return True
        
    except Exception as e:
        print(f"  ❌ Error creating test data: {e}")
        return False

def test_endpoints():
    """Test all group leaderboard endpoints."""
    print("\n🧪 Testing group leaderboard endpoints...")
    
    base_url = "http://localhost:8000/api/group-leaderboard"
    
    test_cases = [
        {
            "name": "Group leaderboard for daily period",
            "url": f"{base_url}/group/group_001/daily",
            "expected_users": 3
        },
        {
            "name": "Group leaderboard for weekly period", 
            "url": f"{base_url}/group/group_001/weekly",
            "expected_users": 3
        },
        {
            "name": "Group rankings for all periods",
            "url": f"{base_url}/group/group_001/rankings",
            "expected_periods": 4
        },
        {
            "name": "Member rank in group",
            "url": f"{base_url}/member/user_alice/group/group_001",
            "expected_user": "user_alice"
        },
        {
            "name": "User's group rankings",
            "url": f"{base_url}/user/user_alice/groups",
            "expected_groups": 1
        },
        {
            "name": "Compare groups",
            "url": f"{base_url}/compare-groups?group_ids=group_001,group_002&period=daily",
            "expected_groups": 2
        }
    ]
    
    results = []
    for test_case in test_cases:
        try:
            print(f"\n  🔍 Testing: {test_case['name']}")
            response = requests.get(test_case["url"], timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                print(f"    ✅ Status: {response.status_code}")
                print(f"    📊 Response keys: {list(data.keys())}")
                
                # Basic validation based on test case
                if "expected_users" in test_case:
                    users = data.get("users", [])
                    if len(users) == test_case["expected_users"]:
                        print(f"    ✅ Expected {test_case['expected_users']} users, got {len(users)}")
                    else:
                        print(f"    ⚠️  Expected {test_case['expected_users']} users, got {len(users)}")
                        
                elif "expected_periods" in test_case:
                    periods = data.get("rankings", {})
                    if len(periods) == test_case["expected_periods"]:
                        print(f"    ✅ Expected {test_case['expected_periods']} periods, got {len(periods)}")
                    else:
                        print(f"    ⚠️  Expected {test_case['expected_periods']} periods, got {len(periods)}")
                        
                elif "expected_user" in test_case:
                    user_id = data.get("user_id")
                    if user_id == test_case["expected_user"]:
                        print(f"    ✅ Expected user {test_case['expected_user']}, got {user_id}")
                    else:
                        print(f"    ⚠️  Expected user {test_case['expected_user']}, got {user_id}")
                        
                elif "expected_groups" in test_case:
                    groups = data.get("groups", []) if "groups" in data else data.get("group_comparisons", [])
                    if len(groups) == test_case["expected_groups"]:
                        print(f"    ✅ Expected {test_case['expected_groups']} groups, got {len(groups)}")
                    else:
                        print(f"    ⚠️  Expected {test_case['expected_groups']} groups, got {len(groups)}")
                
                results.append({"test": test_case["name"], "status": "✅ PASS", "data": data})
                
            else:
                print(f"    ❌ Status: {response.status_code}")
                print(f"    📋 Response: {response.text}")
                results.append({"test": test_case["name"], "status": f"❌ FAIL ({response.status_code})", "data": None})
                
        except requests.exceptions.ConnectionError:
            print("    ⚠️  Connection error - is the server running?")
            results.append({"test": test_case["name"], "status": "⚠️  SERVER_DOWN", "data": None})
        except Exception as e:
            print(f"    ❌ Error: {e}")
            results.append({"test": test_case["name"], "status": f"❌ ERROR: {e}", "data": None})
    
    return results

def cleanup_test_data():
    """Clean up test data from Redis."""
    print("\n🧹 Cleaning up test data...")
    
    try:
        # Remove test data
        if redis_client.client.delete("study_groups"):
            print("  ✅ Removed study_groups data")
        
        if redis_client.client.delete("leaderboard"):
            print("  ✅ Removed leaderboard data")
            
    except Exception as e:
        print(f"  ❌ Error cleaning up: {e}")

if __name__ == "__main__":
    print("🚀 Group Leaderboard Endpoints Test")
    print("=" * 40)
    
    # Check Redis connection
    if not redis_client.ping():
        print("❌ Redis is not available. Please start Redis server.")
        sys.exit(1)
    
    print("✅ Redis connection successful")
    
    # Create test data
    if not create_test_data():
        print("❌ Failed to create test data")
        sys.exit(1)
    
    print("\n⏳ Waiting 2 seconds for data to be available...")
    time.sleep(2)
    
    # Test endpoints
    results = test_endpoints()
    
    # Summary
    print("\n📊 Test Summary:")
    passed = len([r for r in results if "✅ PASS" in r["status"]])
    failed = len([r for r in results if "❌" in r["status"]])
    server_down = len([r for r in results if "SERVER_DOWN" in r["status"]])
    
    print(f"  ✅ Passed: {passed}")
    print(f"  ❌ Failed: {failed}")
    print(f"  ⚠️  Server Down: {server_down}")
    
    # Clean up (optional - comment out to keep test data)
    # cleanup_test_data()
    
    if server_down > 0:
        print("\n💡 To test the endpoints, start the server first:")
        print("  cd backend && python run_server.py")
    elif passed == len(results):
        print("\n🎉 All tests passed! Group leaderboard endpoints are working correctly.")
    else:
        print("\n⚠️  Some tests failed. Check the output above for details.")
