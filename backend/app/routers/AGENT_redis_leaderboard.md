# /backend/app/routers/redis_leaderboard.py - Redis-Cached Leaderboard API

## Purpose

High-performance Redis-cached leaderboard API that acts as middleware between frontend and PostgreSQL database. **Frontend applications should ONLY use these endpoints** for leaderboard operations to ensure optimal performance.

## System Architecture

```
Frontend → Redis Leaderboard API → Redis Cache ↔ PostgreSQL
                                      (ZSET)     (Source of Truth)
```

## Key Endpoints

### Primary Frontend Endpoints (Production Use)

- **POST `/api/redis-leaderboard/update`** - Update user pomodoro count

  - Dual-writes to PostgreSQL + Redis cache
  - Auto-sorts leaderboard via Redis ZSET
  - Sub-millisecond response time

- **GET `/api/redis-leaderboard/{period}?limit=10`** - Get sorted leaderboard

  - Redis-only queries (no PostgreSQL access)
  - Periods: `daily`, `weekly`, `monthly`, `yearly`
  - Automatic sorting by score (highest first)
  - 1-16ms response time

- **GET `/api/redis-leaderboard/user/{user_id}`** - Get user statistics

  - Redis-cached user details
  - Auto-syncs from PostgreSQL if cache miss
  - 0.3-0.5ms response time

- **GET `/api/redis-leaderboard/user/{user_id}/rank/{period}`** - Get user rank
  - Real-time ranking from Redis ZSET
  - Includes total user count
  - Instant rank calculation

### Administrative Endpoints

- **POST `/api/redis-leaderboard/admin/sync`** - Sync cache from PostgreSQL
- **POST `/api/redis-leaderboard/admin/reset/{period}`** - Reset time period
- **GET `/api/redis-leaderboard/admin/status`** - Cache health status
- **DELETE `/api/redis-leaderboard/admin/cache`** - Clear all cache

## Data Models

### PomoUpdateRequest

```json
{
  "user_id": "string",
  "count": 1 // pomodoros to add (default 1)
}
```

### UserStatsResponse

```json
{
  "user_id": "string",
  "daily_pomo": 0,
  "weekly_pomo": 0,
  "monthly_pomo": 0,
  "yearly_pomo": 0,
  "updated_at": "2025-09-13T12:00:00Z",
  "cached_at": "2025-09-13T12:00:05Z"
}
```

### LeaderboardResponse

```json
{
  "success": true,
  "period": "daily",
  "total_entries": 10,
  "cached": true,
  "entries": [
    {
      "user_id": "string",
      "score": 25,
      "rank": 1,
      "daily_pomo": 25,
      "weekly_pomo": 100,
      "monthly_pomo": 450,
      "yearly_pomo": 2500
    }
  ]
}
```

### UserRankResponse

```json
{
  "user_id": "string",
  "period": "daily",
  "rank": 5,
  "score": 15,
  "total_users": 50
}
```

## Redis Data Structure

### Leaderboard ZSETs (Auto-sorted)

```
leaderboard:daily    → {user_id: daily_score}
leaderboard:weekly   → {user_id: weekly_score}
leaderboard:monthly  → {user_id: monthly_score}
leaderboard:yearly   → {user_id: yearly_score}
```

### User Details Cache

```
user:details:{user_id} → JSON user stats + timestamps
```

## Architecture Notes

### Performance Characteristics

- **Leaderboard queries**: 1-16ms (Redis ZSET range operations)
- **User details**: 0.3-0.5ms (Redis key lookup)
- **User updates**: Dual-write (PostgreSQL + Redis)
- **Automatic sorting**: Redis ZSET maintains order
- **Memory usage**: Linear scaling (~1.55MB for 2 users)

### Data Consistency

- **PostgreSQL**: Source of truth for all data
- **Redis**: High-performance read cache
- **Synchronization**: Auto-sync on cache miss or manual trigger
- **Fault tolerance**: PostgreSQL fallback if Redis unavailable

### Error Handling

- **Redis unavailable**: HTTP 503 with clear error message
- **Cache miss**: Auto-sync from PostgreSQL, transparent to frontend
- **Sync failures**: PostgreSQL preserved, manual recovery available
- **Invalid requests**: Proper HTTP status codes and validation

## Agent Instructions

### For Frontend Integration

1. **Replace all PostgreSQL leaderboard calls** with Redis endpoints
2. Use `/api/redis-leaderboard/` prefix for all leaderboard operations
3. Handle HTTP 503 errors gracefully (Redis unavailable)
4. Implement fallback to PostgreSQL endpoints if needed

### For Pomodoro Updates

1. **Always use**: `POST /api/redis-leaderboard/update`
2. **Never write directly** to PostgreSQL for pomodoro counts
3. Updates are atomic (PostgreSQL + Redis together)
4. All time periods updated simultaneously

### For Leaderboard Display

1. **Always use**: `GET /api/redis-leaderboard/{period}`
2. **Never query PostgreSQL directly** for leaderboard data
3. Use `limit` parameter to control response size
4. Cache responses in frontend for additional performance

### For User Statistics

1. **Prefer**: `GET /api/redis-leaderboard/user/{user_id}`
2. Includes cache timestamp for debugging
3. Auto-syncs if user not in cache
4. Use for profile pages and user dashboards

### Deployment Considerations

1. **Initialize cache**: Run `init_redis_cache.py` before deployment
2. **Monitor Redis**: Use admin status endpoint for health checks
3. **Schedule resets**: Automate daily/weekly/monthly period resets
4. **Cache warming**: Sync after PostgreSQL migrations

### Development Workflow

```bash
# Check cache status
curl /api/redis-leaderboard/admin/status

# Initialize cache
python scripts/init_redis_cache.py

# Test performance
python scripts/init_redis_cache.py --test-performance

# Manual sync if needed
curl -X POST /api/redis-leaderboard/admin/sync
```

### Common Usage Patterns

```javascript
// Update user pomodoros
fetch("/api/redis-leaderboard/update", {
  method: "POST",
  body: JSON.stringify({ user_id: "user123", count: 1 }),
});

// Get daily leaderboard
fetch("/api/redis-leaderboard/daily?limit=20");

// Get user stats for profile
fetch("/api/redis-leaderboard/user/user123");

// Get user's rank
fetch("/api/redis-leaderboard/user/user123/rank/weekly");
```

### Monitoring & Maintenance

1. **Health checks**: Monitor admin status endpoint
2. **Performance**: Track response times and cache hit rates
3. **Memory usage**: Monitor Redis memory consumption
4. **Sync status**: Check cache vs database consistency
5. **Error rates**: Monitor 503 errors (Redis unavailable)

### Migration Notes

- **Phase 1**: Deploy alongside existing PostgreSQL APIs
- **Phase 2**: Update frontend to use Redis endpoints
- **Phase 3**: Remove direct PostgreSQL leaderboard access
- **Rollback**: Keep PostgreSQL endpoints for emergency fallback

### Security Considerations

1. **Redis dependency**: All endpoints check Redis connectivity first
2. **Input validation**: All requests validated before processing
3. **Rate limiting**: Consider implementing for update endpoints
4. **Authentication**: Integrate with existing auth middleware
5. **Network isolation**: Redis should not be publicly accessible
