# /backend/config - Environment Configuration

## Purpose

Environment configuration files, Docker setup, and deployment configuration for different environments.

## Key Files

- `.env` - Environment variables for database, API keys, and configuration
- `Dockerfile` - Container configuration for deployment

## Environment Variables (.env)

Critical configuration for:

- **Database Connection** - PostgreSQL credentials and connection strings
- **Redis Configuration** - Redis host, port, and authentication
- **API Keys** - External service credentials (Notion, Firebase, Google Cloud)
- **Application Settings** - Debug mode, logging levels, CORS settings

## Database Configuration

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `DATABASE_URL` - Complete connection string
- `INSTANCE_CONNECTION_NAME` - Google Cloud SQL instance
- `USE_CLOUD_SQL_PROXY` - Connection method flag

## External Services

- **Notion API** - Integration credentials and endpoints
- **Firebase** - Authentication service configuration
- **Google Cloud** - Service account and project settings
- **Redis** - Caching and session storage settings

## Docker Configuration

- Multi-stage build for production
- Environment variable injection
- Health checks and monitoring
- Port configuration and networking

## Agent Notes

- **Never commit .env files** - Use .env.example for templates
- Use environment variables for all sensitive configuration
- Different .env files for development/staging/production
- Validate required environment variables on startup
- Use secure defaults where possible
- Document all environment variables with examples
- Test configuration changes in isolated environments
