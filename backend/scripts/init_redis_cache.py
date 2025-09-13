#!/usr/bin/env python3
"""
Redis Leaderboard Cache Initialization Script
Populates Redis cache with all user data from PostgreSQL for optimal performance.
"""

import sys
import logging
import argparse
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def setup_imports():
    """Setup imports after adding parent directory to path."""
    # Add the parent directory to the Python path to import app modules
    parent_dir = Path(__file__).parent.parent
    sys.path.append(str(parent_dir))
    
    from app.services.redis_leaderboard_service import redis_leaderboard_service
    from app.models.database import SessionLocal, PomoLeaderboard
    
    return redis_leaderboard_service, SessionLocal, PomoLeaderboard

def initialize_redis_cache(force_refresh=False):
    """
    Initialize Redis cache with all user data from PostgreSQL.
    
    Args:
        force_refresh (bool): If True, clear cache first and rebuild
    """
    try:
        redis_service, SessionLocal, PomoLeaderboard = setup_imports()
        
        logger.info("🚀 Initializing Redis leaderboard cache...")
        
        # Check Redis connectivity
        if not redis_service.ping_redis():
            logger.error("❌ Redis is not available. Please check Redis server.")
            return False
        
        logger.info("✅ Redis connection verified")
        
        # Clear cache if force refresh
        if force_refresh:
            logger.info("🗑️  Clearing existing cache...")
            redis_service.clear_cache()
        
        # Get user count from PostgreSQL
        session = SessionLocal()
        total_users = session.query(PomoLeaderboard).count()
        logger.info(f"📊 Found {total_users} users in PostgreSQL")
        session.close()
        
        if total_users == 0:
            logger.warning("⚠️  No users found in PostgreSQL PomoLeaderboard table")
            return True
        
        # Sync all users to cache
        logger.info("🔄 Syncing all users to Redis cache...")
        synced_count = redis_service.sync_all_users_to_cache()
        
        if synced_count == total_users:
            logger.info(f"✅ Successfully synced all {synced_count} users to Redis cache")
        else:
            logger.warning(f"⚠️  Synced {synced_count}/{total_users} users. Some users may have failed.")
        
        # Verify cache status
        logger.info("🔍 Verifying cache status...")
        
        # Check each leaderboard period
        periods = ["daily", "weekly", "monthly", "yearly"]
        for period in periods:
            leaderboard_key = redis_service._get_leaderboard_key(period)
            cached_count = redis_service.redis_client.client.zcard(leaderboard_key)
            logger.info(f"  {period.capitalize()} leaderboard: {cached_count} users cached")
        
        # Check user details cache
        user_pattern = redis_service.USER_DETAILS_KEY.format(user_id="*")
        user_keys = redis_service.redis_client.client.keys(user_pattern)
        logger.info(f"  User details cache: {len(user_keys)} users cached")
        
        logger.info("🎉 Redis leaderboard cache initialization complete!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize Redis cache: {e}")
        return False

def test_cache_performance():
    """Test cache performance with sample queries."""
    try:
        redis_service, SessionLocal, PomoLeaderboard = setup_imports()
        
        logger.info("⚡ Testing cache performance...")
        
        # Test leaderboard queries
        periods = ["daily", "weekly", "monthly", "yearly"]
        for period in periods:
            import time
            start_time = time.time()
            
            leaderboard = redis_service.get_leaderboard(period, limit=10)
            
            end_time = time.time()
            query_time = (end_time - start_time) * 1000  # Convert to milliseconds
            
            logger.info(f"  {period.capitalize()} leaderboard (top 10): {len(leaderboard)} entries in {query_time:.2f}ms")
        
        # Test user details query
        session = SessionLocal()
        users = session.query(PomoLeaderboard).limit(3).all()
        
        for user in users:
            start_time = time.time()
            redis_service.get_user_details(user.user_id)
            end_time = time.time()
            query_time = (end_time - start_time) * 1000
            
            logger.info(f"  User details ({user.user_id[:8]}...): {query_time:.2f}ms")
        
        session.close()
        logger.info("✅ Performance test complete")
        
    except Exception as e:
        logger.error(f"❌ Performance test failed: {e}")

def show_cache_status():
    """Show current cache status and statistics."""
    try:
        redis_service, SessionLocal, PomoLeaderboard = setup_imports()
        
        logger.info("📊 Redis Cache Status:")
        
        # Redis connectivity
        redis_connected = redis_service.ping_redis()
        logger.info(f"  Redis Connected: {redis_connected}")
        
        if not redis_connected:
            return
        
        # Database vs Cache comparison
        session = SessionLocal()
        db_user_count = session.query(PomoLeaderboard).count()
        session.close()
        
        # Cache user count
        user_pattern = redis_service.USER_DETAILS_KEY.format(user_id="*")
        cached_user_keys = redis_service.redis_client.client.keys(user_pattern)
        cached_user_count = len(cached_user_keys)
        
        logger.info(f"  Database Users: {db_user_count}")
        logger.info(f"  Cached Users: {cached_user_count}")
        
        if cached_user_count == db_user_count:
            logger.info("  ✅ Cache is fully synchronized")
        else:
            logger.warning(f"  ⚠️  Cache missing {db_user_count - cached_user_count} users")
        
        # Leaderboard sizes
        logger.info("  Leaderboard Cache Sizes:")
        periods = ["daily", "weekly", "monthly", "yearly"]
        for period in periods:
            leaderboard_key = redis_service._get_leaderboard_key(period)
            size = redis_service.redis_client.client.zcard(leaderboard_key)
            logger.info(f"    {period.capitalize()}: {size} users")
        
        # Memory usage (if available)
        try:
            memory_info = redis_service.redis_client.client.info('memory')
            used_memory_mb = memory_info.get('used_memory', 0) / (1024 * 1024)
            logger.info(f"  Redis Memory Usage: {used_memory_mb:.2f} MB")
        except Exception:
            logger.info("  Redis Memory Usage: Not available")
        
    except Exception as e:
        logger.error(f"❌ Failed to get cache status: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Initialize and manage Redis leaderboard cache")
    parser.add_argument(
        "--force-refresh",
        action="store_true",
        help="Clear existing cache and rebuild from PostgreSQL"
    )
    parser.add_argument(
        "--status",
        action="store_true", 
        help="Show current cache status without making changes"
    )
    parser.add_argument(
        "--test-performance",
        action="store_true",
        help="Test cache performance with sample queries"
    )
    
    args = parser.parse_args()
    
    if args.status:
        show_cache_status()
    elif args.test_performance:
        test_cache_performance()
    else:
        success = initialize_redis_cache(force_refresh=args.force_refresh)
        if success and not args.force_refresh:
            # Show final status
            show_cache_status()
