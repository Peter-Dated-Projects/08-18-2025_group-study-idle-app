# Docker Container Management

This project includes a secure way to run Docker containers using environment variables from the `.env` file instead of hardcoding sensitive information in docker-compose files.

## Files

- `run_docker_containers.sh` - Main script to manage containers securely
- `docker-compose.env.yml` - Docker compose file that uses environment variables
- `docker-compose.local.yml` - Original docker compose file (kept for reference)

## Usage

### Quick Start

```bash
# Start all containers in background
./run_docker_containers.sh

# Start only PostgreSQL
./run_docker_containers.sh studygarden-psql

# Start only Redis
./run_docker_containers.sh studygarden-redis

# Stop all containers
./run_docker_containers.sh --down
```

### Available Options

```bash
# Show help
./run_docker_containers.sh --help

# Start containers in foreground (see logs)
./run_docker_containers.sh --no-detach

# Restart containers
./run_docker_containers.sh --restart

# View logs
./run_docker_containers.sh --logs

# Force recreate containers
./run_docker_containers.sh --force-recreate
```

### Environment Variables

The script automatically loads environment variables from:

1. `backend/config/.env` (preferred)
2. `config/.env`
3. `.env`

Required variables:

- `DB_NAME` - PostgreSQL database name
- `DB_USER` - PostgreSQL username
- `DB_PASSWORD` - PostgreSQL password
- `DB_PORT` - PostgreSQL port
- `REDIS_PORT` - Redis port

Optional variables:

- `REDIS_PASSWORD` - Redis password (defaults to empty)

## Security Benefits

- ✅ Sensitive information stays in `.env` files (which should be gitignored)
- ✅ No hardcoded passwords in docker-compose files
- ✅ Environment variables are validated before starting containers
- ✅ Script provides helpful error messages for missing variables

## Container Services

### PostgreSQL

- **Port**: Configured via `DB_PORT` (default: 5432)
- **Database**: Configured via `DB_NAME`
- **Credentials**: Configured via `DB_USER` and `DB_PASSWORD`

### Redis

- **Port**: Configured via `REDIS_PORT` (default: 6379)
- **Password**: Configured via `REDIS_PASSWORD` (optional)
- **RedisInsight UI**: http://localhost:8001

## Examples

```bash
# Development workflow
./run_docker_containers.sh                    # Start all services
# ... do development work ...
./run_docker_containers.sh --down            # Stop when done

# Debug database issues
./run_docker_containers.sh studygarden-psql  # Start only PostgreSQL
./run_docker_containers.sh --logs            # Check logs

# Reset everything
./run_docker_containers.sh --down
./run_docker_containers.sh --force-recreate  # Fresh containers
```
