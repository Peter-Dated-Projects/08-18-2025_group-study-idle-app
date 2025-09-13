#!/usr/bin/env python3
"""
Test script for the periodic reset service.

Usage:
    python scripts/test_periodic_reset.py status     # Check reset status
    python scripts/test_periodic_reset.py schedule   # Show reset schedule
    python scripts/test_periodic_reset.py test       # Run comprehensive tests
    python scripts/test_periodic_reset.py manual daily   # Manual reset test
"""

import asyncio
import argparse
import sys
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from app.services.periodic_reset_service import periodic_reset_service
from app.models.database import SessionLocal, PomoLeaderboard
from app.utils.redis_utils import RedisClient

EST = ZoneInfo("America/New_York")


def check_status():
    """Check the status of the reset service."""
    status = periodic_reset_service.get_reset_status()
    
    print("🕒 Periodic Reset Service Status:")
    print("=" * 50)
    print(f"Service Running: {'✅ Yes' if status['is_running'] else '❌ No'}")
    print(f"Current Time (EST): {status['current_time_est']}")
    
    print("\n📅 Last Resets:")
    for period, time_str in status['last_resets'].items():
        if time_str:
            print(f"  {period.title()}: {time_str}")
        else:
            print(f"  {period.title()}: Never")
    
    print("\n⏰ Next Resets:")
    for period, time_str in status['next_resets'].items():
        print(f"  {period.title()}: {time_str}")


def show_schedule():
    """Show the complete reset schedule."""
    print("📋 Periodic Reset Schedule:")
    print("=" * 40)
    print("Timezone: America/New_York (EST)")
    print()
    
    schedules = [
        ("Daily", "Every day at 1:00 AM EST", "Resets daily_pomo column"),
        ("Weekly", "Every Sunday at 1:00 AM EST", "Resets weekly_pomo column"),
        ("Monthly", "1st of every month at 1:00 AM EST", "Resets monthly_pomo column"),
        ("Yearly", "January 1st at 1:00 AM EST", "Resets yearly_pomo column")
    ]
    
    for period, when, what in schedules:
        print(f"🔄 {period} Reset:")
        print(f"   When: {when}")
        print(f"   What: {what}")
        print()


async def test_manual_reset(period: str):
    """Test manual reset for a specific period."""
    print(f"🧪 Testing manual {period} reset...")
    
    # Create test data
    print("1. Creating test data...")
    session = SessionLocal()
    try:
        # Add test user if not exists
        test_user = session.query(PomoLeaderboard).filter_by(user_id="reset_test_user").first()
        if not test_user:
            test_user = PomoLeaderboard(
                user_id="reset_test_user",
                daily_pomo=10,
                weekly_pomo=50,
                monthly_pomo=200,
                yearly_pomo=1000
            )
            session.add(test_user)
        else:
            test_user.daily_pomo = 10
            test_user.weekly_pomo = 50
            test_user.monthly_pomo = 200
            test_user.yearly_pomo = 1000
        
        session.commit()
        print("✅ Test user created with values: daily=10, weekly=50, monthly=200, yearly=1000")
    finally:
        session.close()
    
    # Add to Redis
    redis_client = RedisClient()
    if redis_client.ping():
        redis_client.client.zadd("leaderboard:daily", {"reset_test_user": 10})
        redis_client.client.zadd("leaderboard:weekly", {"reset_test_user": 50})
        redis_client.client.zadd("leaderboard:monthly", {"reset_test_user": 200})
        redis_client.client.zadd("leaderboard:yearly", {"reset_test_user": 1000})
        print("✅ Test data added to Redis")
    
    # Perform reset
    print(f"\n2. Performing {period} reset...")
    stats = await periodic_reset_service.manual_reset(period)
    print(f"✅ Reset completed: {stats}")
    
    # Verify reset
    print("\n3. Verifying reset results...")
    session = SessionLocal()
    try:
        test_user = session.query(PomoLeaderboard).filter_by(user_id="reset_test_user").first()
        if test_user:
            print("PostgreSQL after reset:")
            print(f"  daily_pomo: {test_user.daily_pomo}")
            print(f"  weekly_pomo: {test_user.weekly_pomo}")
            print(f"  monthly_pomo: {test_user.monthly_pomo}")
            print(f"  yearly_pomo: {test_user.yearly_pomo}")
            
            # Check if the correct field was reset
            expected_values = {
                "daily": (0, test_user.daily_pomo),
                "weekly": (0, test_user.weekly_pomo),
                "monthly": (0, test_user.monthly_pomo),
                "yearly": (0, test_user.yearly_pomo)
            }
            
            if expected_values[period][0] == expected_values[period][1]:
                print(f"✅ {period.title()} column correctly reset to 0")
            else:
                print(f"❌ {period.title()} column not reset: expected 0, got {expected_values[period][1]}")
    finally:
        session.close()
    
    # Check Redis
    if redis_client.ping():
        redis_key = f"leaderboard:{period}"
        score = redis_client.client.zscore(redis_key, "reset_test_user")
        if score is None:
            print(f"✅ Redis {period} leaderboard cleared")
        else:
            print(f"❌ Redis {period} leaderboard not cleared: score={score}")
    
    # Cleanup
    print("\n4. Cleaning up test data...")
    session = SessionLocal()
    try:
        session.query(PomoLeaderboard).filter_by(user_id="reset_test_user").delete()
        session.commit()
        print("✅ Test data cleaned up")
    finally:
        session.close()
    
    print(f"\n🎉 {period.title()} reset test completed!")


