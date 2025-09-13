# /backend/scripts/init_redis_cache.py - Redis Cache Initialization & Management

## Purpose

Administrative script for initializing, managing, and testing the Redis leaderboard cache system. Handles bulk synchronization from PostgreSQL, performance testing, and cache health monitoring.

## Core Functionality

### 1. **Cache Initialization**

- Bulk sync all users from PostgreSQL to Redis
- Populate all ZSET leaderboards (daily, weekly, monthly, yearly)
- Initialize user details cache
- Validate data consistency

### 2. **Performance Testing**

- Benchmark leaderboard query performance
- Test automatic sorting with ZSET operations
- Measure cache vs PostgreSQL response times
- Memory usage analysis

### 3. **Cache Management**

- Force refresh all cached data
- Health status monitoring
- Consistency validation
- Manual sync operations

## Usage Patterns

### Basic Operations

```bash
# Initialize cache from PostgreSQL
python scripts/init_redis_cache.py

# Force refresh (clear + reload)
python scripts/init_redis_cache.py --force-refresh

# Performance testing
python scripts/init_redis_cache.py --test-performance

# Status check only
python scripts/init_redis_cache.py --status-only
```

### Advanced Usage

```bash
# Comprehensive testing
python scripts/init_redis_cache.py --test-performance --verbose

# Batch processing with custom size
python scripts/init_redis_cache.py --batch-size 50

# Silent operation for automation
python scripts/init_redis_cache.py --quiet
```

## Key Functions

### `init_redis_cache(force_refresh=False)`

```python
# Primary initialization function
# - Connects to PostgreSQL and Redis
# - Fetches all PomoLeaderboard records
# - Populates Redis ZSETs with user scores
# - Creates user details cache
# - Returns initialization statistics
```

### `test_leaderboard_performance()`

```python
# Performance benchmark suite
# - Tests leaderboard queries across all periods
# - Measures Redis ZSET operation times
# - Validates automatic sorting behavior
# - Compares cache vs database performance
```

### `validate_cache_consistency()`

```python
# Data integrity checking
# - Compares Redis cache with PostgreSQL
# - Identifies sync discrepancies
# - Reports missing or outdated entries
# - Suggests remediation actions
```

### `get_cache_status()`

```python
# Health monitoring
# - Redis connectivity check
# - Leaderboard entry counts
# - Memory usage statistics
# - Cache hit rate analysis
```

## Performance Metrics

### Benchmark Results (Example)

```
Redis Cache Performance Test Results:
=====================================

Leaderboard Queries:
- Daily:    1.23ms   (2 entries)
- Weekly:   1.45ms   (2 entries)
- Monthly:  1.67ms   (2 entries)
- Yearly:   1.89ms   (2 entries)

User Details Queries:
- User A:   0.34ms   (cached)
- User B:   0.41ms   (cached)

ZSET Sorting Verification:
✓ User B (10 points) ranked #1
✓ User A (5 points) ranked #2
✓ Automatic sorting working correctly

Cache Initialization:
- PostgreSQL sync: 2/2 users (100%)
- Redis memory:    1.55MB
- Total time:      45.67ms
```

### Performance Characteristics

- **Initialization time**: O(N) where N = user count
- **Cache queries**: 1-16ms for leaderboards
- **User lookups**: 0.3-0.5ms for details
- **Memory usage**: ~1KB per user (all data)
- **Sync accuracy**: 100% consistency validation

## Redis Data Validation

### ZSET Verification

```python
# Automatic sorting test
def test_zset_sorting():
    # Add test users with different scores
    redis_client.zadd("leaderboard:daily", {"user_a": 5, "user_b": 10})

    # Verify descending order (highest first)
    top_users = redis_client.zrevrange("leaderboard:daily", 0, -1, withscores=True)
    assert top_users[0][0] == "user_b"  # Higher score ranked first
    assert top_users[1][0] == "user_a"  # Lower score ranked second
```

### Cache Consistency Check

```python
# Compare PostgreSQL vs Redis
def validate_data_consistency():
    postgres_users = session.query(PomoLeaderboard).all()

    for user in postgres_users:
        # Check ZSET scores
        daily_score = redis_client.zscore("leaderboard:daily", user.user_id)
        assert daily_score == user.daily_pomo

        # Check cached details
        cached_data = redis_client.get(f"user:details:{user.user_id}")
        cached_user = json.loads(cached_data)
        assert cached_user["daily_pomo"] == user.daily_pomo
```

## Deployment Integration

### Pre-Deployment Setup

```bash
# Development environment
export POSTGRES_HOST=localhost
export REDIS_HOST=localhost
python scripts/init_redis_cache.py --test-performance

# Production deployment
export POSTGRES_HOST=prod-db.example.com
export REDIS_HOST=prod-redis.example.com
python scripts/init_redis_cache.py --force-refresh
```

### CI/CD Integration

```yaml
# .github/workflows/deploy.yml
- name: Initialize Redis Cache
  run: |
    python scripts/init_redis_cache.py --status-only
    if [ $? -eq 0 ]; then
      echo "Cache already initialized"
    else
      python scripts/init_redis_cache.py --force-refresh
    fi
```

### Docker Integration

```dockerfile
# Dockerfile addition
COPY scripts/init_redis_cache.py /app/scripts/
RUN python scripts/init_redis_cache.py --status-only || \
    python scripts/init_redis_cache.py
```

