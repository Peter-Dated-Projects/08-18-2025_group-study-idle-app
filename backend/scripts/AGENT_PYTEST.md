# AGENT_PYTEST.md - Scripts Test Suite Documentation

This document describes the pytest test suites available in the `scripts` folder. All tests have been converted to proper pytest format with fixtures, assertions, and proper test isolation.

## Overview

The scripts folder contains specialized test files that focus on specific functionality areas:

- **Friends-of-Friends Testing**: Tests second-degree friend connections
- **Group Leaderboard Testing**: Tests group leaderboard endpoints and data handling
- **ZSET Group Leaderboard Testing**: Tests Redis ZSET-based leaderboard operations
- **Periodic Reset Testing**: Tests scheduled reset functionality

## Test Files

### 1. test_friends_of_friends.py

**Purpose**: Tests the friends-of-friends functionality, which finds second-degree connections between users.

**Key Features**:

- Creates a test network of friend relationships
- Tests friend discovery algorithms
- Validates friend-of-friend connections
- Tests edge cases (users with no friends)

**Test Functions**:

- `test_alice_friends_of_friends()`: Tests Alice's second-degree connections
- `test_bob_friends_of_friends()`: Tests Bob's second-degree connections
- `test_charlie_friends_of_friends()`: Tests Charlie's second-degree connections
- `test_empty_friends_of_friends()`: Tests users with no friends

**Fixtures**:

- `backend_server`: Ensures backend server is running
- `test_friendships`: Creates and cleans up test friendship network

**Network Structure Tested**:

```
Alice -> Bob -> Charlie
Alice -> David -> Eve
Bob -> Frank
```

**Expected Results**:

- Alice's friends-of-friends: [Charlie, Eve]
- Bob's friends-of-friends: [David]
- Charlie's friends-of-friends: [Alice, Frank]

**Usage**:

```bash
pytest scripts/test_friends_of_friends.py -v
```

### 2. test_group_leaderboard_pytest.py

**Purpose**: Tests group leaderboard endpoints with comprehensive API validation.

**Key Features**:

- Creates test data in Redis (groups and leaderboard data)
- Tests all group leaderboard API endpoints
- Validates response structure and data integrity
- Tests error handling for invalid inputs

**Test Functions**:

- `test_group_leaderboard_daily()`: Tests daily leaderboard retrieval
- `test_group_leaderboard_weekly()`: Tests weekly leaderboard retrieval
- `test_group_rankings_all_periods()`: Tests rankings for all time periods
- `test_member_rank_in_group()`: Tests individual member ranking
- `test_user_group_rankings()`: Tests user's rankings across groups
- `test_compare_groups()`: Tests group comparison functionality
- `test_invalid_group_id()`: Tests error handling for invalid group IDs
- `test_invalid_user_id()`: Tests error handling for invalid user IDs

**Fixtures**:

- `backend_server`: Ensures backend server is running
- `test_data`: Creates and cleans up test Redis data

**Test Data Structure**:

- **Groups**: Study Warriors (3 members), Focus Masters (2 members)
- **Users**: alice, bob, charlie, diana, eve with different pomo scores
- **Periods**: daily, weekly, monthly, yearly leaderboards

**API Endpoints Tested**:

- `/api/group-leaderboard/group/{group_id}/{period}`
- `/api/group-leaderboard/group/{group_id}/rankings`
- `/api/group-leaderboard/member/{user_id}/group/{group_id}`
- `/api/group-leaderboard/user/{user_id}/groups`
- `/api/group-leaderboard/compare-groups`

**Usage**:

```bash
pytest scripts/test_group_leaderboard_pytest.py -v
```

### 3. test_zset_group_leaderboard_pytest.py

**Purpose**: Tests Redis ZSET-based leaderboard operations for performance and correctness.

**Key Features**:

- Tests efficient ZSET operations (O(1) and O(log N) complexity)
- Validates leaderboard data population
- Tests ranking and scoring operations
- Measures performance of Redis operations

**Test Functions**:

