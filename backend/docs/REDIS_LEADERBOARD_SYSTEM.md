# Redis Leaderboard System - Implementation Guide

## Overview

The Redis Leaderboard System provides a high-performance caching layer between the PostgreSQL database and frontend applications. It uses Redis ZSETs (sorted sets) for automatic sorting and millisecond-level query performance.

## Architecture

```
Frontend → Redis Leaderboard API → Redis Cache ↔ PostgreSQL Database
                                         ↑
                                   (Auto-synced)
```

### Key Components

1. **Redis Leaderboard Service** (`app/services/redis_leaderboard_service.py`)

   - Core business logic for cache operations
   - Handles PostgreSQL ↔ Redis synchronization
   - Manages ZSET operations for automatic sorting

2. **Redis Leaderboard Router** (`app/routers/redis_leaderboard.py`)

   - FastAPI endpoints for frontend consumption
   - Dependency injection for Redis connectivity checks
   - RESTful API with comprehensive error handling

3. **Cache Initialization Scripts** (`scripts/init_redis_cache.py`)
   - Database-to-cache migration tools
   - Performance testing utilities
   - Cache status monitoring

## Redis Data Structure

### ZSETs for Leaderboards

```
Key: leaderboard:daily     → ZSET {user_id: daily_pomo_score}
Key: leaderboard:weekly    → ZSET {user_id: weekly_pomo_score}
Key: leaderboard:monthly   → ZSET {user_id: monthly_pomo_score}
Key: leaderboard:yearly    → ZSET {user_id: yearly_pomo_score}
```

### User Details Cache

```
Key: user:details:{user_id} → JSON {
  "user_id": "string",
  "daily_pomo": int,
  "weekly_pomo": int,
  "monthly_pomo": int,
  "yearly_pomo": int,
  "updated_at": "ISO timestamp",
  "cached_at": "ISO timestamp"
}
```

## API Endpoints

### Frontend Endpoints (Production Use)

```
POST /api/redis-leaderboard/update
  - Updates user pomodoro count
  - Syncs to both PostgreSQL and Redis cache
  - Request: {"user_id": "string", "count": int}

GET /api/redis-leaderboard/{period}?limit=10
  - Gets leaderboard for period (daily/weekly/monthly/yearly)
  - Sorted by score descending
  - Redis-only queries (no PostgreSQL access)

GET /api/redis-leaderboard/user/{user_id}
  - Gets user's pomodoro statistics
  - Redis-cached response
  - Auto-syncs from PostgreSQL if not cached

GET /api/redis-leaderboard/user/{user_id}/rank/{period}
  - Gets user's rank in specific leaderboard
  - Real-time ranking from Redis ZSET
```

### Administrative Endpoints

```
POST /api/redis-leaderboard/admin/sync
  - Manually sync all data from PostgreSQL to Redis
  - Use for cache refresh or troubleshooting

POST /api/redis-leaderboard/admin/reset/{period}
  - Reset specific time period (daily/weekly/monthly)
  - Updates both PostgreSQL and Redis

GET /api/redis-leaderboard/admin/status
  - Cache health and connectivity status
  - Memory usage and user count statistics

DELETE /api/redis-leaderboard/admin/cache
  - Clear all Redis cache data
  - Forces reload from PostgreSQL on next access
```

## Performance Characteristics

Based on testing with sample data:

- **Leaderboard queries**: 1-16ms (Redis ZSET operations)
- **User details queries**: 0.3-0.5ms (Redis key-value lookup)
- **User updates**: Dual-write to PostgreSQL + Redis
- **Memory usage**: ~1.55MB for 2 users (scales linearly)

## Data Flow

### Read Operations (Frontend → Redis Only)

1. Frontend requests leaderboard data
2. Redis router checks Redis connectivity
3. Query Redis ZSET for sorted results
4. Return cached data immediately
5. Auto-sync from PostgreSQL if cache miss

### Write Operations (Frontend → Redis + PostgreSQL)

