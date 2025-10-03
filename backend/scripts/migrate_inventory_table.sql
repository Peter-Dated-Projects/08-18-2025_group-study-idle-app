-- Migration: Update user_structure_inventory table for new format
-- This script removes currently_in_use fields and converts to object format
-- Run with: psql -d your_database -f backend/scripts/migrate_inventory_table.sql

BEGIN;

-- Step 1: Show current state
SELECT 'Current table structure:' as info;
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_structure_inventory'
ORDER BY ordinal_position;

SELECT 'Current record count:' as info;
SELECT COUNT(*) as total_records FROM user_structure_inventory;

-- Step 2: Update table default value to use object format
SELECT 'Updating table default value...' as info;
ALTER TABLE user_structure_inventory 
ALTER COLUMN structure_inventory SET DEFAULT '{}'::jsonb;

-- Step 3: Clean up data - remove currently_in_use fields and convert to object format
SELECT 'Cleaning inventory data...' as info;

-- Create a temporary function to clean inventory data
CREATE OR REPLACE FUNCTION clean_inventory_data(inventory_json jsonb)
RETURNS jsonb AS $$
DECLARE
    result jsonb := '{}'::jsonb;
    item jsonb;
    structure_name text;
    count_val integer;
BEGIN
    -- Handle array format (old format)
    IF jsonb_typeof(inventory_json) = 'array' THEN
        FOR item IN SELECT * FROM jsonb_array_elements(inventory_json)
        LOOP
            IF item ? 'structure_name' AND item ? 'count' THEN
                structure_name := item->>'structure_name';
                count_val := COALESCE((item->>'count')::integer, 0);
                result := result || jsonb_build_object(structure_name, jsonb_build_object('count', count_val));
            END IF;
        END LOOP;
    -- Handle object format (new format) - just remove currently_in_use
    ELSIF jsonb_typeof(inventory_json) = 'object' THEN
        FOR structure_name IN SELECT * FROM jsonb_object_keys(inventory_json)
        LOOP
            IF jsonb_typeof(inventory_json->structure_name) = 'object' THEN
                count_val := COALESCE((inventory_json->structure_name->>'count')::integer, 0);
                result := result || jsonb_build_object(structure_name, jsonb_build_object('count', count_val));
            ELSIF jsonb_typeof(inventory_json->structure_name) = 'number' THEN
                count_val := COALESCE((inventory_json->>structure_name)::integer, 0);
                result := result || jsonb_build_object(structure_name, jsonb_build_object('count', count_val));
            END IF;
        END LOOP;
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Update all records to clean format
UPDATE user_structure_inventory 
SET structure_inventory = clean_inventory_data(structure_inventory),
    updated_at = CURRENT_TIMESTAMP;

-- Get update statistics
SELECT 'Update completed. Statistics:' as info;
SELECT COUNT(*) as total_records_updated FROM user_structure_inventory;

-- Step 4: Verify the changes
SELECT 'Verification - checking for array format (should be 0):' as info;
SELECT COUNT(*) as records_with_array_format 
FROM user_structure_inventory 
WHERE jsonb_typeof(structure_inventory) = 'array';

SELECT 'Verification - checking for currently_in_use fields (should be 0):' as info;
WITH expanded AS (
    SELECT user_id, structure_name, structure_data
    FROM user_structure_inventory,
    LATERAL jsonb_each(structure_inventory) AS j(structure_name, structure_data)
)
SELECT COUNT(*) as records_with_currently_in_use
FROM expanded 
WHERE structure_data ? 'currently_in_use';

-- Step 5: Show sample of cleaned data
SELECT 'Sample of cleaned data (first 3 records):' as info;
SELECT user_id, structure_inventory, updated_at
FROM user_structure_inventory
ORDER BY updated_at DESC
LIMIT 3;

-- Clean up temporary function
DROP FUNCTION clean_inventory_data(jsonb);

-- Show final table structure
SELECT 'Final table structure:' as info;
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_structure_inventory'
ORDER BY ordinal_position;

COMMIT;

-- Final success message
SELECT '✅ Migration completed successfully!' as result;
SELECT 'The user_structure_inventory table has been updated to:' as info;
SELECT '1. Use object format instead of array format' as change1;
SELECT '2. Remove all currently_in_use fields' as change2;
SELECT '3. Update default value to {}' as change3;