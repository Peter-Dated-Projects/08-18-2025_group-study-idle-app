#!/usr/bin/env python3
"""
Update existing NULL values with appropriate defaults.

This script finds any existing NULL values in the database and updates them
with appropriate default values to ensure data consistency.
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

def update_null_values():
    """
    Update any existing NULL values with appropriate defaults.
    """
    print("🔧 Updating existing NULL values with appropriate defaults...")
    
    # Define NULL value updates
    null_updates = [
        # user_relations table
        {
            'table': 'user_relations',
            'column': 'friend_ids',
            'default_value': "'{}'",
            'condition': 'friend_ids IS NULL',
            'description': 'Set empty array for NULL friend_ids'
        },
        
        # study_groups table  
        {
            'table': 'study_groups',
            'column': 'member_ids', 
            'default_value': "'{}'",
            'condition': 'member_ids IS NULL',
            'description': 'Set empty array for NULL member_ids'
        },
        
        # user_stats table
        {
            'table': 'user_stats',
            'column': 'group_count',
            'default_value': "'0'",
            'condition': 'group_count IS NULL',
            'description': 'Set zero for NULL group_count'
        },
        {
            'table': 'user_stats',
            'column': 'group_ids',
            'default_value': "'{}'", 
            'condition': 'group_ids IS NULL',
            'description': 'Set empty array for NULL group_ids'
        },
        {
            'table': 'user_stats',
            'column': 'friend_count',
            'default_value': "'0'",
            'condition': 'friend_count IS NULL', 
            'description': 'Set zero for NULL friend_count'
        },
        
        # pomo_leaderboard table
        {
            'table': 'pomo_leaderboard',
            'column': 'daily_pomo',
            'default_value': '0',
            'condition': 'daily_pomo IS NULL',
            'description': 'Set zero for NULL daily_pomo'
        },
        {
            'table': 'pomo_leaderboard',
            'column': 'weekly_pomo',
            'default_value': '0',
            'condition': 'weekly_pomo IS NULL',
            'description': 'Set zero for NULL weekly_pomo'
        },
        {
            'table': 'pomo_leaderboard',
            'column': 'monthly_pomo',
            'default_value': '0',
            'condition': 'monthly_pomo IS NULL',
            'description': 'Set zero for NULL monthly_pomo'
        },
        {
            'table': 'pomo_leaderboard',
            'column': 'yearly_pomo',
            'default_value': '0',
            'condition': 'yearly_pomo IS NULL',
            'description': 'Set zero for NULL yearly_pomo'
        }
    ]
    
    try:
        with engine.connect() as conn:
            with conn.begin():  # Use transaction
                total_updates = 0
                
                for update in null_updates:
                    table = update['table']
                    column = update['column']
                    default_value = update['default_value']
                    condition = update['condition']
                    description = update['description']
                    
                    # Check how many NULL values exist
                    count_result = conn.execute(text(f"SELECT COUNT(*) FROM {table} WHERE {condition}"))
                    null_count = count_result.scalar()
                    
                    if null_count == 0:
                        print(f"  ⏭️  {table}.{column}: No NULL values to update")
                        continue
                    
                    # Update NULL values
                    update_sql = f"UPDATE {table} SET {column} = {default_value} WHERE {condition}"
                    
                    try:
                        result = conn.execute(text(update_sql))
                        updated_count = result.rowcount
                        print(f"  ✅ {table}.{column}: Updated {updated_count} NULL values - {description}")
                        total_updates += updated_count
                    except Exception as e:
                        print(f"  ❌ Failed to update {table}.{column}: {e}")
                
                print(f"\n📊 Total NULL values updated: {total_updates}")
                
    except Exception as e:
        logger.error(f"Error updating NULL values: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

def ensure_user_completeness():
    """
    Ensure all users have complete records across all tables.
    This creates missing records with default values for users who might
    be missing entries in some tables.
    """
    print("\n🔍 Ensuring all users have complete records across tables...")
    
    try:
        with engine.connect() as conn:
            with conn.begin():
                # Get all unique user IDs from all tables
                all_users = set()
                
                # Get users from each table
                tables_with_users = ['user_relations', 'user_stats', 'pomo_leaderboard']
                
                for table in tables_with_users:
                    result = conn.execute(text(f"SELECT DISTINCT user_id FROM {table}"))
                    table_users = {row[0] for row in result}
                    all_users.update(table_users)
                    print(f"  📋 {table}: {len(table_users)} unique users")
                
                print(f"  📊 Total unique users found: {len(all_users)}")
                
                if not all_users:
                    print("  ℹ️  No users found in database")
                    return True
                
                # Ensure each user has records in all tables
                for user_id in all_users:
                    # Check user_relations
                    result = conn.execute(text("SELECT COUNT(*) FROM user_relations WHERE user_id = :user_id"), 
                                        {"user_id": user_id})
                    if result.scalar() == 0:
                        conn.execute(text("INSERT INTO user_relations (user_id) VALUES (:user_id)"), 
                                   {"user_id": user_id})
                        print(f"    ✅ Created user_relations record for {user_id}")
                    
                    # Check user_stats
                    result = conn.execute(text("SELECT COUNT(*) FROM user_stats WHERE user_id = :user_id"),
                                        {"user_id": user_id})
                    if result.scalar() == 0:
                        conn.execute(text("INSERT INTO user_stats (user_id) VALUES (:user_id)"),
                                   {"user_id": user_id})
                        print(f"    ✅ Created user_stats record for {user_id}")
                    
                    # Check pomo_leaderboard
                    result = conn.execute(text("SELECT COUNT(*) FROM pomo_leaderboard WHERE user_id = :user_id"),
                                        {"user_id": user_id})
                    if result.scalar() == 0:
                        conn.execute(text("INSERT INTO pomo_leaderboard (user_id) VALUES (:user_id)"),
                                   {"user_id": user_id})
                        print(f"    ✅ Created pomo_leaderboard record for {user_id}")
                
    except Exception as e:
        logger.error(f"Error ensuring user completeness: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

def verify_data_integrity():
    """
    Verify that all data now has proper values and no NULLs exist.
    """
    print("\n🔍 Verifying data integrity after updates...")
    
    try:
        with engine.connect() as conn:
            tables_to_check = {
                'user_relations': ['friend_ids'],
                'study_groups': ['member_ids'], 
                'user_stats': ['group_count', 'group_ids', 'friend_count'],
                'pomo_leaderboard': ['daily_pomo', 'weekly_pomo', 'monthly_pomo', 'yearly_pomo']
            }
            
            all_clean = True
            
            for table, columns in tables_to_check.items():
                print(f"\n📋 {table}:")
                
                # Get total count
                total_result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                total_count = total_result.scalar()
                print(f"    📊 Total records: {total_count}")
                
                for column in columns:
                    # Check for NULLs
                    null_result = conn.execute(text(f"SELECT COUNT(*) FROM {table} WHERE {column} IS NULL"))
                    null_count = null_result.scalar()
                    
                    if null_count > 0:
                        print(f"    ❌ {column}: {null_count} NULL values still exist!")
                        all_clean = False
                    else:
                        print(f"    ✅ {column}: No NULL values")
            
            if all_clean:
                print("\n🎉 All tables are clean - no NULL values in critical columns!")
            else:
                print("\n⚠️  Some NULL values still exist - manual investigation may be needed")
            
            return all_clean
            
    except Exception as e:
        logger.error(f"Error verifying data integrity: {e}")
        return False

if __name__ == "__main__":
    print("🚀 PostgreSQL Data Cleanup - NULL Value Updates")
    print("=" * 55)
    
    # Step 1: Update existing NULL values
    if not update_null_values():
        sys.exit(1)
    
    # Step 2: Ensure all users have complete records
    if not ensure_user_completeness():
        sys.exit(1)
    
    # Step 3: Verify data integrity
    if not verify_data_integrity():
        sys.exit(1)
    
    print("\n🎉 Data cleanup completed successfully!")
    print("\nAll existing NULL values have been updated with appropriate defaults:")
    print("  • Empty arrays for list fields")
    print("  • Zero values for counters")
    print("  • Complete user records across all tables")
    print("  • Data integrity verified")
