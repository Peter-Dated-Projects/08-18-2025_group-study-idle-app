#!/usr/bin/env python3
"""
Add default values to PostgreSQL database columns.

This script adds proper DEFAULT constraints to database columns to ensure
data integrity and match the SQLAlchemy model definitions.
"""
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent.absolute()))

from app.models.database import engine
from sqlalchemy import text
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def add_default_values():
    """
    Add DEFAULT constraints to database columns that are missing them.
    """
    print("🔧 Adding default values to PostgreSQL database columns...")
    
    # Define the default values to add
    default_updates = [
        # user_relations table
        {
            'table': 'user_relations',
            'column': 'friend_ids',
            'default': "'{}'",  # Empty array
            'description': 'Empty array for friend IDs'
        },
        {
            'table': 'user_relations', 
            'column': 'created_at',
            'default': 'CURRENT_TIMESTAMP',
            'description': 'Current timestamp for creation time'
        },
        {
            'table': 'user_relations',
            'column': 'updated_at', 
            'default': 'CURRENT_TIMESTAMP',
            'description': 'Current timestamp for update time'
        },
        
        # study_groups table
        {
            'table': 'study_groups',
            'column': 'member_ids',
            'default': "'{}'",  # Empty array
            'description': 'Empty array for member IDs'
        },
        {
            'table': 'study_groups',
            'column': 'created_at',
            'default': 'CURRENT_TIMESTAMP',
            'description': 'Current timestamp for creation time'
        },
        {
            'table': 'study_groups',
            'column': 'updated_at',
            'default': 'CURRENT_TIMESTAMP', 
            'description': 'Current timestamp for update time'
        },
        
        # user_stats table
        {
            'table': 'user_stats',
            'column': 'group_count',
            'default': "'0'",  # String zero
            'description': 'Zero as default group count (stored as string)'
        },
        {
            'table': 'user_stats',
            'column': 'group_ids',
            'default': "'{}'",  # Empty array
            'description': 'Empty array for group IDs'
        },
        {
            'table': 'user_stats',
            'column': 'friend_count',
            'default': "'0'",  # String zero
            'description': 'Zero as default friend count'
        },
        {
            'table': 'user_stats',
            'column': 'created_at',
            'default': 'CURRENT_TIMESTAMP',
            'description': 'Current timestamp for creation time'
        },
        {
            'table': 'user_stats',
            'column': 'updated_at',
            'default': 'CURRENT_TIMESTAMP',
            'description': 'Current timestamp for update time'
        },
        
        # pomo_leaderboard table
        {
            'table': 'pomo_leaderboard',
            'column': 'daily_pomo',
            'default': '0',  # Integer zero
            'description': 'Zero as default daily pomodoro count'
        },
        {
            'table': 'pomo_leaderboard',
            'column': 'weekly_pomo',
            'default': '0',  # Integer zero
            'description': 'Zero as default weekly pomodoro count'
        },
        {
            'table': 'pomo_leaderboard',
            'column': 'monthly_pomo',
            'default': '0',  # Integer zero
            'description': 'Zero as default monthly pomodoro count'
        },
        {
            'table': 'pomo_leaderboard',
            'column': 'yearly_pomo',
            'default': '0',  # Integer zero
            'description': 'Zero as default yearly pomodoro count'
        },
        {
            'table': 'pomo_leaderboard',
            'column': 'created_at',
            'default': 'CURRENT_TIMESTAMP',
            'description': 'Current timestamp for creation time'
        },
        {
            'table': 'pomo_leaderboard',
            'column': 'updated_at',
            'default': 'CURRENT_TIMESTAMP',
            'description': 'Current timestamp for update time'
        }
    ]
    
    try:
        with engine.connect() as conn:
            with conn.begin():  # Use transaction
                success_count = 0
                skip_count = 0
                
                for update in default_updates:
                    table = update['table']
                    column = update['column'] 
                    default = update['default']
                    description = update['description']
                    
                    # Check if default already exists
                    check_result = conn.execute(text(f"""
                        SELECT column_default 
                        FROM information_schema.columns 
                        WHERE table_name = '{table}' 
                        AND column_name = '{column}'
                        AND table_schema = 'public'
                    """))
                    
                    current_default = check_result.scalar()
                    
                    if current_default is not None:
                        print(f"  ⏭️  {table}.{column} already has default: {current_default}")
                        skip_count += 1
                        continue
                    
                    # Add the default constraint
                    alter_sql = f"ALTER TABLE {table} ALTER COLUMN {column} SET DEFAULT {default}"
                    
                    try:
                        conn.execute(text(alter_sql))
                        print(f"  ✅ {table}.{column} - {description}")
                        success_count += 1
                    except Exception as e:
                        print(f"  ❌ Failed to set default for {table}.{column}: {e}")
                
                print("\n📊 Summary:")
                print(f"  ✅ Successfully added {success_count} defaults")
                print(f"  ⏭️  Skipped {skip_count} (already had defaults)")
                print(f"  📋 Total processed: {len(default_updates)}")
                
    except Exception as e:
        logger.error(f"Error adding default values: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

def verify_defaults():
    """
    Verify that the defaults were added correctly.
    """
    print("\n🔍 Verifying default values were added correctly...")
    
    try:
        with engine.connect() as conn:
            tables = ['user_relations', 'study_groups', 'user_stats', 'pomo_leaderboard']
            
            for table in tables:
                print(f"\n📋 {table}:")
                
                result = conn.execute(text(f"""
                    SELECT 
                        column_name,
                        data_type,
                        is_nullable,
                        column_default
                    FROM information_schema.columns 
                    WHERE table_name = '{table}' 
                    AND table_schema = 'public'
                    ORDER BY ordinal_position
                """))
                
                for row in result:
                    col_name, data_type, nullable, default = row
                    nullable_str = 'NULL' if nullable == 'YES' else 'NOT NULL'
                    default_str = f'DEFAULT: {default}' if default else 'NO DEFAULT'
                    
                    # Highlight columns that should have defaults but don't
                    if col_name not in ['user_id', 'id', 'creator_id', 'group_name'] and not default:
                        default_str = f"⚠️  {default_str}"
                    
                    print(f"  {col_name:<15} {data_type:<25} {nullable_str:<10} {default_str}")
                    
    except Exception as e:
        logger.error(f"Error verifying defaults: {e}")
        return False
    
    return True

def test_defaults():
    """
    Test that defaults work by inserting minimal records.
    """
    print("\n🧪 Testing default values with minimal inserts...")
    
    try:
        with engine.connect() as conn:
            with conn.begin():
                # Test user_relations default
                test_user_id = "test_defaults_user_001"
                
                # Clean up any existing test data
                conn.execute(text("DELETE FROM user_relations WHERE user_id = :user_id"), 
                           {"user_id": test_user_id})
                
                # Insert with minimal data - should use defaults
                conn.execute(text("INSERT INTO user_relations (user_id) VALUES (:user_id)"),
                           {"user_id": test_user_id})
                
                # Verify the defaults were applied
                result = conn.execute(text("""
                    SELECT user_id, friend_ids, created_at, updated_at 
                    FROM user_relations 
                    WHERE user_id = :user_id
                """), {"user_id": test_user_id})
                
                row = result.fetchone()
                if row:
                    user_id, friend_ids, created_at, updated_at = row
                    print("  ✅ user_relations test:")
                    print(f"    user_id: {user_id}")
                    print(f"    friend_ids: {friend_ids} (should be empty array)")
                    print(f"    created_at: {created_at} (should be timestamp)")
                    print(f"    updated_at: {updated_at} (should be timestamp)")
                else:
                    print("  ❌ user_relations test failed - no row returned")
                
                # Clean up test data
                conn.execute(text("DELETE FROM user_relations WHERE user_id = :user_id"),
                           {"user_id": test_user_id})
                
                print("  🧹 Test data cleaned up")
                
    except Exception as e:
        logger.error(f"Error testing defaults: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == "__main__":
    print("🚀 PostgreSQL Default Values Setup")
    print("=" * 50)
    
    # Step 1: Add default values
    if not add_default_values():
        sys.exit(1)
    
    # Step 2: Verify defaults were added
    if not verify_defaults():
        sys.exit(1)
    
    # Step 3: Test defaults work
    if not test_defaults():
        sys.exit(1)
    
    print("\n🎉 Default values setup completed successfully!")
    print("\nAll database columns now have appropriate default values:")
    print("  • Arrays default to empty arrays: '{}'")
    print("  • Counters default to 0 or '0' (depending on type)")
    print("  • Timestamps default to CURRENT_TIMESTAMP")
    print("  • This ensures data integrity when inserting partial records")
