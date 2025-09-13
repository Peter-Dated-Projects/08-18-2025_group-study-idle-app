# Periodic Sync System Documentation

## Overview

The Periodic Sync System provides automated synchronization from Redis cache to PostgreSQL database every hour. This ensures that PostgreSQL remains the authoritative source of truth while Redis provides high-performance caching for leaderboard operations.

## System Architecture

```
Redis Cache (Fast Reads) ──┐
                           │
                           ▼
Frontend ──► Redis API ──► Periodic Sync ──► PostgreSQL (Source of Truth)
                           (Every Hour)
```

## Key Features

### ✅ **Automated Hourly Sync**

- Runs every hour to sync Redis data to PostgreSQL
- Handles new users, deleted users, and score updates
- Maintains data consistency between systems

### ✅ **Comprehensive Change Detection**

- **New Users**: Users in Redis but not in PostgreSQL are created
- **Deleted Users**: Users in PostgreSQL but not in Redis are removed
- **Updates**: Score changes and timestamp differences trigger updates

### ✅ **Error Handling & Recovery**

- Individual user sync failures don't stop the entire process
- Detailed error logging and statistics
- Rollback protection for database integrity

### ✅ **Management API**

- REST endpoints for controlling the sync service
- Manual sync triggers for immediate synchronization
- Health monitoring and status checking

## Components

### 1. **PeriodicSyncService** (`app/services/periodic_sync_service.py`)

Core service that handles the synchronization logic.

#### Key Methods:

- `start_periodic_sync()` - Start the hourly sync loop
- `perform_sync()` - Execute one sync cycle
- `get_sync_status()` - Get current service status

#### Sync Process:

1. Fetch all users from Redis leaderboards
2. Fetch all users from PostgreSQL PomoLeaderboard table
3. Compare and identify changes:
   - New users (in Redis, not in PostgreSQL)
   - Deleted users (in PostgreSQL, not in Redis)
   - Updated users (different scores or timestamps)
4. Apply changes to PostgreSQL
5. Return detailed statistics

### 2. **Management Script** (`scripts/manage_periodic_sync.py`)

Command-line tool for managing the sync service.

#### Usage:

```bash
# Start the periodic sync service
python scripts/manage_periodic_sync.py start

# Check service status
python scripts/manage_periodic_sync.py status

# Perform one-time manual sync
python scripts/manage_periodic_sync.py sync

# Run comprehensive test suite
python scripts/manage_periodic_sync.py test

# Stop the service
python scripts/manage_periodic_sync.py stop
```

### 3. **API Router** (`app/routers/periodic_sync.py`)

REST API endpoints for remote management.

#### Endpoints:

- `GET /api/periodic-sync/status` - Service status
- `POST /api/periodic-sync/sync` - Manual sync trigger
- `POST /api/periodic-sync/start` - Start service
- `POST /api/periodic-sync/stop` - Stop service
- `GET /api/periodic-sync/health` - Health check
- `GET /api/periodic-sync/metrics` - Detailed metrics

## Data Flow

### Redis to PostgreSQL Sync

1. **User Discovery**:

   ```python
   # Get all user IDs from Redis daily leaderboard
   user_ids = redis_client.zrange("leaderboard:daily", 0, -1)

   # Fetch complete user data from all leaderboards
   for user_id in user_ids:
       daily = redis_client.zscore("leaderboard:daily", user_id)
       weekly = redis_client.zscore("leaderboard:weekly", user_id)
       monthly = redis_client.zscore("leaderboard:monthly", user_id)
       yearly = redis_client.zscore("leaderboard:yearly", user_id)
   ```

2. **Change Detection**:

   ```python
   redis_users = {user_id: user_data}
   postgres_users = {user.user_id: user_data}

   new_users = redis_users.keys() - postgres_users.keys()
   deleted_users = postgres_users.keys() - redis_users.keys()
   existing_users = redis_users.keys() & postgres_users.keys()
   ```

3. **Database Updates**:

   ```python
   # Create new users
   for user_id in new_users:
       user = PomoLeaderboard(user_id=user_id, ...)
       session.add(user)

   # Update existing users
   for user_id in existing_users:
       if needs_update(redis_data, postgres_data):
           user.daily_pomo = redis_data["daily_pomo"]
           # ... update other fields

   # Delete removed users
   for user_id in deleted_users:
       session.query(PomoLeaderboard).filter_by(user_id=user_id).delete()
   ```

## Testing & Validation

### Test Suite (`python scripts/manage_periodic_sync.py test`)

1. **Creates test data in Redis**:

   - 3 test users with different scores
   - All leaderboard periods populated
   - User details cache populated

2. **Tests new user creation**:

   - Verifies users are created in PostgreSQL
   - Validates all score fields are synced correctly

3. **Tests user updates**:

   - Updates a user's score in Redis
   - Verifies the change propagates to PostgreSQL

4. **Tests user deletion**:

   - Removes a user from Redis
   - Verifies user is deleted from PostgreSQL

5. **Cleanup**:
   - Removes all test data from both systems

### Example Test Output:

```
🧪 Testing periodic sync system...

1. Creating test data in Redis...
✅ Created 3 test users in Redis

2. Checking PostgreSQL before sync...
PostgreSQL users before sync: 0

3. Performing sync...
📈 Sync Results:
  Users Updated: 0
  Users Created: 3
  Users Deleted: 0
  Errors: 0

4. Verifying PostgreSQL after sync...
PostgreSQL users after sync: 3
  test_user_1: daily=5, weekly=25
  test_user_2: daily=3, weekly=18
  test_user_3: daily=8, weekly=35

5. Testing user update scenario...
Updating test_user_1 in Redis...
✅ User updated: daily_pomo = 10 (should be 10)

6. Testing user deletion scenario...
Removing test_user_3 from Redis...
✅ User successfully deleted from PostgreSQL

🎉 Periodic sync test completed successfully!
```

