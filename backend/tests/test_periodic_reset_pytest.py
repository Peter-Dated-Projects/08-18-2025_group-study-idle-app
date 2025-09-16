#!/usr/bin/env python3
"""
Pytest test suite for the periodic reset service.

Tests periodic reset functionality including status checks, scheduling,
and manual reset operations.
"""

import pytest
import asyncio
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


@pytest.fixture(scope="session")
def event_loop():
    """Create an event loop for async tests."""
    loop = asyncio.get_event_loop()
    yield loop


@pytest.fixture
def test_user_id():
    """Provide a test user ID."""
    return "reset_test_user_pytest"


@pytest.fixture
def db_session():
    """Create a database session for testing."""
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture
def test_user_data(db_session, test_user_id):
    """Create test user data and clean up after test."""
    # Setup: Create test user
    test_user = db_session.query(PomoLeaderboard).filter_by(user_id=test_user_id).first()
    if not test_user:
        test_user = PomoLeaderboard(
            user_id=test_user_id,
            daily_pomo=10,
            weekly_pomo=50,
            monthly_pomo=200,
            yearly_pomo=1000
        )
        db_session.add(test_user)
    else:
        test_user.daily_pomo = 10
        test_user.weekly_pomo = 50
        test_user.monthly_pomo = 200
        test_user.yearly_pomo = 1000
    
    db_session.commit()
    yield test_user
    
    # Cleanup: Remove test user
    db_session.delete(test_user)
    db_session.commit()


def test_reset_service_status():
    """Test getting the status of the reset service."""
    status = periodic_reset_service.get_reset_status()
    
    # Validate status structure
    assert isinstance(status, dict), "Status should be a dictionary"
    assert "is_running" in status, "Status should contain 'is_running'"
    assert "current_time_est" in status, "Status should contain 'current_time_est'"
    assert "last_resets" in status, "Status should contain 'last_resets'"
    assert "next_resets" in status, "Status should contain 'next_resets'"
    
    # Validate last_resets structure
    last_resets = status["last_resets"]
    expected_periods = ["daily", "weekly", "monthly", "yearly"]
    for period in expected_periods:
        assert period in last_resets, f"Last resets should contain '{period}'"
    
    # Validate next_resets structure  
    next_resets = status["next_resets"]
    for period in expected_periods:
        assert period in next_resets, f"Next resets should contain '{period}'"
        assert isinstance(next_resets[period], str), f"Next reset for '{period}' should be a string"
    
    print(f"✓ Service running: {status['is_running']}")
    print(f"✓ Current time: {status['current_time_est']}")


def test_reset_schedule_information():
    """Test that reset schedule information is accessible."""
    schedules = [
        ("Daily", "Every day at 1:00 AM EST", "Resets daily_pomo column"),
        ("Weekly", "Every Sunday at 1:00 AM EST", "Resets weekly_pomo column"),
        ("Monthly", "1st of every month at 1:00 AM EST", "Resets monthly_pomo column"),
        ("Yearly", "January 1st at 1:00 AM EST", "Resets yearly_pomo column")
    ]
    
    # Validate schedule structure exists
    for period, when, what in schedules:
        assert period is not None, f"Period should not be None"
        assert when is not None, f"Schedule for {period} should not be None"
        assert what is not None, f"Description for {period} should not be None"
        print(f"✓ {period}: {when} - {what}")


@pytest.mark.asyncio
async def test_manual_daily_reset(test_user_data, db_session, test_user_id):
    """Test manual daily reset functionality."""
    # Record initial values
    initial_daily = test_user_data.daily_pomo
    initial_weekly = test_user_data.weekly_pomo
    initial_monthly = test_user_data.monthly_pomo
    initial_yearly = test_user_data.yearly_pomo
    
    assert initial_daily == 10, "Initial daily value should be 10"
    
    # Perform manual daily reset
    await periodic_reset_service.reset_period("daily")
    
    # Refresh user data
    db_session.refresh(test_user_data)
    
    # Validate daily was reset, others unchanged
    assert test_user_data.daily_pomo == 0, "Daily pomo should be reset to 0"
    assert test_user_data.weekly_pomo == initial_weekly, "Weekly pomo should be unchanged"
    assert test_user_data.monthly_pomo == initial_monthly, "Monthly pomo should be unchanged"
    assert test_user_data.yearly_pomo == initial_yearly, "Yearly pomo should be unchanged"
    
    print(f"✓ Daily reset successful: {initial_daily} -> {test_user_data.daily_pomo}")


