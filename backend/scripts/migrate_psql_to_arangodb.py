#!/usr/bin/env python3
"""
PostgreSQL to ArangoDB Migration Script
Migrates friends and groups data from PostgreSQL to ArangoDB.

This script:
1. Extracts data from PostgreSQL tables (user_relations and study_groups)
2. Transforms the data to fit ArangoDB's graph structure
3. Loads the data into ArangoDB collections and graphs

Usage:
    python migrate_psql_to_arangodb.py [--dry-run] [--clear-arango]
"""

import sys
import logging
import argparse
from pathlib import Path
from datetime import datetime, UTC
from typing import Dict, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def setup_imports():
    """Setup imports after adding parent directory to path."""
    # Add the parent directory to the Python path to import app modules
    parent_dir = Path(__file__).parent.parent
    sys.path.append(str(parent_dir))
    
    try:
        # PostgreSQL imports
        from app.models.database import engine, SessionLocal
        from sqlalchemy import text
        from sqlalchemy.orm import Session
        
        # ArangoDB imports  
        from app.utils.arangodb_utils import get_db
        from arango.exceptions import DocumentInsertError, DocumentReplaceError
        
        return {
            'psql': {
                'engine': engine,
                'SessionLocal': SessionLocal,
                'text': text,
                'Session': Session
            },
            'arango': {
                'get_db': get_db,
                'DocumentInsertError': DocumentInsertError,
                'DocumentReplaceError': DocumentReplaceError
            }
        }
    except ImportError as e:
        logger.error(f"Failed to import required modules: {e}")
        logger.error("Make sure you have all dependencies installed and the database is running.")
        sys.exit(1)

def extract_psql_data(session, text_func) -> Dict[str, Any]:
    """
    Extract data from PostgreSQL tables.
    
    Args:
        session: PostgreSQL session
        text_func: SQLAlchemy text function for raw queries
        
    Returns:
        Dict containing extracted data
    """
    logger.info("🔍 Extracting data from PostgreSQL...")
    
    data = {
        'users': set(),
        'friendships': [],
        'groups': [],
        'group_memberships': []
    }
    
    # Extract user relations (friendships)
    logger.info("Extracting user relations...")
    result = session.execute(text_func("""
        SELECT user_id, friend_ids, created_at, updated_at 
        FROM user_relations
    """))
    
    for row in result:
        user_id, friend_ids, created_at, updated_at = row
        data['users'].add(user_id)
        
        # Process friend relationships
        if friend_ids:
            for friend_id in friend_ids:
                if friend_id:  # Skip empty strings
                    data['users'].add(friend_id)
                    
                    # Create a friendship edge
                    # Note: PostgreSQL stores bidirectional relationships,
                    # but ArangoDB edges are directional, so we'll create both directions
                    friendship = {
                        '_key': f"{user_id}_{friend_id}",
                        '_from': f"users/{user_id}",
                        '_to': f"users/{friend_id}",
                        'created_at': created_at.isoformat() if created_at else None,
                        'updated_at': updated_at.isoformat() if updated_at else None,
                        'status': 'accepted'  # All existing relationships are accepted
                    }
                    data['friendships'].append(friendship)
    
    logger.info(f"Found {len(data['friendships'])} friendship relationships")
    
    # Extract study groups
    logger.info("Extracting study groups...")
    result = session.execute(text_func("""
        SELECT id, creator_id, member_ids, group_name, created_at, updated_at
        FROM study_groups
    """))
    
    for row in result:
        group_id, creator_id, member_ids, group_name, created_at, updated_at = row
        
        # Add users to our user set
        data['users'].add(creator_id)
        
        # Create group document
        group = {
            '_key': group_id,
            'name': group_name,
            'creator_id': creator_id,
            'created_at': created_at.isoformat() if created_at else None,
            'updated_at': updated_at.isoformat() if updated_at else None,
            'member_count': len(member_ids) + 1 if member_ids else 1  # +1 for creator
        }
        data['groups'].append(group)
        
        # Create membership edge for creator
        creator_membership = {
            '_key': f"{creator_id}_{group_id}_creator",
            '_from': f"users/{creator_id}",
            '_to': f"study_groups/{group_id}",
            'role': 'creator',
            'joined_at': created_at.isoformat() if created_at else None
        }
        data['group_memberships'].append(creator_membership)
        
        # Create membership edges for members
        if member_ids:
            for member_id in member_ids:
                if member_id and member_id != creator_id:  # Skip empty and duplicate creator
                    data['users'].add(member_id)
                    
                    member_membership = {
                        '_key': f"{member_id}_{group_id}_member",
                        '_from': f"users/{member_id}",
                        '_to': f"study_groups/{group_id}",
                        'role': 'member',
                        'joined_at': updated_at.isoformat() if updated_at else None
                    }
                    data['group_memberships'].append(member_membership)
    
    logger.info(f"Found {len(data['groups'])} groups")
    logger.info(f"Found {len(data['group_memberships'])} group memberships")
    logger.info(f"Found {len(data['users'])} unique users")
    
    return data

