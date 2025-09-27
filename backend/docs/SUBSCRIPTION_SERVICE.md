# Subscription Service API

High-performance subscription status checking service with Redis caching and ArangoDB fallback.

## Overview

The Subscription Service provides fast, cached access to user subscription status (paid/free) with automatic fallback to the database when cache misses occur.

## Architecture

```
Frontend Request → FastAPI Endpoint → Subscription Service
                                           ↓
                                    1. Check Redis Cache
                                           ↓ (if miss)
                                    2. Query ArangoDB
                                           ↓
                                    3. Update Redis Cache
                                           ↓
                                    4. Return Result
```

## API Endpoints

### Core Endpoints

#### `GET /api/subscription/status/{user_id}`
Get subscription status for a specific user.

**Response:**
```json
{
  "success": true,
  "user_id": "user123",
  "is_paid": false,
  "provider": "google",
  "last_updated": "2025-01-27T10:30:00Z",
  "source": "cache",
  "cached_at": "2025-01-27T10:35:00Z"
}
```

#### `GET /api/subscription/status`
Get subscription status for the authenticated user (requires authentication cookie).

**Response:** Same as above

### Cache Management

#### `DELETE /api/subscription/cache/{user_id}`
Invalidate cached subscription status for a specific user.

**Response:**
```json
{
  "success": true,
  "user_id": "user123",
  "message": "Cache invalidated successfully for user user123"
}
```

#### `DELETE /api/subscription/cache`
Invalidate cached subscription status for the authenticated user.

### Administrative

#### `GET /api/subscription/admin/cache/stats`
Get cache system statistics.

**Response:**
```json
{
  "cache_prefix": "subscription:",
  "cache_ttl_seconds": 3600,
  "arangodb_available": true,
  "redis_available": true
}
```

#### `GET /api/subscription/admin/health`
Health check for the subscription service.

**Response:**
```json
{
  "service": "subscription",
  "status": "healthy",
  "available": true,
  "redis_available": true,
  "arangodb_available": true,
  "cache_ttl_seconds": 3600
}
```

## Caching Strategy

### Cache Keys
- **Pattern:** `subscription:{user_id}`
- **TTL:** 1 hour (3600 seconds)
- **Negative Results:** 5 minutes (300 seconds)

### Cache Flow
1. **Cache Hit:** Return cached data immediately (< 1ms response time)
2. **Cache Miss:** 
   - Query ArangoDB for user data
   - Cache the result in Redis
   - Return the data
3. **User Not Found:** Cache negative result for shorter time

### Cache Invalidation
- **Manual:** Via API endpoints
- **Automatic:** TTL expiration
- **Triggered:** When subscription status changes

## Performance Characteristics

| Operation | Cache Hit | Cache Miss | Database Only |
|-----------|-----------|------------|---------------|
| Response Time | < 1ms | 10-50ms | 50-200ms |
| Database Load | None | Single query | Every request |
| Scalability | Excellent | Good | Limited |

## Error Handling

### Service Unavailable (503)
- Redis is down
- ArangoDB is down
- Both services unavailable

### User Not Found
- Returns `success: false`
- Sets `is_paid: false` (safe default)
- Caches negative result briefly

### Internal Errors (500)
- Database connection errors
- Cache operation failures
- Unexpected exceptions

## Usage Examples

### Frontend JavaScript
```javascript
// Check authenticated user's subscription
const response = await fetch('/api/subscription/status', {
  credentials: 'include' // Include cookies
});
const data = await response.json();

if (data.is_paid) {
  // Show premium features
} else {
  // Show free tier features
}
```

### Backend Python
```python
from app.services.subscription_service import get_subscription_service

subscription_service = get_subscription_service()
result = subscription_service.get_user_subscription_status("user123")

if result['is_paid']:
    # Grant premium access
else:
    # Limit to free features
```

## Configuration

### Environment Variables
- **Redis:** Standard Redis connection settings
- **ArangoDB:** Standard ArangoDB connection settings

### Service Settings
- **Cache TTL:** 1 hour (configurable in service)
- **Negative Cache TTL:** 5 minutes
- **Cache Prefix:** `subscription:`

## Monitoring

### Health Checks
- Use `/api/subscription/admin/health` for service health
- Monitor cache hit rates via logs
- Track response times

### Metrics to Monitor
- Cache hit/miss ratio
- Average response time
- Error rates
- Database query frequency

## Best Practices

### For Developers
1. **Always check subscription status** before granting premium features
2. **Use authenticated endpoint** when possible for security
3. **Handle errors gracefully** with safe defaults
4. **Invalidate cache** when subscription status changes

### For Operations
1. **Monitor cache performance** regularly
2. **Set up alerts** for service degradation
3. **Scale Redis** based on user growth
4. **Backup ArangoDB** regularly

## Testing

Run the test suite:
```bash
cd backend
source .venv/bin/activate
python scripts/test_subscription_service.py
```

The test covers:
- Service availability
- Cache hit/miss behavior
- Cache invalidation
- Non-existent user handling
- Error scenarios

## Security Considerations

- **Authentication Required:** For user-specific endpoints
- **Rate Limiting:** Consider implementing for public endpoints
- **Input Validation:** User IDs are validated
- **Error Messages:** Don't leak sensitive information

## Future Enhancements

- **Subscription Tiers:** Support multiple subscription levels
- **Expiration Dates:** Track subscription expiry
- **Usage Limits:** Track feature usage for free users
- **Analytics:** Detailed subscription metrics
- **Webhooks:** Real-time subscription change notifications
