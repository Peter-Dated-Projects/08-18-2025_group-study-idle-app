# Database Migration: Update user_structure_inventory Table

This migration updates the `user_structure_inventory` table to match the current application setup by removing the `currently_in_use` field and standardizing the data format.

## What This Migration Does

1. **Removes `currently_in_use` fields** from all inventory records
2. **Converts array format to object format** for consistency
3. **Updates table default value** from `'[]'::jsonb` to `'{}'::jsonb`
4. **Cleans up existing data** to match the new format

## Before Running

**⚠️ Important: Backup your database before running this migration!**

```bash
# Create a backup
pg_dump -h your_host -U your_user -d your_database > backup_before_inventory_migration.sql
```

## Migration Options

### Option 1: Python Script (Recommended)

```bash
# From the project root directory
cd /path/to/your/project

# Show current table info
python backend/scripts/update_inventory_table.py --info-only

# Dry run (see what would change)
python backend/scripts/update_inventory_table.py --dry-run

# Run the migration
python backend/scripts/update_inventory_table.py

# Verify the changes
python backend/scripts/update_inventory_table.py --verify-only
```

### Option 2: Direct SQL Script

```bash
# Connect to your database and run the SQL migration
psql -h your_host -U your_user -d your_database -f backend/scripts/migrate_inventory_table.sql
```

## Data Format Changes

### Before (Old Format)

```json
// Array format with currently_in_use
[
  {
    "structure_name": "Library",
    "count": 5,
    "currently_in_use": 2
  },
  {
    "structure_name": "Dorm",
    "count": 3,
    "currently_in_use": 1
  }
]
```

### After (New Format)

```json
// Object format without currently_in_use
{
  "Library": {
    "count": 5
  },
  "Dorm": {
    "count": 3
  }
}
```

## How `currently_in_use` Works Now

Instead of storing `currently_in_use` in the database, the application now calculates it dynamically by:

1. **Reading the user's level config** (which structures are placed where)
2. **Counting structure usage** in real-time from the 7 plot slots
3. **Displaying the calculated value** in the UI

This approach provides:

- ✅ **Better data integrity** (single source of truth)
- ✅ **Real-time accuracy** (no sync issues)
- ✅ **Simplified database** (less redundant data)

## Verification

After running the migration, verify that:

1. **All records use object format**: No arrays should remain
2. **No `currently_in_use` fields**: All should be removed
3. **Table default updated**: New records will use `{}` instead of `[]`
4. **Data preserved**: All structure counts should be maintained

```sql
-- Check format (should return 0)
SELECT COUNT(*) FROM user_structure_inventory
WHERE jsonb_typeof(structure_inventory) = 'array';

-- Check for currently_in_use fields (should return 0)
WITH expanded AS (
    SELECT structure_data
    FROM user_structure_inventory,
    LATERAL jsonb_each(structure_inventory) AS j(structure_name, structure_data)
)
SELECT COUNT(*) FROM expanded WHERE structure_data ? 'currently_in_use';
```

## Rollback Plan

If you need to rollback:

1. **Restore from backup**:

   ```bash
   psql -h your_host -U your_user -d your_database < backup_before_inventory_migration.sql
   ```

2. **Revert application code** to use the old selector:
   ```typescript
   // Use the old selector instead of enhanced one
   const inventory = useSelector(selectStructureInventory);
   ```

## Notes

- The migration is **safe and reversible**
- **Application will work** with both old and new formats during transition
- **Frontend calculates** `currently_in_use` automatically from level config
- **No API changes** - the inventory endpoints remain the same
