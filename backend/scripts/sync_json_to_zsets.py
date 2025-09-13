#!/usr/bin/env python3
"""
Script to sync existing JSON leaderboard data to Redis ZSETs.
This ensures ZSET rankings are populated from existing user stats.
"""

import sys
from pathlib import Path

# Add the parent directory to the path so we can import from app
sys.path.append(str(Path(__file__).parent.parent))

from app.utils.redis_utils import RedisClient

def sync_json_to_zsets():
    """Sync JSON leaderboard data to Redis ZSETs for efficient ranking."""
    
    redis_client = RedisClient()
    
    # Get existing JSON leaderboard data (using RedisJSON)
    try:
        leaderboard = redis_client.client.json().get('leaderboard', '.')
        if not leaderboard:
            print("No JSON leaderboard data found")
            return
    except Exception as e:
        print(f"Error getting JSON leaderboard: {e}")
        return
    print(f"Found {len(leaderboard)} users in JSON leaderboard")
    
    # ZSET keys for different periods
    zset_keys = {
        "daily": "leaderboard:daily",
        "weekly": "leaderboard:weekly", 
        "monthly": "leaderboard:monthly",
        "yearly": "leaderboard:yearly"
    }
    
    # Track sync stats
    sync_stats = {period: 0 for period in zset_keys.keys()}
    
    # Sync each user's stats to appropriate ZSETs
    for user_id, stats in leaderboard.items():
        print(f"\nSyncing user: {user_id}")
        
        # Sync each period
        for period, zset_key in zset_keys.items():
            score_key = f"{period}_pomo"
            score = stats.get(score_key, 0)
            
            if score > 0:
                redis_client.client.zadd(zset_key, {user_id: score})
                sync_stats[period] += 1
                print(f"  {period}: {score} → {zset_key}")
            else:
                print(f"  {period}: {score} (skipped)")
    
    # Set TTL on ZSETs (24 hours like in the service)
    ttl = 24 * 60 * 60  # 24 hours
    for zset_key in zset_keys.values():
        redis_client.client.expire(zset_key, ttl)
    
    # Print final stats
    print(f"\n{'='*50}")
    print("SYNC COMPLETE")
    print(f"{'='*50}")
    for period, count in sync_stats.items():
        zset_key = zset_keys[period]
        cardinality = redis_client.client.zcard(zset_key)
        print(f"{period.capitalize()}: {count} users synced → {zset_key} (cardinality: {cardinality})")
    
    print(f"\nAll ZSETs set to expire in {ttl} seconds (24 hours)")

if __name__ == "__main__":
    sync_json_to_zsets()
