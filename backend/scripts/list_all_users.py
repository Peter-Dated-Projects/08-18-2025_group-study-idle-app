"""
Script to list all users in the ArangoDB users collection.
Displays user information in a formatted table for easy viewing.
"""
import logging
import sys
import json
from pathlib import Path
from datetime import datetime

# Add the project root to the python path to allow for absolute imports
sys.path.append(str(Path(__file__).parent.parent))

from app.utils.arangodb_utils import (
    get_db, 
    get_arango_client,
    USERS_COLLECTION,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def format_value(value, max_length=30):
    """Format a value for display, truncating if too long."""
    if value is None:
        return "None"
    
    str_value = str(value)
    if len(str_value) > max_length:
        return str_value[:max_length-3] + "..."
    return str_value

def print_users_table(users):
    """Print users in a formatted table."""
    if not users:
        print("No users found in the database.")
        return
    
    # Define column headers and widths
    headers = [
        ("User ID", 20),
        ("Display Name", 20), 
        ("Email", 25),
        ("Is Paid", 8),
        ("Provider", 12),
        ("Created At", 20),
        ("Picture URL", 15)
    ]
    
    # Print header
    print("\n" + "=" * 140)
    print("ArangoDB Users Collection")
    print("=" * 140)
    
    header_row = ""
    separator_row = ""
    for header, width in headers:
        header_row += f"{header:<{width}} | "
        separator_row += "-" * width + "-+-"
    
    print(header_row.rstrip(" | "))
    print(separator_row.rstrip("-+-"))
    
    # Print user data
    for user in users:
        row = ""
        row += f"{format_value(user.get('user_id'), 19):<20} | "
        row += f"{format_value(user.get('display_name'), 19):<20} | "
        row += f"{format_value(user.get('email'), 24):<25} | "
        row += f"{format_value(user.get('is_paid'), 7):<8} | "
        row += f"{format_value(user.get('provider'), 11):<12} | "
        row += f"{format_value(user.get('created_at'), 19):<20} | "
        row += f"{format_value(user.get('user_picture_url'), 14):<15}"
        
        print(row)
    
    print("=" * 140)
    print(f"Total users: {len(users)}")

def print_users_json(users):
    """Print users in JSON format."""
    print("\n" + "=" * 60)
    print("ArangoDB Users Collection (JSON Format)")
    print("=" * 60)
    
    for i, user in enumerate(users, 1):
        print(f"\n--- User {i} ---")
        print(json.dumps(user, indent=2, default=str))
    
    print(f"\nTotal users: {len(users)}")

def get_users_statistics():
    """Get statistics about the users collection."""
    try:
        db = get_db()
        
        # Total users
        total_query = f"FOR user IN {USERS_COLLECTION} COLLECT WITH COUNT INTO length RETURN length"
        total_users = list(db.aql.execute(total_query))[0]
        
        # Users with is_paid field
        is_paid_stats_query = f"""
        FOR user IN {USERS_COLLECTION}
        COLLECT 
            has_is_paid = HAS(user, 'is_paid'),
            is_paid_value = (HAS(user, 'is_paid') ? user.is_paid : null)
        WITH COUNT INTO count
        RETURN {{
            has_is_paid: has_is_paid,
            is_paid_value: is_paid_value,
            count: count
        }}
        """
        
        is_paid_stats = list(db.aql.execute(is_paid_stats_query))
        
        # Provider statistics
        provider_stats_query = f"""
        FOR user IN {USERS_COLLECTION}
        COLLECT provider = user.provider WITH COUNT INTO count
        RETURN {{ provider: provider, count: count }}
        """
        
        provider_stats = list(db.aql.execute(provider_stats_query))
        
        print("\n" + "=" * 60)
        print("Users Collection Statistics")
        print("=" * 60)
        print(f"Total users: {total_users}")
        
        print("\nis_paid field statistics:")
        for stat in is_paid_stats:
            has_field = stat['has_is_paid']
            value = stat['is_paid_value']
            count = stat['count']
            
            if has_field:
                print(f"  Users with is_paid={value}: {count}")
            else:
                print(f"  Users WITHOUT is_paid field: {count}")
        
        print("\nProvider statistics:")
        for stat in provider_stats:
            provider = stat['provider'] or 'None'
            count = stat['count']
            print(f"  {provider}: {count} users")
        
        return {
            'total': total_users,
            'is_paid_stats': is_paid_stats,
            'provider_stats': provider_stats
        }
        
    except Exception as e:
        logger.error(f"Error getting statistics: {e}")
        return None

def list_all_users(output_format='table', limit=None):
    """
    List all users from ArangoDB users collection.
    
    Args:
        output_format: 'table' or 'json'
        limit: Maximum number of users to display (None for all)
    """
    try:
        logger.info("Connecting to ArangoDB...")
        db = get_db()
        client = get_arango_client()
        
        if not db:
            logger.error("Failed to connect to ArangoDB")
            return False
        
        logger.info(f"Connected to ArangoDB database: {client.arango_db_name}")
        
        # Build query
        query = f"FOR user IN {USERS_COLLECTION} SORT user._key RETURN user"
        if limit:
            query = f"FOR user IN {USERS_COLLECTION} SORT user._key LIMIT {limit} RETURN user"
        
        logger.info("Fetching users...")
        cursor = db.aql.execute(query)
        users = list(cursor)
        
        if not users:
            print("No users found in the database.")
            return True
        
        # Display users
        if output_format == 'json':
            print_users_json(users)
        else:
            print_users_table(users)
        
        # Show statistics
        get_users_statistics()
        
        return True
        
    except Exception as e:
        logger.error(f"Error listing users: {e}")
        return False

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='List all users in ArangoDB')
    parser.add_argument('--format', choices=['table', 'json'], default='table',
                       help='Output format (default: table)')
    parser.add_argument('--limit', type=int, help='Limit number of users to display')
    parser.add_argument('--stats-only', action='store_true', 
                       help='Show only statistics, not user data')
    
    args = parser.parse_args()
    
    logger.info("=" * 60)
    logger.info("ArangoDB Users Listing Tool")
    logger.info("=" * 60)
    
    try:
        # Test ArangoDB connection
        client = get_arango_client()
        if not client.ping():
            logger.error("❌ Cannot connect to ArangoDB. Please check your connection settings.")
            sys.exit(1)
        
        logger.info("✅ ArangoDB connection successful")
        
        if args.stats_only:
            # Show only statistics
            get_users_statistics()
        else:
            # List users
            success = list_all_users(
                output_format=args.format,
                limit=args.limit
            )
            
            if not success:
                logger.error("❌ Failed to list users")
                sys.exit(1)
        
        logger.info("\n✅ Operation completed successfully!")
        
    except KeyboardInterrupt:
        logger.info("\n⚠️  Operation interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"\n❌ Unexpected error: {e}")
        sys.exit(1)
