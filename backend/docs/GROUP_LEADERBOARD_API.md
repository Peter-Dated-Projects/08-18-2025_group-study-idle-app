# Group Leaderboard API Documentation

## Overview

The Group Leaderboard API provides endpoints for accessing group-specific rankings and leaderboards. These endpoints interact **only with Redis cache** for high performance and are designed for frontend consumption.

## Base URL

```
/api/group-leaderboard
```

## Available Endpoints

### 1. Get Group Leaderboard for Specific Period

**GET** `/group/{group_id}/{period}`

Gets the leaderboard for a specific group and time period, showing only group members ranked by their pomodoro scores.

**Parameters:**

- `group_id` (path): The group ID to get leaderboard for
- `period` (path): Time period - `daily`, `weekly`, `monthly`, or `yearly`
- `limit` (query, optional): Maximum entries to return (default: 50, max: 100)

**Response:**

```json
{
  "success": true,
  "group_id": "group123",
  "group_name": "Study Warriors",
  "period": "weekly",
  "total_members": 5,
  "leaderboard": [
    {
      "user_id": "user456",
      "score": 25,
      "rank": 12,
      "group_rank": 1
    },
    {
      "user_id": "user789",
      "score": 18,
      "rank": 25,
      "group_rank": 2
    }
  ],
  "cached": true
}
```

### 2. Get All Group Rankings

**GET** `/group/{group_id}/rankings`

Gets rankings for all time periods (daily, weekly, monthly, yearly) for a group.

**Parameters:**

- `group_id` (path): The group ID to get rankings for

**Response:**

```json
{
  "success": true,
  "group_id": "group123",
  "group_name": "Study Warriors",
  "rankings": {
    "daily": [
      {
        "user_id": "user456",
        "score": 5,
        "rank": 8,
        "group_rank": 1
      }
    ],
    "weekly": [...],
    "monthly": [...],
    "yearly": [...]
  },
  "cached": true
}
```

### 3. Get Member Rank in Group

**GET** `/member/{user_id}/group/{group_id}`

Gets a specific member's detailed stats and rankings within their group.

**Parameters:**

- `user_id` (path): The user ID to get stats for
- `group_id` (path): The group ID to check rankings in

**Response:**

```json
{
  "success": true,
  "user_id": "user456",
  "group_id": "group123",
  "group_name": "Study Warriors",
  "member_stats": {
    "user_id": "user456",
    "daily_pomo": 5,
    "weekly_pomo": 25,
    "monthly_pomo": 100,
    "yearly_pomo": 500,
    "rank_daily": 8,
    "rank_weekly": 12,
    "rank_monthly": 15,
    "rank_yearly": 20
  }
}
```

### 4. Compare Multiple Groups

**GET** `/compare-groups`

Compares multiple groups by their total pomodoro scores for a specific period.

**Parameters:**

- `group_ids` (query): Comma-separated list of group IDs to compare
- `period` (query, optional): Time period for comparison (default: "weekly")

**Response:**

```json
{
  "success": true,
  "groups": [
    {
      "group_id": "group123",
      "group_name": "Study Warriors",
      "total_score": 150,
      "average_score": 30.0,
      "member_count": 5,
      "period": "weekly",
      "rank": 1
    },
    {
      "group_id": "group456",
      "group_name": "Code Crushers",
      "total_score": 120,
      "average_score": 24.0,
      "member_count": 5,
      "period": "weekly",
      "rank": 2
    }
  ],
  "period": "weekly"
}
```

### 5. Get User's Rankings Across All Groups

**GET** `/user/{user_id}/groups`

Gets a user's rankings across all groups they belong to.

**Parameters:**

- `user_id` (path): The user ID to get group rankings for

**Response:**

```json
{
  "success": true,
  "user_id": "user456",
  "user_stats": {
    "user_id": "user456",
    "daily_pomo": 5,
    "weekly_pomo": 25,
    "monthly_pomo": 100,
    "yearly_pomo": 500,
    "rank_daily": 8,
    "rank_weekly": 12,
    "rank_monthly": 15,
    "rank_yearly": 20
  },
  "group_rankings": [
    {
      "group_id": "group123",
      "group_name": "Study Warriors",
      "member_count": 5,
      "ranks": {
        "daily": { "rank": 2, "total_members": 5 },
        "weekly": { "rank": 1, "total_members": 5 },
        "monthly": { "rank": 3, "total_members": 5 },
        "yearly": { "rank": 1, "total_members": 5 }
      }
    }
  ]
}
```

