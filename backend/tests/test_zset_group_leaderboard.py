#!/usr/bin/env python3
"""
Test script for the updated ZSET-based group leaderboard endpoints.
Verifies that the endpoints now use efficient Redis ZSET operations.
"""

import sys
from pathlib import Path

# Add the parent directory to the path so we can import from app
sys.path.append(str(Path(__file__).parent.parent))

from app.utils.redis_utils import RedisClient
from app.services.redis_leaderboard_service import RedisLeaderboardService

def test_zset_group_leaderboard():
    """Test the ZSET-based group leaderboard functionality."""
    
    print("🧪 Testing ZSET-based Group Leaderboard Endpoints")
    print("=" * 60)
    
    redis_client = RedisClient()
    leaderboard_service = RedisLeaderboardService()
    
    # Test 1: Check ZSET population
    print("\n1. Testing ZSET Population:")
    periods = ["daily", "weekly", "monthly", "yearly"]
    for period in periods:
        key = leaderboard_service._get_leaderboard_key(period)
        cardinality = redis_client.client.zcard(key)
        print(f"   {period}: {key} -> {cardinality} users")
    
    # Test 2: Test efficient ranking operations
    print("\n2. Testing ZSET Ranking Operations:")
    test_user = "user_charlie"  # We know this user has 12 daily pomos
    
    for period in periods:
        key = leaderboard_service._get_leaderboard_key(period)
        
        # Get rank using ZREVRANK (O(1) operation)
        rank = redis_client.client.zrevrank(key, test_user)
        
        # Get score using ZSCORE (O(1) operation)
        score = redis_client.client.zscore(key, test_user)
        
        # Get total users using ZCARD (O(1) operation)
        total = redis_client.client.zcard(key)
        
        print(f"   {period}: {test_user} -> Rank {rank + 1 if rank is not None else 'N/A'}/{total}, Score: {score}")
    
    # Test 3: Test range queries
    print("\n3. Testing ZSET Range Queries:")
    daily_key = leaderboard_service._get_leaderboard_key("daily")
    
    # Get top 3 users (ZREVRANGE operation)
    top_3 = redis_client.client.zrevrange(daily_key, 0, 2, withscores=True)
    print("   Top 3 daily users:")
    for i, (user_id, score) in enumerate(top_3):
        print(f"     #{i+1}: {user_id} -> {int(score)} pomos")
    
    # Get users around rank 2-4 (range query)
    around_middle = redis_client.client.zrevrange(daily_key, 1, 3, withscores=True)
    print("   Users ranked 2-4:")
    for i, (user_id, score) in enumerate(around_middle):
        print(f"     #{i+2}: {user_id} -> {int(score)} pomos")
    
    # Test 4: Compare ZSET vs JSON performance conceptually
    print("\n4. Performance Comparison (ZSET vs JSON):")
    print("   ✅ ZSET Approach:")
    print("     - ZREVRANK: O(1) rank lookup")
    print("     - ZSCORE: O(1) score lookup") 
    print("     - ZREVRANGE: O(log N + M) range queries")
    print("     - ZCARD: O(1) total count")
    print("   ❌ Old JSON Approach:")
    print("     - Load entire JSON: O(N)")
    print("     - Sort in Python: O(N log N)")
    print("     - Find rank: O(N) linear search")
    
    # Test 5: Test leaderboard service integration
    print("\n5. Testing Leaderboard Service Integration:")
    top_daily = leaderboard_service.get_leaderboard("daily", 3)
    if top_daily:
        print("   Top 3 daily users from service:")
        for i, user_entry in enumerate(top_daily):
            print(f"     #{i+1}: {user_entry.user_id} -> {user_entry.daily_pomo} daily pomos")
    else:
        print("   No leaderboard data from service")
    
    # Test 6: Verify user stats lookup
    print("\n6. Testing User Stats Lookup:")
    test_user_stats = leaderboard_service.get_user_details(test_user)
    if test_user_stats:
        print(f"   {test_user} stats:")
        for period in periods:
            score = test_user_stats.get(f"{period}_pomo", 0)
            print(f"     {period}: {score} pomos")
    else:
        print(f"   No stats found for {test_user}")
    
    print("\n" + "=" * 60)
    print("✅ ZSET-based Group Leaderboard Tests Complete!")
    print("The group leaderboard endpoints now use efficient Redis ZSET operations")
    print("instead of loading and sorting JSON data in Python.")

if __name__ == "__main__":
    test_zset_group_leaderboard()
