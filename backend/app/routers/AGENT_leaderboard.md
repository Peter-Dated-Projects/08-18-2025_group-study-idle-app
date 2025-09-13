# /backend/app/routers/leaderboard.py - Pomodoro Leaderboard API

## Purpose

API endpoints for managing pomodoro tracking, updating counts, and leaderboard functionality using the new `PomoLeaderboard` table system.

## Key Endpoints

### Pomodoro Management

- **POST `/api/leaderboard/update`** - Add pomodoros to a user's count
- **GET `/api/leaderboard/user/{user_id}`** - Get specific user's pomodoro statistics

### Leaderboard Queries

- **GET `/api/leaderboard/{period}`** - Get leaderboard for specific time period
  - Supports: `daily`, `weekly`, `monthly`, `yearly`
  - Optional `limit` parameter (default 10)

### Administrative

- **POST `/api/leaderboard/reset/{period}`** - Reset counts for a time period
  - For scheduled jobs to reset daily/weekly/monthly counts

## Data Models

### PomoUpdateRequest

```json
{
  "user_id": "string",
  "count": 1 // number of pomodoros to add
}
```

### PomoResponse

```json
{
  "user_id": "string",
  "daily_pomo": 0,
  "weekly_pomo": 0,
  "monthly_pomo": 0,
  "yearly_pomo": 0,
  "updated_at": "2025-09-13T12:00:00Z"
}
```

### LeaderboardResponse

```json
{
  "success": true,
  "period": "weekly",
  "entries": [
    {
      "user_id": "string",
      "daily_pomo": 5,
      "weekly_pomo": 20,
      "monthly_pomo": 80,
      "yearly_pomo": 365
    }
  ]
}
```

## Architecture Notes

### Database Integration

- Uses `PomoLeaderboard` table for all pomodoro tracking
- Automatically creates `UserStats` entries if needed
- Maintains referential integrity across user tables

### Time Period Strategy

- All updates increment ALL time periods simultaneously
- Separate reset endpoints for different periods
- Yearly counts serve as lifetime totals (no reset)

### Error Handling

- Automatic rollback on database errors
- Detailed logging for debugging
- Proper HTTP status codes for different error types

## Agent Instructions

### For Pomodoro Updates

1. Use `POST /api/leaderboard/update` to add completed pomodoros
2. Updates are additive - specify count of new pomodoros completed
3. All time periods (daily/weekly/monthly/yearly) are updated together

### For Leaderboard Display

1. Query specific time periods based on UI needs
2. Use `limit` parameter to control response size
3. Results are sorted in descending order (highest first)

### For Time Period Resets

1. Implement scheduled jobs to reset daily/weekly/monthly counts
2. Never reset yearly counts (lifetime totals)
3. Use with caution - affects all users

### Integration Notes

1. Replaces old `UserStats.pomo_count` system
2. User stats endpoint now returns `total_pomo` from `yearly_pomo`
3. Maintains backward compatibility through API response structure

### Common Usage Patterns

```python
# Add a pomodoro for a user
POST /api/leaderboard/update
{
  "user_id": "user123",
  "count": 1
}

# Get weekly leaderboard (top 10)
GET /api/leaderboard/weekly?limit=10

# Get user's current stats
GET /api/leaderboard/user/user123

# Daily reset (scheduled job)
POST /api/leaderboard/reset/daily
```

### Database Migration Notes

- `pomo_count` column removed from `user_stats` table
- Existing data migrated to `pomo_leaderboard` table
- API responses updated to use `total_pomo` instead of `pomo_count`
