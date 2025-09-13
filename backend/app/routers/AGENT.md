# /backend/app/routers - API Route Handlers

## Purpose

FastAPI router modules organizing API endpoints by feature area. Each router handles HTTP requests for a specific domain.

## Router Files

- `health.py` - Health check and system status endpoints
- `friends.py` - Friend management API (add, remove, list friends)
- `groups.py` - Study group operations (create, join, leave, manage)
- `lobbies.py` - Real-time study session management
- `websockets.py` - WebSocket connection endpoints

## API Endpoints Structure

### Health (`/health`)

- System status and health checks
- Database connectivity verification

### Friends (`/friends`)

- `POST /add` - Add a friend by user ID
- `POST /remove` - Remove a friend
- `GET /list/{user_id}` - Get user's friends list

### Groups (`/groups`)

- `POST /create` - Create new study group
- `POST /join` - Join existing group
- `POST /leave` - Leave group
- `GET /user/{user_id}` - Get user's groups
- `GET /details/{group_id}` - Get group details

### Lobbies (`/lobbies`)

- Real-time study session management
- Session creation and joining
- Participant management

### WebSockets (`/ws`)

- Real-time communication channels
- Live session updates
- Notifications and messaging

## Agent Notes

- Each router should focus on one feature domain
- Use FastAPI dependency injection for database sessions
- Include proper request/response models (Pydantic)
- Add comprehensive error handling
- Document endpoints with FastAPI docstrings
- Use HTTP status codes appropriately
- Validate input data with Pydantic models
- Keep business logic in services, not routers
- Follow RESTful conventions for endpoint design
