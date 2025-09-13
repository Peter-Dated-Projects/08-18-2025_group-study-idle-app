# PostgreSQL to ArangoDB Migration Guide

This guide helps you migrate friends and groups data from PostgreSQL to ArangoDB using the provided migration script.

## Prerequisites

1. **Docker containers running**: Ensure both PostgreSQL and ArangoDB containers are running

   ```bash
   ./run_docker_containers.sh
   ```

2. **Python environment**: Activate the virtual environment

   ```bash
   source .venv/bin/activate
   ```

3. **Dependencies installed**: Ensure all required Python packages are installed
   ```bash
   pip install -r backend/requirements.txt
   ```

## Migration Script Usage

The migration script is located at `backend/scripts/migrate_psql_to_arangodb.py`.

### Basic Usage

```bash
cd backend
python scripts/migrate_psql_to_arangodb.py
```

### Options

- `--dry-run`: Preview what will be migrated without making changes
- `--clear-arango`: Clear existing ArangoDB data before migration
- `--verbose` or `-v`: Enable detailed logging

### Examples

**Preview migration (recommended first step):**

```bash
python scripts/migrate_psql_to_arangodb.py --dry-run --verbose
```

**Full migration with clearing existing data:**

```bash
python scripts/migrate_psql_to_arangodb.py --clear-arango
```

**Migration with verbose output:**

```bash
python scripts/migrate_psql_to_arangodb.py --verbose
```

## What Gets Migrated

### From PostgreSQL Tables:

1. **`user_relations` table** → ArangoDB collections:

   - **Users**: Creates user documents in `users` collection
   - **Friendships**: Creates bidirectional friendship edges in `friend_relations` collection

2. **`study_groups` table** → ArangoDB collections:
   - **Groups**: Creates group documents in `study_groups` collection
   - **Group Memberships**: Creates membership edges in `group_members` collection

### Data Transformation

- **User IDs**: Preserved as document keys in ArangoDB
- **Friend relationships**: Converted from PostgreSQL arrays to ArangoDB edges
- **Group memberships**: Converted from PostgreSQL arrays to ArangoDB edges with roles (creator/member)
- **Timestamps**: Converted to ISO format strings
- **Additional metadata**: Adds migration flags and role information

## ArangoDB Structure

After migration, you'll have:

### Collections:

- `users` - User documents
- `study_groups` - Group documents
- `friend_relations` - Friendship edges
- `group_members` - Group membership edges

### Graphs:

- `friends_graph` - User friendship relationships
- `groups_graph` - User-to-group memberships

## Verification

The script includes automatic validation that checks:

- Document counts match expected values
- All collections are created successfully
- Data integrity is maintained

## Troubleshooting

### Common Issues:

1. **Connection errors**: Ensure Docker containers are running

   ```bash
   docker ps | grep studygarden
   ```

2. **Import errors**: Check that virtual environment is activated and dependencies are installed

3. **Permission errors**: Ensure ArangoDB is accessible (default: `http://localhost:8529`)

4. **Data conflicts**: Use `--clear-arango` to remove existing data before migration

### Checking Container Status:

```bash
# PostgreSQL
docker exec -it studygarden-psql psql -U postgres -d postgres -c "SELECT COUNT(*) FROM user_relations;"

# ArangoDB
docker exec -it studygarden-arangodb arangosh --server.password=your_password
```

## Recovery

If migration fails partway through:

1. Use `--clear-arango` to clean up partial data
2. Check logs for specific error messages
3. Fix any configuration issues
4. Re-run the migration

## Post-Migration

After successful migration:

1. Update your application to use ArangoDB instead of PostgreSQL for social features
2. Test the friends and groups functionality
3. Consider archiving the PostgreSQL social data tables if no longer needed

## Security Notes

- The script handles database connections securely using environment variables
- No hardcoded credentials are included
- Migration preserves all original timestamp and relationship data
