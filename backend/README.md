# Group Study Idle App - Backend

FastAPI backend server for the group study idle game application.

## Features

- **Health Checking**: Standard health and readiness endpoints
- **Authentication**: Session-based authentication using cookies
- **Lobby Management**: API endpoints for creating and joining study lobbies
- **Redis Integration**: Redis utilities for caching and session management
- **PostgreSQL Integration**: Database utilities for Google Cloud SQL
- **CORS Support**: Configurable CORS for frontend integration

## API Endpoints

### Health Checks
- `GET /healthz` - Liveness probe
- `GET /ready` - Readiness probe (includes Redis and DB connectivity checks)

### Lobby Management
- `GET /api/hosting/create` - Create a new lobby (requires authentication)
- `GET /api/hosting/join?lobby_id=<id>` - Join an existing lobby (requires authentication)

## Authentication

The backend uses session-based authentication that integrates with the frontend's authentication system:

- User authentication is checked via `user_id` cookie
- Endpoints requiring authentication will return 401 if user is not logged in
- Authentication utilities are provided in `auth_utils.py`

## Setup

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Environment Configuration**:
   Copy `.env.example` to `.env` and configure your settings:
   ```bash
   cp .env.example .env
   ```

3. **Run Development Server**:
   ```bash
   python main.py
   ```
   Or using the run script:
   ```bash
   ./run.sh
   ```

## Environment Variables

### FastAPI Configuration
- `PORT` - Server port (default: 8080)
- `DEBUG` - Enable debug mode (default: true)
- `CORS_ORIGINS` - Allowed CORS origins (default: *)

### Redis Configuration
- `REDIS_HOST` - Redis host (default: localhost)
- `REDIS_PORT` - Redis port (default: 6379)
- `REDIS_PASSWORD` - Redis password (optional)
- `REDIS_DB` - Redis database number (default: 0)

### PostgreSQL Configuration
- `DB_HOST` - Database host
- `DB_PORT` - Database port (default: 5432)
- `DB_NAME` - Database name
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password

### Google Cloud SQL (Production)
- `USE_CLOUD_SQL_PROXY` - Use Cloud SQL proxy (default: false)
- `INSTANCE_CONNECTION_NAME` - Cloud SQL instance connection name
- `DB_SOCKET_DIR` - Cloud SQL socket directory (default: /cloudsql)

## Utilities

### Redis Utilities (`utils/redis_utils.py`)
- Connection management with automatic retry
- Key-value operations with JSON serialization
- Hash, set, and list operations
- Cache utilities with expiration support

### PostgreSQL Utilities (`utils/postgres_utils.py`)
- Connection pooling for performance
- Raw SQL query execution
- SQLAlchemy integration
- Transaction support
- Google Cloud SQL compatibility

## Development

### Running in Development Mode
```bash
DEBUG=true python main.py
```

### Running in Production Mode
```bash
DEBUG=false ./run.sh
```

The run script automatically chooses between uvicorn (development) and gunicorn (production) based on the DEBUG environment variable.

## Deployment

The application is designed to work with:
- Google Cloud Run
- Docker containers
- Traditional server deployments

For Cloud Run, the `PORT` environment variable is automatically set by the platform.
