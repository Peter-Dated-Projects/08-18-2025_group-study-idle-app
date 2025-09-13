# /backend/app - Main Application Code

## Purpose
Core FastAPI application with models, routers, services, and utilities organized in a clean architecture pattern.

## Structure
- `models/` - Database models and schemas
- `routers/` - API route handlers organized by feature
- `services/` - Business logic and external service integrations
- `utils/` - Database utilities and helper functions
- Root level files for authentication and WebSocket management

## Key Files
- `main.py` - FastAPI application setup and configuration
- `auth_utils.py` - Authentication and session management
- `websocket_manager.py` - WebSocket connection handling
- `gcp_utils.py` - Google Cloud Platform utilities

## Architecture Pattern
- **Models** - Data structures and database schemas
- **Routers** - HTTP endpoint handlers (controllers)
- **Services** - Business logic and external API integrations
- **Utils** - Shared utilities and database operations

## API Structure
All routes are organized by feature:
- `/health` - Health check endpoints
- `/friends` - Friend management
- `/groups` - Study group operations
- `/lobbies` - Real-time study sessions
- `/websockets` - WebSocket connections

## Agent Notes
- Import from relative paths within app structure
- Use dependency injection for database sessions
- Follow FastAPI patterns for request/response models
- Business logic belongs in services, not routers
- Database operations use utility functions from utils/
- WebSocket connections managed centrally
