# /backend/app/utils - Database and Utility Functions

## Purpose
Utility functions for database operations, data processing, and shared functionality across the application.

## Utility Files
- `postgres_utils.py` - PostgreSQL database operations and connection management
- `redis_utils.py` - Redis operations and connection handling
- `redis_json_utils.py` - JSON serialization utilities for Redis storage

## Database Utils (`postgres_utils.py`)
- **Connection Management** - Database connection pooling and lifecycle
- **Query Helpers** - Common database operations and queries
- **Transaction Management** - Safe database transaction handling
- **Migration Support** - Database schema migration utilities

## Redis Utils (`redis_utils.py`)
- **Connection Management** - Redis connection and configuration
- **Caching Operations** - Get, set, delete operations with expiration
- **Pub/Sub** - Real-time messaging and event distribution
- **Session Storage** - User session data management

## Redis JSON Utils (`redis_json_utils.py`)
- **Serialization** - JSON encoding/decoding for Redis storage
- **Complex Data Types** - Handling of nested objects and arrays
- **Data Validation** - Ensuring data integrity in Redis operations

## Common Patterns
- **Connection pooling** for efficient resource usage
- **Error handling** with proper logging and recovery
- **Async operations** for non-blocking database access
- **Transaction safety** for data consistency

## Agent Notes
- Use these utils for all database operations
- Don't create direct database connections in routers/services
- Follow established patterns for error handling
- Add logging for debugging and monitoring
- Use connection pooling for performance
- Handle database errors gracefully
- Implement proper cleanup in finally blocks
- Test database operations with different connection states