1. Frontend sends pomodoro update
2. Update PostgreSQL first (source of truth)
3. Update Redis cache immediately
4. Return updated user statistics
5. Both systems stay synchronized

### Cache Synchronization

1. **Automatic**: On cache miss or user update
2. **Manual**: Via admin sync endpoint
3. **Scheduled**: Can be automated with cron jobs
4. **Initialization**: Full sync on deployment

## Deployment & Setup

### 1. Initialize Redis Cache

```bash
# Check current cache status
python scripts/init_redis_cache.py --status

# Initialize cache from PostgreSQL
python scripts/init_redis_cache.py

# Force refresh (clear and rebuild)
python scripts/init_redis_cache.py --force-refresh

# Test performance
python scripts/init_redis_cache.py --test-performance
```

### 2. Redis Configuration

Ensure Redis is running and accessible:

```bash
# Environment variables
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # Optional
REDIS_DB=0       # Database number
```

### 3. Frontend Integration

Replace PostgreSQL leaderboard calls with Redis endpoints:

```javascript
// OLD: Direct PostgreSQL API
GET / api / leaderboard / daily;

// NEW: Redis-cached API
GET / api / redis - leaderboard / daily;

// Updates (same pattern)
POST / api / redis - leaderboard / update;
```

## Migration Strategy

### Phase 1: Parallel Operation

- Deploy Redis system alongside existing PostgreSQL APIs
- Initialize Redis cache from existing data
- Test Redis endpoints with real data

### Phase 2: Frontend Migration

- Update frontend to use Redis endpoints
- Keep PostgreSQL endpoints as fallback
- Monitor performance and cache hit rates

### Phase 3: PostgreSQL Cleanup

- Remove direct PostgreSQL leaderboard endpoints
- Keep PostgreSQL as source of truth for updates
- Redis becomes the exclusive read path

## Monitoring & Maintenance

### Health Checks

```bash
# Redis connectivity
curl /api/redis-leaderboard/admin/status

# Cache synchronization status
python scripts/init_redis_cache.py --status
```

### Cache Maintenance

```bash
# Refresh cache data
curl -X POST /api/redis-leaderboard/admin/sync

# Reset time periods (scheduled)
curl -X POST /api/redis-leaderboard/admin/reset/daily
curl -X POST /api/redis-leaderboard/admin/reset/weekly
curl -X POST /api/redis-leaderboard/admin/reset/monthly
```

### Performance Monitoring

- Monitor Redis memory usage
- Track query response times
- Monitor cache hit/miss rates
- Watch for synchronization drift

## Error Handling

### Redis Unavailable

- Dependency injection prevents broken requests
- HTTP 503 Service Unavailable returned
- Frontend should fallback to PostgreSQL APIs

### Cache Miss

- Auto-sync from PostgreSQL triggered
- Transparent to frontend
- Populates cache for future requests

### Sync Failures

- PostgreSQL remains source of truth
- Redis updates are best-effort
- Manual sync available for recovery

## Benefits

1. **Performance**: Sub-millisecond leaderboard queries
2. **Scalability**: Redis handles high read loads
3. **Automatic Sorting**: ZSET maintains leaderboard order
4. **Real-time Rankings**: Instant rank updates
5. **Reduced Database Load**: PostgreSQL freed for writes
6. **Fault Tolerance**: PostgreSQL fallback available

## Security Considerations

1. **Input Validation**: All API inputs validated
2. **Rate Limiting**: Consider implementing for update endpoints
3. **Authentication**: Integrate with existing auth system
4. **Redis Security**: Configure Redis AUTH if needed
5. **Network Security**: Redis should not be publicly accessible

## Future Enhancements

1. **Geographical Leaderboards**: Region-specific rankings
2. **Time-based Rollups**: Automatic period resets
3. **Cache Warming**: Predictive cache population
4. **Metrics Collection**: Detailed performance analytics
5. **Multi-tenancy**: Organization-specific leaderboards
