# AGENT_PYTEST.md - Tests Suite Documentation

This document describes the pytest test suites available in the `tests` folder. These tests focus on core application functionality, database connections, and integration testing.

## Overview

The tests folder contains integration and unit tests for core application components:

- **Database Connection Testing**: Tests database connectivity and configuration
- **Environment Configuration Testing**: Tests various environment configurations
- **ArangoDB Groups Testing**: Tests group management with ArangoDB
- **GCP Configuration Testing**: Tests Google Cloud Platform integration
- **Redis Lobbies Testing**: Tests Redis-based lobby system
- **Friends System Testing**: Tests ArangoDB-based friends functionality

## Test Files

### 1. test_db_connection.py

**Purpose**: Tests database connection functionality and Cloud SQL integration.

**Key Features**:

- Validates environment variable configuration
- Tests database URL generation
- Tests database engine creation
- Validates actual database connectivity

**Test Areas**:

- Environment variable loading from `.env` file
- Cloud SQL vs local PostgreSQL configuration
- Database connection establishment
- Query execution validation

**Environment Variables Tested**:

- `INSTANCE_IS_GCP`: Whether running on Google Cloud Platform
- `INSTANCE_CONNECTION_NAME`: Cloud SQL instance connection name
- `USE_CLOUD_SQL_PROXY`: Whether to use Cloud SQL proxy
- `DB_USER`, `DB_NAME`, `DB_HOST`, `DB_PORT`: Database connection parameters

**Usage**:

```bash
python tests/test_db_connection.py
```

### 2. test_env_config.py

**Purpose**: Tests environment configuration with different GCP mode settings.

**Key Features**:

- Tests GCP mode configuration
- Tests local development mode configuration
- Validates database URL generation for different environments
- Tests environment variable combinations

**Configuration Modes Tested**:

- **GCP Mode**: `INSTANCE_IS_GCP=true` with Cloud SQL settings
- **Local Mode**: Standard PostgreSQL connection settings
- **Proxy Mode**: Using Cloud SQL proxy for local development

**Test Scenarios**:

- Full GCP configuration with all required variables
- Local configuration with standard PostgreSQL
- Mixed configurations and error handling

**Usage**:

```bash
python tests/test_env_config.py
```

### 3. test_groups_arangodb.py ✅ (Already pytest format)

**Purpose**: Integration tests for the groups API endpoints with ArangoDB backend.

**Key Features**:

- Tests complete group lifecycle (create, join, leave, delete)
- Tests group membership management
- Tests creator permissions and ownership transfer
- Tests group limits and constraints

**Test Functions**:

- `test_create_group()`: Tests group creation functionality
- `test_join_and_leave_group()`: Tests membership management
- `test_group_limit()`: Tests 5-group per user limit
- `test_creator_leaves_group_transfer_ownership()`: Tests ownership transfer
- `test_creator_leaves_last_deletes_group()`: Tests group deletion

**Fixtures**:

- `test_user()`: Provides unique user ID for testing
- `test_group()`: Creates test group and handles cleanup

**API Endpoints Tested**:

- `POST /api/groups/create`: Create new group
- `POST /api/groups/join`: Join existing group
- `POST /api/groups/leave`: Leave group
- `GET /api/groups/details/{group_id}`: Get group details
- `DELETE /api/groups/delete`: Delete group

**Business Rules Tested**:

- Users can create maximum 5 groups
- Group creator is automatically added as member
- When creator leaves, ownership transfers to next member
- When last member leaves, group is deleted

**Usage**:

```bash
pytest tests/test_groups_arangodb.py -v
```

### 4. test_gcp_config.py

**Purpose**: Tests Google Cloud Platform configuration and connectivity.

**Key Features**:

- Tests GCP instance detection
- Tests Cloud SQL configuration
- Tests local development configuration
- Validates GCP service integration

**Test Functions**:

- `test_gcp_mode()`: Tests full GCP configuration
- `test_local_mode()`: Tests local development configuration

**GCP Services Tested**:

- Cloud SQL instance connectivity
- IAM authentication
- Environment-based configuration switching

**Usage**:

```bash
python tests/test_gcp_config.py
```

### 5. test_redis_lobbies_pytest.py

**Purpose**: Comprehensive testing of Redis-based lobby system functionality.

**Key Features**:

- Tests async lobby operations
- Tests Redis JSON operations
- Tests lobby lifecycle management
- Tests multi-user interactions

**Test Functions**:

- `test_redis_connectivity()`: Tests basic Redis connectivity
- `test_health_check()`: Tests lobby system health
- `test_create_lobby()`: Tests lobby creation
- `test_get_lobby()`: Tests lobby retrieval
- `test_join_lobby()`: Tests joining lobbies
- `test_leave_lobby()`: Tests leaving lobbies
- `test_close_lobby()`: Tests closing lobbies
- `test_get_lobby_users()`: Tests user listing
- `test_list_all_lobbies()`: Tests lobby listing
- `test_get_lobby_count()`: Tests lobby counting
- `test_json_operations()`: Tests JSON serialization

**Fixtures**:

- `event_loop`: Provides async event loop
- `test_user_ids`: Provides test user identifiers
- `test_lobby`: Creates and cleans up test lobby

**Lobby Operations Tested**:

- Lobby creation with unique codes
- User joining and leaving
- Lobby closure and cleanup
- Multi-user lobby interactions
- JSON data persistence

**Usage**:

```bash
pytest tests/test_redis_lobbies_pytest.py -v
```

### 6. test_friends_arangodb.py