async def run_comprehensive_test():
    """Run comprehensive tests for the reset service."""
    print("🧪 Running Comprehensive Reset Service Tests...")
    print("=" * 50)
    
    # Test 1: Status check
    print("\n1. Testing status check...")
    try:
        status = periodic_reset_service.get_reset_status()
        print("✅ Status check successful")
        print(f"   Current time: {status['current_time_est']}")
    except Exception as e:
        print(f"❌ Status check failed: {e}")
        return
    
    # Test 2: Database connectivity
    print("\n2. Testing database connectivity...")
    try:
        from sqlalchemy import text
        session = SessionLocal()
        session.execute(text("SELECT 1"))
        session.close()
        print("✅ PostgreSQL connection successful")
    except Exception as e:
        print(f"❌ PostgreSQL connection failed: {e}")
        return
    
    # Test 3: Redis connectivity
    print("\n3. Testing Redis connectivity...")
    try:
        redis_client = RedisClient()
        if redis_client.ping():
            print("✅ Redis connection successful")
        else:
            print("❌ Redis connection failed")
    except Exception as e:
        print(f"❌ Redis connection error: {e}")
    
    # Test 4: Schedule calculation
    print("\n4. Testing schedule calculations...")
    try:
        now_est = datetime.now(EST)
        next_daily = periodic_reset_service._get_next_daily_reset(now_est)
        next_weekly = periodic_reset_service._get_next_weekly_reset(now_est)
        next_monthly = periodic_reset_service._get_next_monthly_reset(now_est)
        next_yearly = periodic_reset_service._get_next_yearly_reset(now_est)
        
        print("✅ Schedule calculations successful")
        print(f"   Next daily: {next_daily}")
        print(f"   Next weekly: {next_weekly}")
        print(f"   Next monthly: {next_monthly}")
        print(f"   Next yearly: {next_yearly}")
    except Exception as e:
        print(f"❌ Schedule calculation failed: {e}")
    
    # Test 5: Manual reset (daily)
    print("\n5. Testing manual daily reset...")
    try:
        await test_manual_reset("daily")
        print("✅ Manual daily reset test successful")
    except Exception as e:
        print(f"❌ Manual daily reset test failed: {e}")
    
    print("\n🎉 Comprehensive test completed!")


def main():
    """Main function to handle command line arguments."""
    parser = argparse.ArgumentParser(description="Test periodic reset service")
    parser.add_argument(
        "action",
        choices=["status", "schedule", "test", "manual"],
        help="Action to perform"
    )
    parser.add_argument(
        "period", 
        nargs="?",
        choices=["daily", "weekly", "monthly", "yearly"],
        help="Period for manual reset (required with 'manual' action)"
    )
    
    args = parser.parse_args()
    
    if args.action == "status":
        check_status()
    elif args.action == "schedule":
        show_schedule()
    elif args.action == "test":
        asyncio.run(run_comprehensive_test())
    elif args.action == "manual":
        if not args.period:
            print("Error: period required for manual reset")
            print("Usage: python test_periodic_reset.py manual <daily|weekly|monthly|yearly>")
            sys.exit(1)
        asyncio.run(test_manual_reset(args.period))


if __name__ == "__main__":
    main()