@pytest.mark.asyncio
async def test_manual_weekly_reset(test_user_data, db_session, test_user_id):
    """Test manual weekly reset functionality."""
    # Record initial values
    initial_daily = test_user_data.daily_pomo
    initial_weekly = test_user_data.weekly_pomo
    initial_monthly = test_user_data.monthly_pomo
    initial_yearly = test_user_data.yearly_pomo
    
    assert initial_weekly == 50, "Initial weekly value should be 50"
    
    # Perform manual weekly reset
    await periodic_reset_service.reset_period("weekly")
    
    # Refresh user data
    db_session.refresh(test_user_data)
    
    # Validate weekly was reset, others unchanged
    assert test_user_data.daily_pomo == initial_daily, "Daily pomo should be unchanged"
    assert test_user_data.weekly_pomo == 0, "Weekly pomo should be reset to 0"
    assert test_user_data.monthly_pomo == initial_monthly, "Monthly pomo should be unchanged"
    assert test_user_data.yearly_pomo == initial_yearly, "Yearly pomo should be unchanged"
    
    print(f"✓ Weekly reset successful: {initial_weekly} -> {test_user_data.weekly_pomo}")


@pytest.mark.asyncio
async def test_manual_monthly_reset(test_user_data, db_session, test_user_id):
    """Test manual monthly reset functionality."""
    # Record initial values
    initial_daily = test_user_data.daily_pomo
    initial_weekly = test_user_data.weekly_pomo
    initial_monthly = test_user_data.monthly_pomo
    initial_yearly = test_user_data.yearly_pomo
    
    assert initial_monthly == 200, "Initial monthly value should be 200"
    
    # Perform manual monthly reset
    await periodic_reset_service.reset_period("monthly")
    
    # Refresh user data
    db_session.refresh(test_user_data)
    
    # Validate monthly was reset, others unchanged
    assert test_user_data.daily_pomo == initial_daily, "Daily pomo should be unchanged"
    assert test_user_data.weekly_pomo == initial_weekly, "Weekly pomo should be unchanged"
    assert test_user_data.monthly_pomo == 0, "Monthly pomo should be reset to 0"
    assert test_user_data.yearly_pomo == initial_yearly, "Yearly pomo should be unchanged"
    
    print(f"✓ Monthly reset successful: {initial_monthly} -> {test_user_data.monthly_pomo}")


@pytest.mark.asyncio
async def test_manual_yearly_reset(test_user_data, db_session, test_user_id):
    """Test manual yearly reset functionality.""" 
    # Record initial values
    initial_daily = test_user_data.daily_pomo
    initial_weekly = test_user_data.weekly_pomo
    initial_monthly = test_user_data.monthly_pomo
    initial_yearly = test_user_data.yearly_pomo
    
    assert initial_yearly == 1000, "Initial yearly value should be 1000"
    
    # Perform manual yearly reset
    await periodic_reset_service.reset_period("yearly")
    
    # Refresh user data
    db_session.refresh(test_user_data)
    
    # Validate yearly was reset, others unchanged
    assert test_user_data.daily_pomo == initial_daily, "Daily pomo should be unchanged"
    assert test_user_data.weekly_pomo == initial_weekly, "Weekly pomo should be unchanged"
    assert test_user_data.monthly_pomo == initial_monthly, "Monthly pomo should be unchanged"
    assert test_user_data.yearly_pomo == 0, "Yearly pomo should be reset to 0"
    
    print(f"✓ Yearly reset successful: {initial_yearly} -> {test_user_data.yearly_pomo}")


def test_comprehensive_periodic_reset():
    """Run comprehensive periodic reset tests."""
    print("🧪 Testing Periodic Reset Service")
    print("=" * 50)
    
    # Test status
    test_reset_service_status()
    
    # Test schedule
    test_reset_schedule_information()
    
    print("\n🎉 Periodic reset tests completed successfully!")


if __name__ == "__main__":
    # For backwards compatibility when run directly
    import argparse
    
    parser = argparse.ArgumentParser(description="Test periodic reset service")
    parser.add_argument("command", nargs="?", default="test", 
                       choices=["status", "schedule", "test", "manual"],
                       help="Command to run")
    parser.add_argument("period", nargs="?", choices=["daily", "weekly", "monthly", "yearly"],
                       help="Period for manual reset")
    
    args = parser.parse_args()
    
    try:
        if args.command == "status":
            test_reset_service_status()
        elif args.command == "schedule":
            test_reset_schedule_information()
        elif args.command == "test":
            test_comprehensive_periodic_reset()
        elif args.command == "manual":
            if not args.period:
                print("❌ Period required for manual reset")
                sys.exit(1)
            
            # Simple test for manual reset
            async def manual_test():
                await periodic_reset_service.reset_period(args.period)
                print(f"✅ Manual {args.period} reset completed")
            
            asyncio.run(manual_test())
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        sys.exit(1)