**Purpose**: Tests ArangoDB-based friends system functionality.

**Key Features**:

- Tests friend relationship management
- Tests bidirectional friend connections
- Tests friend discovery and recommendations
- Tests ArangoDB graph operations

**Expected Test Areas** (based on typical friends system):

- Adding/removing friends
- Friend request management
- Friend list retrieval
- Mutual friends discovery
- Friend recommendations

**Usage**:

```bash
pytest tests/test_friends_arangodb.py -v
```

### 7. test_periodic_reset.py

**Purpose**: Tests periodic reset functionality for user statistics.

**Key Features**:

- Tests scheduled reset operations
- Tests reset timing and triggers
- Tests data integrity during resets
- Tests multi-period reset coordination

**Expected Test Areas**:

- Daily/weekly/monthly/yearly resets
- Reset scheduling validation
- Data preservation during partial resets
- Error handling and recovery

**Usage**:

```bash
pytest tests/test_periodic_reset.py -v
```

## Test Configuration

### Base URL Configuration

Most API tests use configurable base URLs:

```python
BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8080")
```

### Database Configuration

Database tests use environment variables for connection:

- Development: Local PostgreSQL
- Production: Cloud SQL with IAM authentication
- Testing: Isolated test database

### Redis Configuration

Redis tests require:

- Redis server running locally or remotely
- Redis JSON module enabled
- Proper connection configuration

## Running Tests

### Individual Test Files

```bash
pytest tests/test_groups_arangodb.py -v
pytest tests/test_redis_lobbies_pytest.py -v
```

### All Tests

```bash
pytest tests/ -v
```

### With Coverage

```bash
pytest tests/ --cov=app --cov-report=html
```

### Specific Test Categories

```bash
# Database tests
pytest tests/test_db_connection.py tests/test_env_config.py tests/test_gcp_config.py

# API integration tests
pytest tests/test_groups_arangodb.py tests/test_friends_arangodb.py

# Redis tests
pytest tests/test_redis_lobbies_pytest.py

# Async tests
pytest tests/test_redis_lobbies_pytest.py tests/test_periodic_reset.py -v
```

## Test Dependencies

### Required Services

- **PostgreSQL/Cloud SQL**: For database tests
- **ArangoDB**: For graph-based tests (groups, friends)
- **Redis**: For lobby and caching tests
- **Backend API**: Running on configured port

### Python Packages

- `pytest`: Test framework
- `pytest-asyncio`: For async test support
- `requests`: For API testing
- `sqlalchemy`: For database operations
- `redis`: For Redis operations

### Environment Setup

```bash
# Install test dependencies
pip install pytest pytest-asyncio pytest-cov

# Set up environment variables
export API_BASE_URL="http://localhost:8080"
export DB_HOST="localhost"
export DB_PORT="5432"
export REDIS_URL="redis://localhost:6379"
```

## Test Data Management

### Isolation Strategy

- Each test creates its own test data
- Unique identifiers prevent conflicts
- Cleanup in fixture teardown
- Database transactions for rollback

### Test Users

Tests use generated unique identifiers:

```python
def generate_user_id():
    return f"user_{uuid.uuid4().hex[:8]}"
```

### Test Groups/Lobbies

Similar strategy for group and lobby identifiers:

```python
def generate_group_name():
    return f"Test Group {uuid.uuid4().hex[:4]}"
```

## Best Practices

### Test Structure

1. **Arrange**: Set up test data and conditions
2. **Act**: Execute the functionality being tested
3. **Assert**: Verify the expected outcomes
4. **Cleanup**: Remove test data (in fixtures)

### Fixture Usage

- Use `@pytest.fixture` for shared setup/teardown
- Scope fixtures appropriately (`function`, `class`, `module`, `session`)
- Yield for cleanup in fixtures
- Use fixture dependencies for complex setups

### Async Testing

```python
@pytest.mark.asyncio
async def test_async_function():
    result = await some_async_operation()
    assert result is not None
```

### Error Testing

```python
def test_invalid_input():
    with pytest.raises(ValueError):
        invalid_operation()
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**

   - Check database server status
   - Verify connection parameters
   - Ensure test database exists

2. **Redis Connection Errors**

   - Start Redis server
   - Check Redis configuration
   - Verify Redis JSON module

3. **API Connection Errors**

   - Start backend server
   - Check port configuration
   - Verify API endpoints exist

4. **Import Errors**

   - Check Python path
   - Install missing dependencies
   - Verify module structure

5. **Async Test Issues**
   - Install `pytest-asyncio`
   - Use proper async fixtures
   - Mark tests with `@pytest.mark.asyncio`

### Debug Tips

1. **Verbose Output**: Use `-v` flag for detailed test output
2. **Debug Mode**: Use `-s` flag to see print statements
3. **Stop on First Failure**: Use `-x` flag
4. **Run Specific Tests**: Use `-k pattern` to filter tests
5. **Coverage Reports**: Use `--cov` for coverage analysis

### Environment Issues

1. **Environment Variables**: Check `.env` file loading
2. **Service Dependencies**: Ensure all required services are running
3. **Port Conflicts**: Check for port conflicts with other services
4. **Permissions**: Verify database and file permissions

## Integration with CI/CD

These tests are designed to work in CI/CD environments:

1. **Service Dependencies**: Use Docker containers for services
2. **Environment Variables**: Configure via CI/CD environment
3. **Test Isolation**: Tests don't interfere with each other
4. **Cleanup**: Proper cleanup prevents resource leaks
5. **Parallel Execution**: Tests can run in parallel safely
