# /backend/app/models - Database Models and Schemas

## Purpose
SQLAlchemy database models defining the application's data structure and relationships.

## Key Files
- `database.py` - Database configuration, connection setup, and table definitions

## Database Schema
Current tables and their purposes:
- **User sessions** - Authentication and session management
- **Friends** - User friendship relationships
- **Groups** - Study group data and memberships
- **User statistics** - Performance metrics and achievements

## Database Configuration
- **SQLAlchemy ORM** - Object-relational mapping
- **PostgreSQL** - Primary database engine
- **Connection pooling** - Efficient database connections
- **Multiple environments** - Local, Docker, Google Cloud SQL

## Connection Methods
1. **Local PostgreSQL** - Direct connection to local database
2. **Cloud SQL Proxy** - Secure connection to Google Cloud SQL
3. **Direct Cloud SQL** - Production connection with SSL
4. **Docker** - Containerized database for development

## Agent Notes
- All database tables should be defined in `database.py`
- Use SQLAlchemy declarative base for model definitions
- Follow naming conventions: lowercase with underscores
- Include proper indexes for performance
- Add relationships between related tables
- Use appropriate data types for columns
- Consider adding created_at/updated_at timestamps
- Test database connections before deploying changes
