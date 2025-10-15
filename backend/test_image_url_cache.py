"""
Test script for Image URL Cache Service.
Tests Redis caching of MinIO presigned URLs.
"""

import sys
import os
import logging

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.image_url_cache_service import image_url_cache_service
from app.services.minio_image_service import minio_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def test_image_url_caching():
    """Test the image URL caching functionality."""
    
    print("\n" + "="*70)
    print("IMAGE URL CACHE SERVICE TEST")
    print("="*70)
    
    # Test 1: Cache stats
    print("\n1️⃣  Getting cache stats...")
    stats = image_url_cache_service.get_cache_stats()
    print(f"   ✅ Cache Stats: {stats}")
    
    # Test 2: Get URL for default image (no cache)
    print("\n2️⃣  Getting default image URL (should be cache MISS)...")
    test_image_id = "default_pfp.png"
    
    # Check cache first
    cached_url = image_url_cache_service.get_cached_url(test_image_id)
    print(f"   Cache check: {'HIT' if cached_url else 'MISS'}")
    
    # Get URL from MinIO service (which will now cache it)
    url = minio_service.get_image_url(test_image_id)
    print(f"   ✅ Got URL: {url[:80]}...")
    
    # Test 3: Get URL again (should be cache HIT)
    print("\n3️⃣  Getting default image URL again (should be cache HIT)...")
    cached_url = image_url_cache_service.get_cached_url(test_image_id)
    print(f"   Cache check: {'HIT ✅' if cached_url else 'MISS ❌'}")
    
    if cached_url:
        print(f"   Cached URL matches: {cached_url == url}")
    
    # Test 4: Test cache stats after caching
    print("\n4️⃣  Getting cache stats after caching...")
    stats = image_url_cache_service.get_cache_stats()
    print(f"   ✅ Cache Stats: {stats}")
    
    # Test 5: Test manual cache operations
    print("\n5️⃣  Testing manual cache operations...")
    test_id = "test-image-123"
    test_url = "https://example.com/test-image-123"
    
    # Set
    print(f"   Setting cache: {test_id}")
    success = image_url_cache_service.cache_url(test_id, test_url)
    print(f"   {'✅' if success else '❌'} Cache set: {success}")
    
    # Get
    print(f"   Getting cache: {test_id}")
    retrieved = image_url_cache_service.get_cached_url(test_id)
    print(f"   {'✅' if retrieved == test_url else '❌'} Cache retrieved: {retrieved == test_url}")
    
    # Invalidate
    print(f"   Invalidating cache: {test_id}")
    success = image_url_cache_service.invalidate_url(test_id)
    print(f"   {'✅' if success else '❌'} Cache invalidated: {success}")
    
    # Verify invalidation
    retrieved = image_url_cache_service.get_cached_url(test_id)
    print(f"   {'✅' if retrieved is None else '❌'} Cache is None after invalidation: {retrieved is None}")
    
    # Test 6: Performance comparison
    print("\n6️⃣  Performance comparison...")
    import time
    
    # Cold fetch (no cache)
    image_url_cache_service.invalidate_url("default_pfp.png")
    start = time.time()
    url1 = minio_service.get_image_url("default_pfp.png")
    cold_time = (time.time() - start) * 1000
    print(f"   Cold fetch (no cache): {cold_time:.2f}ms")
    
    # Warm fetch (with cache)
    start = time.time()
    url2 = minio_service.get_image_url("default_pfp.png")
    warm_time = (time.time() - start) * 1000
    print(f"   Warm fetch (cached):   {warm_time:.2f}ms")
    
    speedup = cold_time / warm_time if warm_time > 0 else 0
    print(f"   ⚡ Speedup: {speedup:.1f}x faster with cache")
    
    print("\n" + "="*70)
    print("TEST COMPLETED")
    print("="*70 + "\n")


if __name__ == "__main__":
    try:
        test_image_url_caching()
    except Exception as e:
        logger.error(f"Test failed: {e}", exc_info=True)
        sys.exit(1)
