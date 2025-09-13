#!/usr/bin/env python3
"""
Management script for the periodic sync service.

Usage:
    python scripts/manage_periodic_sync.py start     # Start the service
    python scripts/manage_periodic_sync.py stop      # Stop the service
    python scripts/manage_periodic_sync.py status    # Check service status
    python scripts/manage_periodic_sync.py sync      # Perform one-time sync
    python scripts/manage_periodic_sync.py test      # Test sync with sample data
"""

import asyncio
import argparse
import sys
import json
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from app.services.periodic_sync_service import periodic_sync_service
from app.models.database import SessionLocal, PomoLeaderboard
from app.utils.redis_utils import RedisClient


async def start_service():
    """Start the periodic sync service."""
    print("🚀 Starting periodic sync service...")
    print("📅 Sync interval: Every 1 hour")
    print("Press Ctrl+C to stop")
    
    try:
        await periodic_sync_service.start_periodic_sync()
    except KeyboardInterrupt:
        print("\n🛑 Stopping sync service...")
        periodic_sync_service.stop_periodic_sync()
        print("✅ Service stopped")


def stop_service():
    """Stop the periodic sync service."""
    periodic_sync_service.stop_periodic_sync()
    print("✅ Periodic sync service stopped")


def check_status():
    """Check the status of the sync service."""
    status = periodic_sync_service.get_sync_status()
    
    print("📊 Periodic Sync Service Status:")
    print("=" * 40)
    print(f"Service Running: {'✅ Yes' if status['is_running'] else '❌ No'}")
    print(f"Redis Connected: {'✅ Yes' if status['redis_connected'] else '❌ No'}")
    
    if status['last_sync_time']:
        print(f"Last Sync: {status['last_sync_time']}")
    else:
        print("Last Sync: Never")
    
    if status['next_sync_in_minutes'] is not None:
        if status['next_sync_in_minutes'] <= 0:
            print("Next Sync: Due now")
        else:
            print(f"Next Sync: In {status['next_sync_in_minutes']} minutes")
    else:
        print("Next Sync: Not scheduled")


async def perform_sync():
    """Perform a one-time synchronization."""
    print("🔄 Performing one-time sync...")
    
    stats = await periodic_sync_service.perform_sync()
    
    print("\n📈 Sync Results:")
    print("=" * 30)
    for key, value in stats.items():
        if key == "sync_time":
            print(f"Sync Time: {value}")
        else:
            print(f"{key.replace('_', ' ').title()}: {value}")


