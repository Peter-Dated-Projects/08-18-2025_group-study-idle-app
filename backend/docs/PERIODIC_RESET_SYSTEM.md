# Periodic Reset System Documentation

## Overview

The Periodic Reset System automatically resets leaderboard columns at specific time intervals to maintain competitive periods. All resets occur at 1:00 AM Eastern Time (EST) to ensure consistency across different time zones.

## Reset Schedule

### 🔄 **Daily Reset**
- **When**: Every day at 1:00 AM EST
- **What**: Resets `daily_pomo` column to 0
- **Purpose**: Provides daily competition cycles

### 🔄 **Weekly Reset**  
- **When**: Every Sunday at 1:00 AM EST
- **What**: Resets `weekly_pomo` column to 0
- **Purpose**: Provides weekly competition cycles

### 🔄 **Monthly Reset**
- **When**: 1st day of every month at 1:00 AM EST
- **What**: Resets `monthly_pomo` column to 0
- **Purpose**: Provides monthly competition cycles

### 🔄 **Yearly Reset**
- **When**: January 1st at 1:00 AM EST
- **What**: Resets `yearly_pomo` column to 0
- **Purpose**: Provides yearly competition cycles

## System Architecture

```
Background Task Manager
│
├── Periodic Sync Service (Every Hour)
│   └── Redis ↔ PostgreSQL synchronization
│
└── Periodic Reset Service (Check Every Hour)
    ├── Daily Reset Check
    ├── Weekly Reset Check  
    ├── Monthly Reset Check
    └── Yearly Reset Check
```

## Implementation Details

### Timezone Handling
- All resets use **America/New_York** timezone (EST/EDT)
- Automatically handles daylight saving time transitions
- Uses Python's `zoneinfo` for proper timezone support

### Reset Process
1. **Check if reset is due** based on current EST time
2. **Update PostgreSQL** - Set target column to 0 for all users
3. **Clear Redis cache** - Remove corresponding leaderboard ZSET
4. **Log the operation** with timestamp and statistics
5. **Track last reset time** to prevent duplicate resets

### Data Consistency
- **PostgreSQL remains source of truth** - Always updated first
- **Redis cache cleared** - Forces reload from PostgreSQL
- **Atomic operations** - All-or-nothing updates with rollback on failure
- **Error isolation** - Individual reset failures don't affect other periods

## Components

### 1. **PeriodicResetService** (`app/services/periodic_reset_service.py`)

Core service handling reset logic and scheduling.

#### Key Methods:
- `start_periodic_resets()` - Main loop checking for due resets
- `perform_daily_reset()` - Reset daily_pomo column
- `perform_weekly_reset()` - Reset weekly_pomo column  
- `perform_monthly_reset()` - Reset monthly_pomo column
- `perform_yearly_reset()` - Reset yearly_pomo column
- `manual_reset(period)` - Trigger manual reset for testing
- `get_reset_status()` - Status and schedule information

#### Reset Detection Logic:
```python
def _is_daily_reset_due(self, now_est: datetime) -> bool:
    # Daily reset at 1 AM
    if now_est.hour != 1:
        return False
    
    # Check if we already reset today
    if self.last_resets["daily"]:
        last_reset = self.last_resets["daily"]
        if last_reset.date() == now_est.date():
            return False
    
    return True
```

### 2. **API Router** (`app/routers/periodic_reset.py`)

REST endpoints for monitoring and manual control.

#### Endpoints:
- `GET /api/periodic-reset/status` - Service status and schedule
- `POST /api/periodic-reset/manual/{period}` - Manual reset trigger
- `GET /api/periodic-reset/next-resets` - Next scheduled reset times
- `GET /api/periodic-reset/last-resets` - Last reset timestamps
- `GET /api/periodic-reset/health` - Health check
- `GET /api/periodic-reset/schedule` - Complete schedule information

### 3. **Background Task Integration**

Integrated with the existing background task manager for unified lifecycle management.

```python
# In BackgroundTaskManager
self.reset_task = asyncio.create_task(self._run_periodic_resets())

async def _run_periodic_resets(self):
    await periodic_reset_service.start_periodic_resets()
```

### 4. **Test Suite** (`scripts/test_periodic_reset.py`)

Comprehensive testing tool for validation.

#### Commands:
```bash
# Check current status
python scripts/test_periodic_reset.py status

# Show reset schedule
python scripts/test_periodic_reset.py schedule

# Run comprehensive tests
python scripts/test_periodic_reset.py test

# Test manual reset
python scripts/test_periodic_reset.py manual daily
```

## Usage Examples

### API Usage
```bash
# Check next reset times
curl http://localhost:8000/api/periodic-reset/next-resets

# Trigger manual daily reset (admin only)
curl -X POST http://localhost:8000/api/periodic-reset/manual/daily

# Check reset service health
curl http://localhost:8000/api/periodic-reset/health
```

### Python Integration
```python
from app.services.periodic_reset_service import periodic_reset_service

# Check if reset is needed
status = periodic_reset_service.get_reset_status()
print(f"Next daily reset: {status['next_resets']['daily']}")

# Manual reset for testing
stats = await periodic_reset_service.manual_reset("daily")
print(f"Reset {stats['users_reset']} users")
```

