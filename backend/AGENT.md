# /backend - FastAPI Backend Server

## Purpose

FastAPI-based backend server providing REST APIs and WebSocket connections for the study garden application. Handles authentication, user data, group management, real-time features, and external service integrations.

## Architecture

- **FastAPI** - Modern Python web framework with automatic API documentation
- **PostgreSQL** - Primary database for persistent data
- **Redis** - Caching and real-time session management
- **WebSocket** - Real-time communication for study sessions
- **SQLAlchemy** - ORM for database operations
- **Google Cloud SQL** - Production database hosting

## Key Directories

- `app/` - Main application code (models, routers, services)
- `config/` - Environment configuration and Docker setup
- `scripts/` - Database utilities, migrations, and maintenance
- `tests/` - Unit and integration tests
- `docs/` - API and deployment documentation

## Environment Setup

- Requires `.env` file in `config/` directory
- Supports local PostgreSQL and Google Cloud SQL
- Redis for session management and real-time features
- Environment variables for external API keys (Notion, Firebase)

## Running the Server

```bash
python run_server.py  # Development server
DEBUG=true python run_server.py  # Debug mode
```

## Agent Notes

- Follow FastAPI patterns for new endpoints
- Use SQLAlchemy models for database operations
- WebSocket endpoints handle real-time features
- Authentication via session cookies
- All database operations should use the connection utilities
- API documentation auto-generated at `/docs` endpoint