## Deployment

### 1. **Development Setup**

```bash
# Test the sync system
cd backend
python scripts/manage_periodic_sync.py test

# Check status
python scripts/manage_periodic_sync.py status

# Start the service
python scripts/manage_periodic_sync.py start
```

### 2. **Production Deployment**

#### Option A: Background Service

```bash
# Run as a background service
nohup python scripts/manage_periodic_sync.py start > sync.log 2>&1 &
```

#### Option B: FastAPI Integration

```python
# In main.py startup event
@app.on_event("startup")
async def startup_event():
    # Start periodic sync as background task
    asyncio.create_task(periodic_sync_service.start_periodic_sync())
```

#### Option C: Systemd Service

```ini
# /etc/systemd/system/periodic-sync.service
[Unit]
Description=Periodic Sync Service
After=network.target

[Service]
Type=simple
User=appuser
WorkingDirectory=/path/to/backend
ExecStart=/path/to/venv/bin/python scripts/manage_periodic_sync.py start
Restart=always

[Install]
WantedBy=multi-user.target
```

### 3. **Monitoring Setup**

#### Health Check Endpoint

```bash
# Monitor service health
curl http://localhost:8000/api/periodic-sync/health

# Get detailed metrics
curl http://localhost:8000/api/periodic-sync/metrics
```

#### Log Monitoring

```bash
# Watch sync logs
tail -f sync.log | grep "Sync completed"

# Check for errors
grep "ERROR" sync.log
```

## Configuration

### Environment Variables

```bash
# Redis connection
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password

# PostgreSQL connection
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_DB=your_database
```

### Sync Interval

```python
# In periodic_sync_service.py
self.sync_interval_hours = 1  # Change to adjust frequency
```

## Error Handling

### Common Issues & Solutions

#### 1. **Redis Connection Failure**

```
Error: Redis cache unavailable
Solution: Check Redis server status and network connectivity
```

#### 2. **PostgreSQL Connection Failure**

```
Error: Failed to get PostgreSQL users
Solution: Verify database credentials and connection parameters
```

#### 3. **Partial Sync Failures**

```
Sync Results: Errors: 2
Solution: Check logs for specific user errors, retry individual users
```

#### 4. **Timezone Issues**

```
Error: can't compare offset-naive and offset-aware datetimes
Solution: Fixed in _needs_update() method with timezone normalization
```

### Recovery Procedures

#### Manual Recovery

```bash
# Force a complete sync
python scripts/manage_periodic_sync.py sync

# Check what failed
python scripts/manage_periodic_sync.py status
```

#### Data Validation

```python
# Compare Redis and PostgreSQL counts
metrics = requests.get("/api/periodic-sync/metrics").json()
redis_count = metrics["metrics"]["redis_counts"]["daily_leaderboard"]
postgres_count = metrics["metrics"]["postgres_users"]

if redis_count != postgres_count:
    # Trigger manual sync
    requests.post("/api/periodic-sync/sync")
```

## Performance Considerations

### Sync Performance

- **Typical sync time**: 50-200ms for small datasets
- **Memory usage**: Minimal, processes users in batches
- **Database load**: Read-heavy with periodic writes

### Scaling Recommendations

- **Large datasets**: Consider batch processing
- **High frequency**: Reduce sync interval if needed
- **Multiple instances**: Use distributed locking

### Optimization Tips

```python
# Batch processing for large user counts
BATCH_SIZE = 1000
for batch in chunk_users(all_users, BATCH_SIZE):
    process_batch(batch)
    await asyncio.sleep(0.1)  # Rate limiting
```

## Security

### Access Control

- API endpoints should require admin authentication
- Redis and PostgreSQL should not be publicly accessible
- Consider rate limiting for manual sync triggers

### Data Integrity

- PostgreSQL transactions ensure atomicity
- Failed syncs don't corrupt existing data
- Detailed logging for audit trails

## Troubleshooting

### Debug Commands

```bash
# Check Redis data
redis-cli -h localhost -p 6379
> ZRANGE leaderboard:daily 0 -1 WITHSCORES

# Check PostgreSQL data
psql -h localhost -U postgres -d your_db
> SELECT user_id, daily_pomo, updated_at FROM pomo_leaderboard LIMIT 10;

# Test API endpoints
curl -X GET http://localhost:8000/api/periodic-sync/status
curl -X POST http://localhost:8000/api/periodic-sync/sync
```

### Log Analysis

```bash
# Find sync patterns
grep "Sync completed" sync.log | tail -10

# Check error patterns
grep "Failed to" sync.log | head -10

# Monitor sync frequency
grep "Starting Redis -> PostgreSQL sync" sync.log | tail -5
```

## Future Enhancements

### Planned Features

1. **Conflict Resolution**: Handle concurrent updates gracefully
2. **Incremental Sync**: Only sync changed users for better performance
3. **Multi-directional Sync**: Support PostgreSQL to Redis sync
4. **Webhook Notifications**: Alert on sync failures or large changes
5. **Metrics Dashboard**: Web UI for monitoring sync status

### Configuration Options

1. **Flexible Intervals**: Configurable sync frequency per environment
2. **Selective Sync**: Choose which leaderboard periods to sync
3. **Dry Run Mode**: Preview changes without applying them
4. **Backup Integration**: Automatic backup before major syncs