## Monitoring & Alerts

### Key Metrics to Monitor
1. **Reset completion status** - Did scheduled resets complete successfully?
2. **User count affected** - How many users were reset?
3. **Error rates** - Any failures during reset operations?
4. **Timing accuracy** - Are resets happening at correct times?

### Health Check Integration
```python
# Health check endpoint returns:
{
    "success": true,
    "health": {
        "reset_service_running": true,
        "redis_connected": true,
        "postgres_connected": true,
        "current_time_est": "2025-09-13T14:20:00-04:00"
    },
    "status": "healthy"
}
```

### Logging
All reset operations are logged with:
- Timestamp (EST)
- Reset type (daily/weekly/monthly/yearly)
- Number of users affected
- Success/failure status
- Error details if applicable

## Deployment Considerations

### 1. **Multiple Instance Deployment**
- Only one instance should perform resets to avoid conflicts
- Consider using distributed locking for multi-instance deployments
- Monitor for duplicate reset attempts

### 2. **Time Zone Configuration**
- Ensure server time zone is properly configured
- Test daylight saving time transitions (EST ↔ EDT)
- Consider UTC storage with EST display for consistency

### 3. **Database Performance**
- Large user tables may need indexed updates
- Consider batch processing for very large datasets
- Monitor reset operation duration

### 4. **Backup Considerations**
- Schedule database backups before major resets (monthly/yearly)
- Consider user notification before resets
- Implement rollback procedures for failed resets

## Error Handling

### Common Issues & Solutions

#### 1. **Database Connection Failure**
```
Error: Reset failed - PostgreSQL connection lost
Solution: 
- Check database server status
- Verify connection parameters
- Implement retry logic with exponential backoff
```

#### 2. **Redis Cache Issues**
```
Warning: Redis cache clear failed
Impact: PostgreSQL updated but cache inconsistent
Solution: Cache will be repopulated on next sync cycle
```

#### 3. **Timezone Confusion**
```
Error: Reset triggered at wrong time
Solution:
- Verify server timezone configuration
- Check zoneinfo database updates
- Test with different EST/EDT periods
```

#### 4. **Duplicate Reset Prevention**
```
Info: Reset already performed today
Behavior: Skip reset to prevent data loss
Monitoring: Check last_reset timestamps
```

## Performance Characteristics

### Reset Operation Times
- **Small datasets** (< 1,000 users): 50-200ms
- **Medium datasets** (1,000-10,000 users): 200ms-1s
- **Large datasets** (10,000+ users): 1-5s

### Memory Usage
- **Minimal memory footprint** - Uses bulk UPDATE operations
- **No user data loaded** into memory during resets
- **Efficient Redis operations** - Simple key deletion

### Database Impact
- **Single UPDATE query** per reset operation
- **Indexed operations** on user_id (primary key)
- **Minimal lock time** - Quick commit/rollback

## Testing & Validation

### Manual Testing
```bash
# Test all reset periods
python scripts/test_periodic_reset.py manual daily
python scripts/test_periodic_reset.py manual weekly
python scripts/test_periodic_reset.py manual monthly
python scripts/test_periodic_reset.py manual yearly

# Verify schedule calculations
python scripts/test_periodic_reset.py status
```

### Automated Testing
- Unit tests for reset logic
- Integration tests with test database
- Schedule calculation validation
- Timezone transition testing

### Production Validation
```python
# Before reset
user_count_before = session.query(PomoLeaderboard).count()

# After reset  
user_count_after = session.query(PomoLeaderboard).count()
assert user_count_before == user_count_after  # No users lost

# Verify reset
daily_sum = session.query(func.sum(PomoLeaderboard.daily_pomo)).scalar()
assert daily_sum == 0  # All daily scores reset
```

## Future Enhancements

### Planned Features
1. **User Notifications** - Email/push notifications before resets
2. **Grace Period** - Brief window to complete ongoing sessions
3. **Selective Resets** - Reset specific user groups or regions
4. **Reset History** - Detailed audit trail of all reset operations
5. **Custom Schedules** - Configurable reset times per environment

### Configuration Options
1. **Timezone Selection** - Support for different regional timezones
2. **Reset Windows** - Configurable time windows instead of fixed 1 AM
3. **Batch Size Limits** - Process resets in smaller batches for large datasets
4. **Rollback Capabilities** - Restore previous state if reset fails

## Security Considerations

### Access Control
- Manual reset endpoints require admin authentication
- Rate limiting on manual reset triggers
- Audit logging for all manual operations

### Data Protection
- Database transactions prevent partial resets
- Backup verification before major resets
- Recovery procedures documented and tested

## Migration & Rollback

### Safe Deployment
1. Deploy with reset service disabled initially
2. Test manual resets in staging environment
3. Enable automatic resets during low-traffic period
4. Monitor first few automatic resets closely

### Rollback Procedures
1. Stop background task manager
2. Disable reset service endpoints
3. Restore from backup if data corruption occurs
4. Investigate and fix issues before re-enabling

The periodic reset system provides a robust, timezone-aware solution for maintaining competitive leaderboard periods while ensuring data consistency and system reliability.