## Features

### 🚀 **Redis-Only Operations**

- All endpoints interact exclusively with Redis cache
- No direct PostgreSQL queries for maximum performance
- Real-time data from Redis sorted sets (ZSETs)

### 📊 **Comprehensive Rankings**

- **Global Rank**: User's position in the overall leaderboard
- **Group Rank**: User's position within their specific group
- **Multi-Period Support**: Daily, weekly, monthly, yearly rankings

### 👥 **Group-Focused Features**

- Group-specific leaderboards showing only members
- Group comparison functionality
- Member-specific stats within groups
- Cross-group user rankings

### ⚡ **High Performance**

- Redis ZSET operations for automatic sorting
- Batch operations for multiple users
- Efficient caching with appropriate TTLs
- Minimal database overhead

## Error Handling

### Common Error Responses

**404 - Group Not Found:**

```json
{
  "detail": "Group not found"
}
```

**404 - User Not Group Member:**

```json
{
  "detail": "User is not a member of this group"
}
```

**400 - Invalid Period:**

```json
{
  "detail": "Invalid period. Must be one of: daily, weekly, monthly, yearly"
}
```

**503 - Redis Unavailable:**

```json
{
  "detail": "Redis cache service unavailable"
}
```

## Usage Examples

### Frontend JavaScript Examples

#### Get Weekly Group Leaderboard

```javascript
const response = await fetch("/api/group-leaderboard/group/group123/weekly?limit=20");
const leaderboard = await response.json();

// Display group leaderboard
leaderboard.leaderboard.forEach((entry) => {
  console.log(
    `${entry.group_rank}. ${entry.user_id}: ${entry.score} pomos (Global rank: ${entry.rank})`
  );
});
```

#### Compare Multiple Groups

```javascript
const groupIds = ["group123", "group456", "group789"].join(",");
const response = await fetch(
  `/api/group-leaderboard/compare-groups?group_ids=${groupIds}&period=monthly`
);
const comparison = await response.json();

// Show group competition results
comparison.groups.forEach((group) => {
  console.log(
    `${group.rank}. ${group.group_name}: ${group.total_score} total (${group.average_score} avg)`
  );
});
```

#### Get User's Group Rankings

```javascript
const response = await fetch("/api/group-leaderboard/user/user456/groups");
const userGroups = await response.json();

// Show user's performance across all groups
userGroups.group_rankings.forEach((group) => {
  console.log(
    `${group.group_name}: Weekly rank ${group.ranks.weekly.rank}/${group.ranks.weekly.total_members}`
  );
});
```

#### Get All Group Rankings

```javascript
const response = await fetch("/api/group-leaderboard/group/group123/rankings");
const allRankings = await response.json();

// Show comprehensive group view
Object.entries(allRankings.rankings).forEach(([period, rankings]) => {
  console.log(`${period} leaderboard:`);
  rankings.slice(0, 3).forEach((entry) => {
    console.log(`  ${entry.group_rank}. ${entry.user_id}: ${entry.score}`);
  });
});
```

## Integration with Existing Systems

### Redis Cache Integration

- Uses existing Redis leaderboard structure (`leaderboard:{period}`)
- Leverages Redis ZSET automatic sorting capabilities
- Compatible with existing leaderboard update mechanisms

### Group Management Integration

- Integrates with existing group management endpoints
- Validates group membership through PostgreSQL
- Supports creator + member_ids structure

### Global Leaderboard Compatibility

- Provides both global and group-specific rankings
- Maintains consistency with main leaderboard system
- Uses same time period definitions

## Performance Considerations

### Optimizations

- **Batch Redis Operations**: Multiple user lookups in single calls
- **Efficient Sorting**: Leverages Redis ZSET native sorting
- **Smart Caching**: Appropriate TTL values for different data types
- **Lazy Loading**: Only fetches data when requested

### Scaling Recommendations

- Consider implementing group leaderboard caching for very large groups
- Use pagination for groups with many members
- Monitor Redis memory usage with large numbers of groups

## Security & Validation

### Input Validation

- Group ID existence validation
- User group membership verification
- Period parameter validation
- Reasonable limits on batch operations

### Error Handling

- Graceful degradation when Redis is unavailable
- Proper HTTP status codes
- Informative error messages
- Logging for debugging

---

_Last Updated: September 13, 2025_
_API Version: 1.0_
_Redis Cache Integration: Enabled_
