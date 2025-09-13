# /backend/app/services/redis_leaderboard_service.py - Redis Leaderboard Business Logic

## Purpose

Core service layer that manages Redis ZSET-based leaderboards with automatic sorting and PostgreSQL synchronization. Handles all business logic for high-performance pomodoro leaderboard operations.

## Architecture Role

```
FastAPI Router → RedisLeaderboardService → Redis Utils + PostgreSQL Models
                                            (ZSETs)   (Source of Truth)
```

## Core Functionality

### 1. **Automatic Score Management**

- Uses Redis ZSETs for automatic sorting by score
- Updates all time periods simultaneously (daily, weekly, monthly, yearly)
- Maintains leaderboard order without manual sorting
- Real-time rank calculation

### 2. **Dual-Write Pattern**

- All updates written to both PostgreSQL and Redis
- PostgreSQL remains source of truth
- Redis provides high-performance reads
- Automatic fallback and recovery

### 3. **Cache Synchronization**

- Auto-sync user data on cache miss
- Manual sync capabilities for bulk operations
- Cache warming and initialization
- Consistency validation

## Key Methods

### Primary Operations

#### `sync_user_to_cache(user_id: str) → bool`

```python
# Synchronizes user from PostgreSQL to Redis cache
# - Fetches latest PostgreSQL data
# - Updates all ZSET leaderboards
# - Caches user details
# - Returns success status
```

#### `update_user_score(user_id: str, count: int = 1) → dict`

```python
# Dual-write update operation
# - Updates PostgreSQL PomoLeaderboard table
# - Updates all Redis ZSETs simultaneously
# - Increments scores across all time periods
# - Returns updated user statistics
```

#### `get_leaderboard(period: str, limit: int = 10) → dict`

```python
# High-performance leaderboard retrieval
# - Redis ZSET ZREVRANGE for automatic sorting
# - Sub-millisecond query performance
# - Enriched with full user statistics
# - Supports daily/weekly/monthly/yearly periods
```

#### `get_user_rank(user_id: str, period: str) → dict`

```python
# Real-time user ranking
# - Redis ZREVRANK for instant rank calculation
# - Includes score and total user count
# - O(log N) complexity
# - All time periods supported
```

### Administrative Operations

#### `sync_all_users() → dict`

```python
# Bulk synchronization from PostgreSQL
# - Fetches all PomoLeaderboard records
# - Rebuilds all Redis ZSETs
# - Updates user detail cache
# - Returns sync statistics
```

#### `clear_cache() → bool`

```python
# Complete cache reset
# - Removes all leaderboard ZSETs
# - Clears user detail cache
# - Prepares for fresh initialization
```

#### `get_cache_status() → dict`

```python
# Health and status monitoring
# - Leaderboard entry counts per period
# - Cache vs PostgreSQL comparison
# - Redis connectivity status
# - Memory usage statistics
```

## Redis Data Structures

### Leaderboard ZSETs (Sorted Sets)

```python
# Redis keys with auto-sorting by score
"leaderboard:daily"    # {user_id: daily_score, ...}
"leaderboard:weekly"   # {user_id: weekly_score, ...}
"leaderboard:monthly"  # {user_id: monthly_score, ...}
"leaderboard:yearly"   # {user_id: yearly_score, ...}

# ZSET operations used:
# - ZADD: Add/update user scores
# - ZREVRANGE: Get top N users (auto-sorted)
# - ZREVRANK: Get user rank (0-based)
# - ZCARD: Get total user count
# - ZSCORE: Get user's current score
```

### User Details Cache

```python
# Individual user data cache
"user:details:{user_id}" → JSON: {
    "user_id": str,
    "daily_pomo": int,
    "weekly_pomo": int,
    "monthly_pomo": int,
    "yearly_pomo": int,
    "updated_at": ISO datetime,
    "cached_at": ISO datetime
}
```

## Performance Characteristics

### Query Performance

- **Leaderboard retrieval**: 1-16ms (ZREVRANGE operation)
- **User rank lookup**: 0.1-0.5ms (ZREVRANK operation)
- **User details**: 0.3-0.5ms (key lookup)
- **Score updates**: Dual-write overhead (~5-10ms total)

### Memory Usage

- **Per user overhead**: ~1KB (all leaderboards + details)
- **Scaling**: Linear with user count
- **Example**: 2 users = 1.55MB total Redis memory

### Complexity

- **Leaderboard queries**: O(log N + M) where M = limit
- **Rank calculation**: O(log N)
- **Score updates**: O(log N) per ZSET (4 total)
- **Cache sync**: O(1) per user

## Error Handling & Resilience

### Redis Connectivity

```python
# All operations check Redis availability first
if not redis_utils.check_redis_connection():
    raise HTTPException(503, "Redis cache unavailable")
```

### Data Consistency