async def test_sync():
    """Test the sync system with sample data."""
    print("🧪 Testing periodic sync system...")
    
    # Create test data in Redis
    print("\n1. Creating test data in Redis...")
    test_users = [
        {"user_id": "test_user_1", "daily": 5, "weekly": 25, "monthly": 100, "yearly": 500},
        {"user_id": "test_user_2", "daily": 3, "weekly": 18, "monthly": 75, "yearly": 400},
        {"user_id": "test_user_3", "daily": 8, "weekly": 35, "monthly": 150, "yearly": 750}
    ]
    
    redis_client = RedisClient()
    for user in test_users:
        # Add to leaderboards
        redis_client.client.zadd("leaderboard:daily", {user["user_id"]: user["daily"]})
        redis_client.client.zadd("leaderboard:weekly", {user["user_id"]: user["weekly"]})
        redis_client.client.zadd("leaderboard:monthly", {user["user_id"]: user["monthly"]})
        redis_client.client.zadd("leaderboard:yearly", {user["user_id"]: user["yearly"]})
        
        # Add user details cache
        user_details = {
            "user_id": user["user_id"],
            "daily_pomo": user["daily"],
            "weekly_pomo": user["weekly"],
            "monthly_pomo": user["monthly"],
            "yearly_pomo": user["yearly"],
            "updated_at": "2025-09-13T12:00:00Z"
        }
        redis_client.client.set(f"user:details:{user['user_id']}", json.dumps(user_details))
    
    print(f"✅ Created {len(test_users)} test users in Redis")
    
    # Check PostgreSQL state before sync
    print("\n2. Checking PostgreSQL before sync...")
    session = SessionLocal()
    try:
        pg_users_before = session.query(PomoLeaderboard).count()
        print(f"PostgreSQL users before sync: {pg_users_before}")
    finally:
        session.close()
    
    # Perform sync
    print("\n3. Performing sync...")
    stats = await periodic_sync_service.perform_sync()
    
    print("\n📈 Sync Results:")
    for key, value in stats.items():
        if key != "sync_time":
            print(f"  {key.replace('_', ' ').title()}: {value}")
    
    # Check PostgreSQL state after sync
    print("\n4. Verifying PostgreSQL after sync...")
    session = SessionLocal()
    try:
        pg_users_after = session.query(PomoLeaderboard).all()
        print(f"PostgreSQL users after sync: {len(pg_users_after)}")
        
        for user in pg_users_after:
            if user.user_id.startswith("test_user_"):
                print(f"  {user.user_id}: daily={user.daily_pomo}, weekly={user.weekly_pomo}")
    finally:
        session.close()
    
    # Test update scenario
    print("\n5. Testing user update scenario...")
    print("Updating test_user_1 in Redis...")
    redis_client.client.zadd("leaderboard:daily", {"test_user_1": 10})  # Update from 5 to 10
    
    # Sync again
    await periodic_sync_service.perform_sync()
    
    # Verify update
    session = SessionLocal()
    try:
        updated_user = session.query(PomoLeaderboard).filter_by(user_id="test_user_1").first()
        if updated_user:
            print(f"✅ User updated: daily_pomo = {updated_user.daily_pomo} (should be 10)")
    finally:
        session.close()
    
    # Test deletion scenario
    print("\n6. Testing user deletion scenario...")
    print("Removing test_user_3 from Redis...")
    redis_client.client.zrem("leaderboard:daily", "test_user_3")
    redis_client.client.zrem("leaderboard:weekly", "test_user_3")
    redis_client.client.zrem("leaderboard:monthly", "test_user_3")
    redis_client.client.zrem("leaderboard:yearly", "test_user_3")
    redis_client.client.delete("user:details:test_user_3")
    
    # Sync again
    await periodic_sync_service.perform_sync()
    
    # Verify deletion
    session = SessionLocal()
    try:
        deleted_user = session.query(PomoLeaderboard).filter_by(user_id="test_user_3").first()
        if deleted_user is None:
            print("✅ User successfully deleted from PostgreSQL")
        else:
            print("❌ User still exists in PostgreSQL")
    finally:
        session.close()
    
    print("\n🧹 Cleaning up test data...")
    # Clean up remaining test data
    session = SessionLocal()
    try:
        session.query(PomoLeaderboard).filter(PomoLeaderboard.user_id.like("test_user_%")).delete()
        session.commit()
        
        # Clean Redis
        for user in test_users[:2]:  # Only first 2 since we deleted the 3rd
            redis_client.client.zrem("leaderboard:daily", user["user_id"])
            redis_client.client.zrem("leaderboard:weekly", user["user_id"])
            redis_client.client.zrem("leaderboard:monthly", user["user_id"])
            redis_client.client.zrem("leaderboard:yearly", user["user_id"])
            redis_client.client.delete(f"user:details:{user['user_id']}")
        
        print("✅ Test data cleaned up")
    finally:
        session.close()
    
    print("\n🎉 Periodic sync test completed successfully!")


def main():
    """Main function to handle command line arguments."""
    parser = argparse.ArgumentParser(description="Manage periodic sync service")
    parser.add_argument(
        "action",
        choices=["start", "stop", "status", "sync", "test"],
        help="Action to perform"
    )
    
    args = parser.parse_args()
    
    if args.action == "start":
        asyncio.run(start_service())
    elif args.action == "stop":
        stop_service()
    elif args.action == "status":
        check_status()
    elif args.action == "sync":
        asyncio.run(perform_sync())
    elif args.action == "test":
        asyncio.run(test_sync())


if __name__ == "__main__":
    main()
