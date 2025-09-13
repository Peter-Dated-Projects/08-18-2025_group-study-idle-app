# /backend/scripts - Database and Maintenance Scripts

## Purpose
Utility scripts for database management, data migration, backup operations, and system maintenance tasks.

## Script Categories

### Database Management
- `backup_database.py` - Database backup and restore operations
- `migrate_lobbies.py` - Data migration from PostgreSQL to Redis

### Service Backups
- `backup_lobby_service.py` - PostgreSQL lobby service backup
- `backup_lobby_service_redis.py` - Redis lobby service backup

### Utility Scripts
- `main.py` - Main script runner and utilities
- `run.sh` - Shell script for common operations
- `start-proxy.sh` - Cloud SQL proxy startup

### Backup Components
- `backup_routers/` - Backup copies of router implementations
- `backup_utils/` - Backup copies of utility functions

## Key Operations

### Data Migration
- **lobby migration** - Moving lobby data from PostgreSQL to Redis
- **Schema updates** - Database schema version management
- **Data validation** - Ensuring data integrity during migrations

### Backup and Recovery
- **Database snapshots** - Full database backup procedures
- **Service state backup** - Preserving service configurations
- **Restore procedures** - Recovery from backup data

### Maintenance Tasks
- **Data cleanup** - Removing stale or invalid data
- **Performance optimization** - Database query optimization
- **Health monitoring** - System health checks and reporting

## Agent Notes
- **Test scripts in development** before running in production
- Use transaction safety for data migration scripts
- Include rollback procedures for migrations
- Log all script operations for audit trails
- Validate data integrity before and after operations
- Use environment variables for configuration
- Include dry-run modes for testing
- Document script parameters and usage examples
