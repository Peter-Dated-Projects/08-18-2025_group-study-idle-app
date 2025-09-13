# /backend/app/services - Business Logic and External Integrations

## Purpose

Service layer containing business logic, external API integrations, and complex operations that span multiple data sources.

## Service Files

- `auth_utils.py` - Authentication and session management logic
- `lobby_service.py` - Study lobby business logic (PostgreSQL-based)
- `lobby_service_redis.py` - Real-time lobby management (Redis-based)
- `websocket_manager.py` - WebSocket connection and message handling

## Service Architecture

### Authentication Service

- User session creation and validation
- Token management and refresh
- Integration with Firebase Auth
- Session persistence and cleanup

### Lobby Services

- **PostgreSQL Lobby Service** - Persistent lobby data
- **Redis Lobby Service** - Real-time session management
- Session lifecycle management
- Participant tracking and notifications

### WebSocket Service

- Connection lifecycle management
- Message routing and broadcasting
- Real-time event handling
- Connection state management

## External Integrations

- **Firebase Auth** - User authentication
- **Notion API** - Task and productivity data
- **Google Cloud** - Infrastructure services
- **Redis** - Caching and real-time data

## Agent Notes

- Services contain business logic, not just data access
- Use dependency injection for database and external services
- Handle errors gracefully with proper logging
- Services should be testable with mock dependencies
- Keep services focused on specific business domains
- Use async/await for external API calls
- Implement proper retry logic for external services
- Cache frequently accessed data appropriately
- Follow single responsibility principle
