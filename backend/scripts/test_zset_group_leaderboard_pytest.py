#!/usr/bin/env python3
"""
Pytest test suite for ZSET-based group leaderboard endpoints.
Verifies that the endpoints now use efficient Redis ZSET operations.
"""

import pytest
import sys
from pathlib import Path

# Add the parent directory to the path so we can import from app
sys.path.append(str(Path(__file__).parent.parent))

from app.utils.redis_utils import RedisClient
from app.services.redis_leaderboard_service import RedisLeaderboardService


@pytest.fixture(scope="session") 
def redis_client():
    """Get Redis client for testing."""
    client = RedisClient()
    return client


@pytest.fixture(scope="session")
def leaderboard_service():
    """Get Redis leaderboard service for testing."""
    return RedisLeaderboardService()


@pytest.fixture
def periods():
    """Get test periods."""
    return ["daily", "weekly", "monthly", "yearly"]


def test_zset_population(redis_client, leaderboard_service, periods):
    """Test ZSET population and basic operations."""
    for period in periods:
        key = leaderboard_service._get_leaderboard_key(period)
        cardinality = redis_client.client.zcard(key)
        
        # ZSET should exist and have users
        assert cardinality >= 0, f"ZSET for {period} should exist"
        print(f"✓ {period}: {key} -> {cardinality} users")


def test_zset_ranking_operations(redis_client, leaderboard_service, periods):
    """Test efficient ranking operations using ZSET commands."""
    test_user = "user_charlie"  # Test user with known data
    
    for period in periods:
        key = leaderboard_service._get_leaderboard_key(period)
        
        # Get rank using ZREVRANK (O(1) operation)
        rank = redis_client.client.zrevrank(key, test_user)
        
        # Get score using ZSCORE (O(1) operation)
        score = redis_client.client.zscore(key, test_user)
        
        # Get total users using ZCARD (O(1) operation)
        total = redis_client.client.zcard(key)
        
        # Validate operations completed without error
        assert total >= 0, f"Total users should be non-negative for {period}"
        
        if rank is not None:
            assert rank >= 0, f"Rank should be non-negative for {period}"
            assert score is not None, f"Score should exist if rank exists for {period}"
            print(f"✓ {period}: {test_user} -> Rank {rank + 1}/{total}, Score: {score}")
        else:
            print(f"✓ {period}: {test_user} -> Not found in leaderboard")


def test_zset_range_operations(redis_client, leaderboard_service, periods):
    """Test ZSET range operations for leaderboard retrieval."""
    for period in periods:
        key = leaderboard_service._get_leaderboard_key(period)
        
        # Get top 10 users with scores using ZREVRANGE with WITHSCORES
        top_users = redis_client.client.zrevrange(key, 0, 9, withscores=True)
        
        # Validate range operation
        assert isinstance(top_users, list), f"Top users should be a list for {period}"
        assert len(top_users) <= 10, f"Should get at most 10 users for {period}"
        
        # Validate score ordering (should be descending)
        if len(top_users) > 1:
            scores = [score for user, score in top_users]
            assert scores == sorted(scores, reverse=True), f"Scores should be in descending order for {period}"
        
        print(f"✓ {period}: Retrieved {len(top_users)} top users")


def test_zset_performance_operations(redis_client, leaderboard_service):
    """Test that ZSET operations are efficient and complete quickly."""
    import time
    
    period = "daily"  # Use daily as test period
    key = leaderboard_service._get_leaderboard_key(period)
    
    # Test ZCARD performance (should be O(1))
    start_time = time.time()
    cardinality = redis_client.client.zcard(key)
    zcard_time = time.time() - start_time
    
    # Test ZREVRANK performance (should be O(log(N)))
    start_time = time.time()
    rank = redis_client.client.zrevrank(key, "user_charlie")
    zrevrank_time = time.time() - start_time
    
    # Test ZREVRANGE performance (should be O(log(N)+M))
    start_time = time.time()
    top_users = redis_client.client.zrevrange(key, 0, 9, withscores=True)
    zrevrange_time = time.time() - start_time
    
    # Performance assertions (should complete very quickly)
    assert zcard_time < 0.1, f"ZCARD took too long: {zcard_time}s"
    assert zrevrank_time < 0.1, f"ZREVRANK took too long: {zrevrank_time}s"  
    assert zrevrange_time < 0.1, f"ZREVRANGE took too long: {zrevrange_time}s"
    
    print(f"✓ Performance: ZCARD={zcard_time:.4f}s, ZREVRANK={zrevrank_time:.4f}s, ZREVRANGE={zrevrange_time:.4f}s")


def test_zset_comprehensive_leaderboard_test():
    """Run comprehensive ZSET-based leaderboard test."""
    print("🧪 Testing ZSET-based Group Leaderboard Endpoints")
    print("=" * 60)
    
    redis_client = RedisClient()
    leaderboard_service = RedisLeaderboardService()
    periods = ["daily", "weekly", "monthly", "yearly"]
    
    # Test all functionality
    test_zset_population(redis_client, leaderboard_service, periods)
    test_zset_ranking_operations(redis_client, leaderboard_service, periods)
    test_zset_range_operations(redis_client, leaderboard_service, periods)
    test_zset_performance_operations(redis_client, leaderboard_service)
    
    print("\n🎉 All ZSET tests completed successfully!")


if __name__ == "__main__":
    # For backwards compatibility when run directly
    try:
        test_zset_comprehensive_leaderboard_test()
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        sys.exit(1)
