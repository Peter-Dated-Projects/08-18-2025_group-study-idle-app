# /backend/tests - Test Suite

## Purpose

Comprehensive test suite covering unit tests, integration tests, and system validation for the backend application.

## Test Files

- `test_db_connection.py` - Database connectivity and configuration tests
- `test_env_config.py` - Environment variable and configuration validation
- `test_gcp_config.py` - Google Cloud Platform integration tests
- `test_redis_lobbies.py` - Redis lobby functionality tests

## Test Categories

### Configuration Tests

- **Environment Variables** - Validation of required configuration
- **Database Connections** - Testing different connection methods
- **External Services** - API connectivity and authentication
- **Cloud Services** - GCP integration and permissions

### Functional Tests

- **API Endpoints** - Router functionality and response validation
- **Database Operations** - CRUD operations and data integrity
- **Redis Operations** - Caching and real-time data management
- **WebSocket Connections** - Real-time communication testing

### Integration Tests

- **Service Interactions** - Testing service layer integrations
- **External APIs** - Third-party service integration validation
- **End-to-End Workflows** - Complete user journey testing

## Testing Framework

- **pytest** - Primary testing framework
- **Async testing** - Support for FastAPI async operations
- **Mock services** - Isolated testing with mocked dependencies
- **Test databases** - Separate database instances for testing

## Agent Notes

- **Run tests before deploying** any changes
- Use separate test databases to avoid data contamination
- Mock external services for unit tests
- Include both positive and negative test cases
- Test error handling and edge cases
- Use fixtures for common test setup
- Maintain test coverage above 80%
- Update tests when adding new features or changing APIs