```python
# Dual-write with rollback on Redis failure
try:
    # Update PostgreSQL first (source of truth)
    db_result = update_postgresql(user_id, count)

    # Then update Redis cache
    redis_result = update_redis_cache(user_id, db_result)

except RedisError:
    # PostgreSQL update preserved, manual sync available
    logger.warning("Redis update failed, cache out of sync")
```

### Cache Miss Recovery

```python
# Automatic synchronization on missing data
user_data = get_from_cache(user_id)
if not user_data:
    # Auto-sync from PostgreSQL
    sync_user_to_cache(user_id)
    user_data = get_from_cache(user_id)
```

## Integration Points

### Dependencies

- **Redis Utils**: `app.utils.redis_utils` for connection management
- **PostgreSQL Models**: `app.models.database.PomoLeaderboard`
- **Session Management**: FastAPI dependency injection
- **Logging**: Structured logging for monitoring

### Router Integration

```python
# FastAPI dependency pattern
@router.post("/update")
async def update_user_pomo(
    request: PomoUpdateRequest,
    service: RedisLeaderboardService = Depends(get_redis_leaderboard_service)
):
    return service.update_user_score(request.user_id, request.count)
```

### Service Instantiation

```python
# Dependency factory
def get_redis_leaderboard_service():
    return RedisLeaderboardService(
        redis_client=redis_utils.get_redis_client(),
        postgres_session=get_db_session()
    )
```

## Agent Instructions

### For Score Updates

1. **Always use** `update_user_score()` for pomodoro incrementing
2. **Never bypass** dual-write pattern
3. **Handle errors** gracefully with PostgreSQL fallback
4. **All time periods** updated simultaneously

### For Leaderboard Queries

1. **Use** `get_leaderboard()` for frontend display
2. **Cache results** at application level if needed
3. **Handle large limits** with pagination consideration
4. **Period validation** is automatic

### For User Statistics

1. **Prefer** `get_user_rank()` for individual user ranking
2. **Cache miss** triggers automatic sync
3. **Real-time data** from Redis ZSETs
4. **Cross-reference** with user details cache

### For Administration

1. **Use** `sync_all_users()` after PostgreSQL migrations
2. **Monitor** cache status regularly
3. **Clear cache** before major data changes
4. **Bulk operations** should be batched

### Performance Optimization

```python
# Batch user synchronization
for user_batch in chunk_users(all_users, batch_size=100):
    for user_id in user_batch:
        service.sync_user_to_cache(user_id)

    # Rate limiting between batches
    await asyncio.sleep(0.1)
```

### Monitoring & Debugging

```python
# Cache status checking
status = service.get_cache_status()
print(f"Daily leaderboard: {status['daily_count']} users")
print(f"Cache sync status: {status['sync_percentage']}%")

# Performance timing
import time
start = time.time()
leaderboard = service.get_leaderboard("daily", 20)
print(f"Query time: {(time.time() - start)*1000:.2f}ms")
```

### Testing & Validation

```python
# Verify automatic sorting
service.update_user_score("user_a", 5)
service.update_user_score("user_b", 10)
leaderboard = service.get_leaderboard("daily", 10)
assert leaderboard["entries"][0]["user_id"] == "user_b"  # Higher score first

# Verify dual-write consistency
pg_data = get_postgres_user_stats("user_a")
redis_data = service.get_user_details("user_a")
assert pg_data["daily_pomo"] == redis_data["daily_pomo"]
```

### Common Patterns

```python
# Safe update with error handling
try:
    result = service.update_user_score(user_id, pomo_count)
    return {"success": True, "data": result}
except HTTPException as e:
    if e.status_code == 503:
        # Redis unavailable, PostgreSQL still updated
        return {"success": True, "warning": "Cache update failed"}
    raise

# Efficient leaderboard with user details
leaderboard = service.get_leaderboard(period, limit)
for entry in leaderboard["entries"]:
    # User details already enriched in response
    display_user_card(entry)
```

### Migration & Deployment

1. **Pre-deployment**: Initialize cache with existing PostgreSQL data
2. **Post-deployment**: Monitor sync status and performance
3. **Rollback plan**: Disable Redis endpoints, use PostgreSQL fallback
4. **Data integrity**: Validate cache consistency after major changes

### Security & Access Control

1. **Input validation**: All user_id and count parameters validated
2. **Rate limiting**: Consider implementing for update operations
3. **Administrative functions**: Restrict to authenticated admin users
4. **Redis access**: Internal network only, no direct frontend access

### Troubleshooting Guide

```python
# Cache sync issues
if service.get_cache_status()["sync_percentage"] < 100:
    service.sync_all_users()

# Performance degradation
status = service.get_cache_status()
if status["memory_usage"] > threshold:
    # Consider cache cleanup or scaling

# Redis connection issues
if not redis_utils.check_redis_connection():
    # Check Redis server status
    # Verify network connectivity
    # Review Redis configuration
```