def load_data_to_arangodb(db, data: Dict[str, Any], arango_exceptions, dry_run: bool = False) -> None:
    """
    Load extracted data into ArangoDB.
    
    Args:
        db: ArangoDB database connection
        data: Extracted data dictionary
        arango_exceptions: ArangoDB exception classes
        dry_run: If True, don't actually write to database
    """
    logger.info("📥 Loading data into ArangoDB...")
    
    if dry_run:
        logger.info("🔍 DRY RUN MODE - No data will be written")
    
    DocumentInsertError = arango_exceptions['DocumentInsertError']
    
    # Load users
    logger.info(f"Loading {len(data['users'])} users...")
    users_collection = db.collection('users')
    
    for user_id in data['users']:
        user_doc = {
            '_key': user_id,
            'created_at': datetime.now(UTC).isoformat(),
            'migrated_from_psql': True
        }
        
        if not dry_run:
            try:
                users_collection.insert(user_doc)
                logger.debug(f"Inserted user: {user_id}")
            except DocumentInsertError as e:
                if 'unique constraint violated' in str(e):
                    logger.debug(f"User {user_id} already exists, skipping")
                else:
                    logger.error(f"Failed to insert user {user_id}: {e}")
        else:
            logger.debug(f"Would insert user: {user_id}")
    
    # Load groups
    logger.info(f"Loading {len(data['groups'])} groups...")
    groups_collection = db.collection('study_groups')
    
    for group in data['groups']:
        if not dry_run:
            try:
                groups_collection.insert(group)
                logger.debug(f"Inserted group: {group['_key']}")
            except DocumentInsertError as e:
                if 'unique constraint violated' in str(e):
                    logger.debug(f"Group {group['_key']} already exists, skipping")
                else:
                    logger.error(f"Failed to insert group {group['_key']}: {e}")
        else:
            logger.debug(f"Would insert group: {group['_key']} ({group['name']})")
    
    # Load friendships
    logger.info(f"Loading {len(data['friendships'])} friendship relationships...")
    friendships_collection = db.collection('friend_relations')
    
    for friendship in data['friendships']:
        if not dry_run:
            try:
                friendships_collection.insert(friendship)
                logger.debug(f"Inserted friendship: {friendship['_key']}")
            except DocumentInsertError as e:
                if 'unique constraint violated' in str(e):
                    logger.debug(f"Friendship {friendship['_key']} already exists, skipping")
                else:
                    logger.error(f"Failed to insert friendship {friendship['_key']}: {e}")
        else:
            logger.debug(f"Would insert friendship: {friendship['_key']}")
    
    # Load group memberships
    logger.info(f"Loading {len(data['group_memberships'])} group memberships...")
    memberships_collection = db.collection('group_members')
    
    for membership in data['group_memberships']:
        if not dry_run:
            try:
                memberships_collection.insert(membership)
                logger.debug(f"Inserted membership: {membership['_key']}")
            except DocumentInsertError as e:
                if 'unique constraint violated' in str(e):
                    logger.debug(f"Membership {membership['_key']} already exists, skipping")
                else:
                    logger.error(f"Failed to insert membership {membership['_key']}: {e}")
        else:
            logger.debug(f"Would insert membership: {membership['_key']} ({membership['role']})")

