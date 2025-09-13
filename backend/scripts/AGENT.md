# /backend/sc- **migrate_psql_db.py** - Migrates existing users to new database tables with default data

- **remove_pomo_count_migration.py** - Removes pomo_count from UserStats and migrates to PomoLeaderboardipts - Database and Maintenance Scripts

## Purpose

Utility scripts for database management, data migration, backup operations, and system maintenance tasks.

## Script Categories

### Database Management

- `backup_database.py` - Database backup and restore operations
- `migrate_lobbies.py` - Data migration from PostgreSQL to Redis
- `create_pomo_leaderboard.py` - Creates the pomo_leaderboard table in PostgreSQL
- `migrate_psql_db.py` - Migrates existing users to new database tables with default data

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
- **User table migration** - Populating new tables (like pomo_leaderboard) with default data for existing users
- **Column removal** - Safely removing deprecated columns (like pomo_count) after migrating data
- **Data validation** - Ensuring data integrity during migrations

### Table Management

- **Table creation** - Creating new database tables with proper schema
- **User data population** - Adding default entries for existing users in new tables
- **Migration verification** - Status checking and data validation after migrations

### Backup and Recovery

- **Database snapshots** - Full database backup procedures
- **Service state backup** - Preserving service configurations
- **Restore procedures** - Recovery from backup data

### Maintenance Tasks

- **Data cleanup** - Removing stale or invalid data
- **Performance optimization** - Database query optimization
- **Health monitoring** - System health checks and reporting

## Agent Notes

### Database Migration Best Practices

- Use `migrate_psql_db.py --status` to check current database state before making changes
- Always test migrations with `--dry-run` flag before executing
- Migration scripts automatically discover existing users across all tables
- Support for migrating existing data (e.g., pomo_count) to new table structures

### Common Migration Commands

```bash
# Check current migration status
python scripts/migrate_psql_db.py --status

# Test migration (dry run)
python scripts/migrate_psql_db.py --dry-run

# Execute migration
python scripts/migrate_psql_db.py

# Create specific tables
python scripts/create_pomo_leaderboard.py

# Create all database tables
python scripts/create_pomo_leaderboard.py --all

# Remove deprecated columns after migration
python scripts/remove_pomo_count_migration.py --dry-run
python scripts/remove_pomo_count_migration.py

# Verify migration results
python scripts/remove_pomo_count_migration.py --verify-only
```

### Database Tools Usage

- Use the configured Python virtual environment for all database scripts
- Scripts include detailed logging and error handling
- Verification steps built into migration processes
- Safe rollback on migration errors

- **Test scripts in development** before running in production
- Use transaction safety for data migration scripts
- Include rollback procedures for migrations
- Log all script operations for audit trails
- Validate data integrity before and after operations
- Use environment variables for configuration
- Include dry-run modes for testing
- Document script parameters and usage examples
