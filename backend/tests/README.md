# Tests Directory

This directory contains all testing files for the Group Study Idle App Backend.

## Test Files Overview

### Core Functionality Tests

- `test_firestore_functionality.py` - Comprehensive Firestore integration testing
- `test_user_service.py` - User service functionality tests
- `test_user_api.py` - User API endpoint tests
- `test_db_connection.py` - Database connection tests
- `test_env_config.py` - Environment configuration tests
- `test_gcp_config.py` - Google Cloud Platform configuration tests

### Feature-Specific Tests

- `test_friends_arangodb.py` - Friends system with ArangoDB tests
- `test_friends_of_friends.py` - Friends of friends functionality
- `test_groups_arangodb.py` - Groups system with ArangoDB tests
- `test_redis_lobbies.py` - Redis lobby system tests
- `test_redis_lobbies_pytest.py` - Redis lobby pytest version

### Leaderboard Tests

- `test_group_leaderboard.py` - Group leaderboard functionality
- `test_group_leaderboard_pytest.py` - Group leaderboard pytest version
- `test_zset_group_leaderboard.py` - Redis ZSET-based group leaderboard
- `test_zset_group_leaderboard_pytest.py` - Redis ZSET leaderboard pytest version

### System Tests

- `test_periodic_reset.py` - Periodic reset system tests
- `test_periodic_reset_pytest.py` - Periodic reset pytest version

### Utilities

- `add_test_users.py` - Script to add test users to the database
- `run_all_tests.py` - Test runner script to execute all tests

## Running Tests

### Run All Tests

```bash
cd /path/to/backend/tests
python3 run_all_tests.py
```

### Run Individual Tests

```bash
cd /path/to/backend/tests
python3 test_firestore_functionality.py
```

### Run Tests with Virtual Environment

```bash
cd /path/to/backend
source .venv/bin/activate
cd tests
python3 run_all_tests.py
```

### Run Pytest Tests

```bash
cd /path/to/backend
source .venv/bin/activate
pytest tests/test_*_pytest.py -v
```

## Documentation

- `AGENT.md` - General testing documentation
- `AGENT_PYTEST.md` - Pytest-specific documentation and guidelines

## Notes

- Make sure to activate the virtual environment before running tests
- Some tests require Redis and PostgreSQL to be running
- Firestore tests require proper Firebase configuration in `.env`
- Environment variables should be properly configured before running tests
