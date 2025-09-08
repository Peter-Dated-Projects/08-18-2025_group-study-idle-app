# Local Development Database Setup

This Docker Compose configuration sets up both Redis and PostgreSQL databases for local development of the Study Garden application.

## Services

### Redis (studygarden-redis)

- **Container Name**: `studygarden-redis`
- **Port**: `6379` (Redis)
- **Management UI**: `8001` (RedisInsight web interface)
- **Image**: `redis/redis-stack:7.2.0-v9` (includes RedisJSON support)
- **Data Persistence**: Volume mounted at `/data`

### PostgreSQL (studygarden-psql)

- **Container Name**: `studygarden-psql`
- **Port**: `5432`
- **Image**: `postgres:15`
- **Database**: `postgres`
- **Username**: `postgres`
- **Password**: [redacted]
- **Data Persistence**: Volume mounted at `/var/lib/postgresql/data`

## Usage

### Starting the Services

```bash
# Start both Redis and PostgreSQL
docker compose -f docker-compose.local.yml up -d

# Check service status
docker compose -f docker-compose.local.yml ps

# View logs
docker compose -f docker-compose.local.yml logs -f
```

### Stopping the Services

```bash
# Stop services (keeps data)
docker compose -f docker-compose.local.yml down

# Stop services and remove volumes (deletes all data)
docker compose -f docker-compose.local.yml down -v
```

### Connecting to Databases

#### Redis

```bash
# Connect with redis-cli
docker exec -it studygarden-redis redis-cli

# Or use the RedisInsight web UI at: http://localhost:8001
```

#### PostgreSQL

```bash
# Connect with psql
docker exec -it studygarden-psql psql -U postgres -d postgres

# Or connect from your application using:
# Host: localhost
# Port: 5432
# Database: postgres
# Username: postgres
# Password: =G|MY3v)5i~uGizu
```

## Health Checks

Both services include health checks:

- **Redis**: Responds to `PING` command
- **PostgreSQL**: Responds to `pg_isready` command

You can check health status with:

```bash
docker compose -f docker-compose.local.yml ps
```

## Monitoring

```bash
docker compose -f docker-compose.local.yml ps
```

## Environment Configuration

Make sure your backend configuration (`backend/config/.env`) points to these local databases:

```properties
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# PostgreSQL Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=[redacted]
```

## Network

Both services are connected via a custom bridge network called `studygarden`, allowing them to communicate with each other if needed.

## Data Persistence

- **Redis data**: Stored in `redis-data` Docker volume
- **PostgreSQL data**: Stored in `postgres-data` Docker volume

Data persists between container restarts unless you explicitly remove the volumes.