def clear_arangodb_collections(db) -> None:
    """
    Clear all data from ArangoDB collections.
    
    Args:
        db: ArangoDB database connection
    """
    logger.warning("🗑️  Clearing ArangoDB collections...")
    
    collections = ['users', 'study_groups', 'friend_relations', 'group_members']
    
    for collection_name in collections:
        try:
            collection = db.collection(collection_name)
            if collection.count() > 0:
                logger.info(f"Clearing {collection.count()} documents from {collection_name}")
                collection.truncate()
            else:
                logger.info(f"Collection {collection_name} is already empty")
        except Exception as e:
            logger.error(f"Failed to clear collection {collection_name}: {e}")

def validate_migration(db, expected_counts: Dict[str, int]) -> bool:
    """
    Validate that the migration was successful.
    
    Args:
        db: ArangoDB database connection
        expected_counts: Expected counts for each collection
        
    Returns:
        bool: True if validation passes
    """
    logger.info("✅ Validating migration...")
    
    collections = {
        'users': expected_counts['users'],
        'study_groups': expected_counts['groups'],
        'friend_relations': expected_counts['friendships'],
        'group_members': expected_counts['group_memberships']
    }
    
    all_valid = True
    
    for collection_name, expected_count in collections.items():
        try:
            collection = db.collection(collection_name)
            actual_count = collection.count()
            
            if actual_count == expected_count:
                logger.info(f"✅ {collection_name}: {actual_count} documents (expected {expected_count})")
            else:
                logger.error(f"❌ {collection_name}: {actual_count} documents (expected {expected_count})")
                all_valid = False
                
        except Exception as e:
            logger.error(f"❌ Failed to validate {collection_name}: {e}")
            all_valid = False
    
    return all_valid

def main():
    """Main migration function."""
    parser = argparse.ArgumentParser(description='Migrate data from PostgreSQL to ArangoDB')
    parser.add_argument('--dry-run', action='store_true', 
                       help='Run without making changes to ArangoDB')
    parser.add_argument('--clear-arango', action='store_true',
                       help='Clear ArangoDB collections before migration')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Enable verbose logging')
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    logger.info("🚀 Starting PostgreSQL to ArangoDB migration...")
    
    # Setup imports
    modules = setup_imports()
    psql_modules = modules['psql']
    arango_modules = modules['arango']
    
    try:
        # Connect to databases
        logger.info("📡 Connecting to databases...")
        
        # PostgreSQL connection
        psql_session = psql_modules['SessionLocal']()
        logger.info("✅ Connected to PostgreSQL")
        
        # ArangoDB connection
        arango_db = arango_modules['get_db']()
        logger.info("✅ Connected to ArangoDB")
        
        # Clear ArangoDB if requested
        if args.clear_arango:
            clear_arangodb_collections(arango_db)
        
        # Extract data from PostgreSQL
        data = extract_psql_data(psql_session, psql_modules['text'])
        
        # Show migration summary
        logger.info("📊 Migration Summary:")
        logger.info(f"  • Users: {len(data['users'])}")
        logger.info(f"  • Groups: {len(data['groups'])}")
        logger.info(f"  • Friendships: {len(data['friendships'])}")
        logger.info(f"  • Group Memberships: {len(data['group_memberships'])}")
        
        if args.dry_run:
            logger.info("🔍 DRY RUN - No changes will be made to ArangoDB")
        else:
            # Confirm migration
            response = input("\nProceed with migration? (y/N): ")
            if response.lower() != 'y':
                logger.info("Migration cancelled")
                return
        
        # Load data into ArangoDB
        load_data_to_arangodb(arango_db, data, arango_modules, dry_run=args.dry_run)
        
        if not args.dry_run:
            # Validate migration
            expected_counts = {
                'users': len(data['users']),
                'groups': len(data['groups']),
                'friendships': len(data['friendships']),
                'group_memberships': len(data['group_memberships'])
            }
            
            if validate_migration(arango_db, expected_counts):
                logger.info("🎉 Migration completed successfully!")
            else:
                logger.error("❌ Migration validation failed")
                sys.exit(1)
        else:
            logger.info("🔍 Dry run completed - review the output above")
        
    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        sys.exit(1)
    
    finally:
        # Close connections
        if 'psql_session' in locals():
            psql_session.close()
            logger.info("Closed PostgreSQL connection")

if __name__ == "__main__":
    main()
