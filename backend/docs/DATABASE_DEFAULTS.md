# PostgreSQL Database Default Values

This document describes the default values system implemented for the PostgreSQL database to ensure data integrity and consistency.

## Overview

The database now has comprehensive default values for all columns that should have defaults. This ensures:

- **Data Integrity**: No missing or NULL values in critical columns
- **Consistent Behavior**: All new records automatically get appropriate default values
- **Reduced Errors**: Insertions with partial data will still succeed with sensible defaults

## Default Values by Table

### user_relations
| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `friend_ids` | ARRAY | `'{}'` | Empty array of friend user IDs |
| `created_at` | TIMESTAMP | `CURRENT_TIMESTAMP` | Record creation time |
| `updated_at` | TIMESTAMP | `CURRENT_TIMESTAMP` | Record last update time |

### study_groups
| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `member_ids` | ARRAY | `'{}'` | Empty array of member user IDs |
| `created_at` | TIMESTAMP | `CURRENT_TIMESTAMP` | Group creation time |
| `updated_at` | TIMESTAMP | `CURRENT_TIMESTAMP` | Group last update time |

### user_stats
| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `group_count` | VARCHAR | `'0'` | Number of groups user belongs to (as string) |
| `group_ids` | ARRAY | `'{}'` | Empty array of group IDs user is member of |
| `friend_count` | VARCHAR | `'0'` | Number of friends user has (as string) |
| `created_at` | TIMESTAMP | `CURRENT_TIMESTAMP` | Record creation time |
| `updated_at` | TIMESTAMP | `CURRENT_TIMESTAMP` | Record last update time |

### pomo_leaderboard
| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `daily_pomo` | INTEGER | `0` | Daily pomodoro count |
| `weekly_pomo` | INTEGER | `0` | Weekly pomodoro count |
| `monthly_pomo` | INTEGER | `0` | Monthly pomodoro count |
| `yearly_pomo` | INTEGER | `0` | Yearly pomodoro count |
| `created_at` | TIMESTAMP | `CURRENT_TIMESTAMP` | Record creation time |
| `updated_at` | TIMESTAMP | `CURRENT_TIMESTAMP` | Record last update time |

## Implementation Scripts

### 1. add_database_defaults.py
**Purpose**: Adds DEFAULT constraints to PostgreSQL database columns

**Features**:
- Adds proper DEFAULT values to all columns missing them
- Verifies defaults were added correctly
- Tests defaults work with minimal inserts
- Safe to run multiple times (skips existing defaults)

**Usage**:
```bash
cd backend
python scripts/add_database_defaults.py
```

### 2. fix_null_values.py
**Purpose**: Updates existing NULL values and ensures user data completeness

**Features**:
- Updates any existing NULL values with appropriate defaults
- Ensures all users have records in all required tables
- Verifies data integrity after cleanup
- Creates missing user records with default values

**Usage**:
```bash
cd backend
python scripts/fix_null_values.py
```

## Benefits

### 1. Data Integrity
- **No More NULLs**: Critical columns can't have NULL values
- **Consistent State**: All records have predictable structure
- **Safe Inserts**: Partial data inserts automatically get sensible defaults

### 2. Application Reliability
- **Reduced Errors**: No more "unexpected NULL" runtime errors
- **Predictable Behavior**: Application can rely on data structure
- **Backward Compatibility**: Existing code continues to work

### 3. Development Efficiency
- **Less Validation**: Frontend doesn't need to handle NULL cases
- **Simplified Logic**: Business logic can assume data completeness
- **Easier Testing**: Test data automatically has realistic structure

## Example Usage

### Before (Manual Default Handling)
```python
# Had to manually handle defaults
user_data = {
    "user_id": "123",
    "friend_ids": friend_ids or [],  # Manual default
    "created_at": datetime.utcnow()   # Manual timestamp
}
```

### After (Automatic Defaults)
```python
# Database handles defaults automatically
user_data = {
    "user_id": "123"
    # friend_ids gets empty array automatically
    # created_at gets current timestamp automatically
}
```

### Inserting with Minimal Data
```sql
-- This now works and gets all appropriate defaults
INSERT INTO user_relations (user_id) VALUES ('new_user_123');

-- Results in:
-- user_id: 'new_user_123'
-- friend_ids: {}  (empty array)
-- created_at: 2025-09-13 18:26:24.714459
-- updated_at: 2025-09-13 18:26:24.714459
```

## Maintenance

### Regular Checks
Run these commands periodically to ensure data integrity:

```bash
# Check for any NULL values
cd backend
python -c "
from app.models.database import engine
from sqlalchemy import text
with engine.connect() as conn:
    result = conn.execute(text('SELECT COUNT(*) FROM user_relations WHERE friend_ids IS NULL'))
    print(f'NULL friend_ids: {result.scalar()}')
"
```

### Adding New Columns
When adding new columns to existing tables:

1. **Define in SQLAlchemy Model**: Add default in the Column definition
2. **Add Database Default**: Use ALTER TABLE to add PostgreSQL default
3. **Update Existing Data**: Set appropriate values for existing records

Example:
```sql
-- Add new column with default
ALTER TABLE user_stats ADD COLUMN new_field INTEGER DEFAULT 0;

-- Update existing records if needed
UPDATE user_stats SET new_field = 0 WHERE new_field IS NULL;
```

## Monitoring

### Health Check Script
```python
# Check if defaults are working
from app.models.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    # Test inserting minimal record
    conn.execute(text("INSERT INTO user_relations (user_id) VALUES ('test_123')"))
    
    # Verify defaults applied
    result = conn.execute(text("""
        SELECT friend_ids, created_at 
        FROM user_relations 
        WHERE user_id = 'test_123'
    """))
    
    row = result.fetchone()
    print(f"Defaults working: friend_ids={row[0]}, created_at={row[1]}")
    
    # Cleanup
    conn.execute(text("DELETE FROM user_relations WHERE user_id = 'test_123'"))
```

## Troubleshooting

### Common Issues

1. **"Column doesn't have default"**: Run `add_database_defaults.py`
2. **"Unexpected NULL values"**: Run `fix_null_values.py`
3. **"Missing user records"**: Use user completeness check in `fix_null_values.py`

### Verification Commands
```bash
# Check current defaults
psql -d your_database -c "
SELECT table_name, column_name, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND column_default IS NOT NULL
ORDER BY table_name, column_name;
"

# Check for NULL values
psql -d your_database -c "
SELECT 'user_relations' as table, COUNT(*) as nulls FROM user_relations WHERE friend_ids IS NULL
UNION ALL
SELECT 'pomo_leaderboard', COUNT(*) FROM pomo_leaderboard WHERE daily_pomo IS NULL;
"
```

## Future Considerations

1. **Auto-Migration**: Consider adding default value setup to database migration scripts
2. **Validation Layer**: Add application-level validation to double-check defaults
3. **Monitoring**: Set up alerts for any NULL values in production
4. **Documentation**: Keep this document updated when adding new tables/columns

---

*Last Updated: September 13, 2025*
*Database Version: PostgreSQL with comprehensive defaults*