- `test_zset_population()`: Tests ZSET data structure population
- `test_zset_ranking_operations()`: Tests ranking operations (ZREVRANK, ZSCORE)
- `test_zset_range_operations()`: Tests range queries (ZREVRANGE)
- `test_zset_performance_operations()`: Tests operation performance
- `test_zset_comprehensive_leaderboard_test()`: Integration test

**Fixtures**:

- `redis_client`: Provides Redis client for testing
- `leaderboard_service`: Provides Redis leaderboard service
- `periods`: Provides test periods (daily, weekly, monthly, yearly)

**Redis Operations Tested**:

- `ZCARD`: Get total users in leaderboard
- `ZREVRANK`: Get user's rank (0-based, descending order)
- `ZSCORE`: Get user's score
- `ZREVRANGE`: Get top N users with scores

**Performance Expectations**:

- All operations should complete within 0.1 seconds
- Operations should scale efficiently with data size

**Usage**:

```bash
pytest scripts/test_zset_group_leaderboard_pytest.py -v
```

### 4. test_periodic_reset_pytest.py

**Purpose**: Tests the periodic reset service that resets user statistics on schedule.

**Key Features**:

- Tests service status and configuration
- Tests manual reset operations for all periods
- Validates reset logic (only target period is reset)
- Tests async functionality properly

**Test Functions**:

- `test_reset_service_status()`: Tests service status retrieval
- `test_reset_schedule_information()`: Tests schedule configuration
- `test_manual_daily_reset()`: Tests daily reset functionality
- `test_manual_weekly_reset()`: Tests weekly reset functionality
- `test_manual_monthly_reset()`: Tests monthly reset functionality
- `test_manual_yearly_reset()`: Tests yearly reset functionality

**Fixtures**:

- `event_loop`: Provides async event loop for testing
- `test_user_id`: Provides unique test user ID
- `db_session`: Provides database session
- `test_user_data`: Creates and cleans up test user data

**Reset Periods Tested**:

- **Daily**: Resets daily_pomo only
- **Weekly**: Resets weekly_pomo only
- **Monthly**: Resets monthly_pomo only
- **Yearly**: Resets yearly_pomo only

**Reset Schedule**:

- Daily: Every day at 1:00 AM EST
- Weekly: Every Sunday at 1:00 AM EST
- Monthly: 1st of every month at 1:00 AM EST
- Yearly: January 1st at 1:00 AM EST

**Usage**:

```bash
pytest scripts/test_periodic_reset_pytest.py -v
```

## Running All Tests

To run all script tests:

```bash
pytest scripts/test_*_pytest.py -v
```

To run with coverage:

```bash
pytest scripts/test_*_pytest.py --cov=app --cov-report=html
```

## Test Dependencies

All tests require:

- **Backend Server**: Running on http://localhost:8000
- **Redis**: Running and accessible
- **Database**: PostgreSQL/ArangoDB depending on test
- **Python Packages**: pytest, requests, asyncio

## Test Data Management

All tests follow proper test isolation:

- **Setup**: Each test creates its own test data
- **Teardown**: Each test cleans up its data after completion
- **Isolation**: Tests don't interfere with each other
- **Fixtures**: Shared setup/teardown logic is in pytest fixtures

## Backwards Compatibility

All test files maintain backwards compatibility by including `if __name__ == "__main__"` blocks that allow them to be run directly as scripts while still working with pytest.

## Best Practices

1. **Use fixtures** for shared setup/teardown
2. **Assert specific conditions** rather than just checking for success
3. **Clean up test data** in fixture teardown or try/finally blocks
4. **Test error conditions** as well as success paths
5. **Use descriptive test names** that explain what is being tested
6. **Include logging** for debugging test failures

## Troubleshooting

Common issues and solutions:

1. **Backend not running**: Start the backend server on port 8000
2. **Redis not available**: Start Redis server and check connectivity
3. **Import errors**: Ensure Python path includes the project root
4. **Database connection**: Check database server status and credentials
5. **Test data conflicts**: Ensure proper cleanup in test fixtures