## Monitoring & Alerting

### Health Check Integration

```python
# For monitoring systems
def health_check():
    try:
        status = get_cache_status()
        if status["redis_connected"] and status["sync_percentage"] > 95:
            return {"status": "healthy", "details": status}
        else:
            return {"status": "degraded", "details": status}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}
```

### Automated Sync Monitoring

```bash
#!/bin/bash
# cron job for cache health monitoring
# 0 */6 * * * /path/to/cache_monitor.sh

SYNC_PERCENTAGE=$(python scripts/init_redis_cache.py --status-only | grep "sync_percentage" | cut -d: -f2)

if [ "$SYNC_PERCENTAGE" -lt 95 ]; then
    echo "Cache sync below 95%, initiating refresh"
    python scripts/init_redis_cache.py --force-refresh

    # Send alert
    curl -X POST https://alerts.example.com/webhook \
         -d "Cache sync degraded: ${SYNC_PERCENTAGE}%"
fi
```

## Error Handling & Recovery

### Common Issues & Solutions

```python
# Redis connection failure
try:
    redis_client = redis_utils.get_redis_client()
    redis_client.ping()
except redis.ConnectionError:
    print("ERROR: Cannot connect to Redis")
    print("Solutions:")
    print("1. Check Redis server status")
    print("2. Verify Redis host/port configuration")
    print("3. Check network connectivity")
    sys.exit(1)

# PostgreSQL connection failure
try:
    session = get_db_session()
    session.execute("SELECT 1")
except SQLAlchemyError:
    print("ERROR: Cannot connect to PostgreSQL")
    print("Solutions:")
    print("1. Check database server status")
    print("2. Verify connection parameters")
    print("3. Check database credentials")
    sys.exit(1)

# Partial sync failure
def handle_partial_sync(failed_users):
    print(f"WARNING: {len(failed_users)} users failed to sync")
    for user_id in failed_users:
        try:
            # Retry individual user sync
            sync_single_user(user_id)
        except Exception as e:
            print(f"FAILED: User {user_id} - {e}")
```

### Recovery Procedures

```python
# Cache corruption recovery
def recover_corrupted_cache():
    print("Detecting cache corruption...")

    # Clear potentially corrupted data
    redis_client.flushdb()

    # Full resync from PostgreSQL
    init_redis_cache(force_refresh=True)

    # Validate recovery
    status = validate_cache_consistency()
    if status["errors"]:
        raise Exception("Recovery failed, manual intervention required")

# Memory usage recovery
def handle_memory_pressure():
    memory_info = redis_client.info("memory")
    used_memory = memory_info["used_memory"]
    max_memory = memory_info.get("maxmemory", 0)

    if max_memory > 0 and used_memory > max_memory * 0.9:
        print("WARNING: Redis memory usage high")

        # Option 1: Clear old cache entries
        clear_old_cache_entries()

        # Option 2: Implement cache eviction
        setup_cache_eviction_policy()
```

## Agent Instructions

### For Initial Setup

1. **Run before first deployment** to populate Redis cache
2. **Verify PostgreSQL data** exists before initialization
3. **Test Redis connectivity** before running sync
4. **Monitor initialization progress** for large user counts

### For Maintenance Operations

```bash
# Weekly cache health check
python scripts/init_redis_cache.py --status-only

# Monthly full refresh
python scripts/init_redis_cache.py --force-refresh

# Performance baseline testing
python scripts/init_redis_cache.py --test-performance --verbose
```

### For Troubleshooting

1. **Check Redis connection** first
2. **Validate PostgreSQL data** exists
3. **Run consistency check** to identify issues
4. **Use force-refresh** for major discrepancies

### For Performance Monitoring

```python
# Regular performance testing
results = test_leaderboard_performance()
for period, time_ms in results.items():
    if time_ms > 50:  # 50ms threshold
        alert(f"Slow leaderboard query: {period} took {time_ms}ms")

# Memory usage monitoring
status = get_cache_status()
if status["memory_usage_mb"] > 100:  # 100MB threshold
    alert(f"High Redis memory usage: {status['memory_usage_mb']}MB")
```

### Integration with Application Startup

```python
# FastAPI startup event
@app.on_event("startup")
async def startup_event():
    # Check if cache is initialized
    try:
        status = get_cache_status()
        if status["total_users"] == 0:
            print("Initializing Redis cache...")
            init_redis_cache()
    except Exception as e:
        print(f"Cache initialization failed: {e}")
        # Continue startup, use PostgreSQL fallback
```

### Automated Testing Integration

```python
# pytest fixture
@pytest.fixture(scope="session")
def redis_cache():
    # Setup test cache
    init_redis_cache(force_refresh=True)

    yield

    # Cleanup test cache
    redis_client.flushdb()

def test_cache_performance():
    results = test_leaderboard_performance()
    for period, time_ms in results.items():
        assert time_ms < 20, f"{period} query too slow: {time_ms}ms"
```

### Production Deployment Checklist

1. ✅ **Environment variables** configured
2. ✅ **Redis server** accessible and configured
3. ✅ **PostgreSQL data** migrated and verified
4. ✅ **Cache initialization** completed successfully
5. ✅ **Performance tests** passing
6. ✅ **Consistency validation** 100%
7. ✅ **Monitoring** configured for ongoing health checks
8. ✅ **Backup procedures** documented and tested
