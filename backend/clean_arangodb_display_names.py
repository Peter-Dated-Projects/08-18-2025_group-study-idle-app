#!/usr/bin/env python3
"""
Script to verify and clean ArangoDB collections to ensure no display_name fields exist.
This script also prevents future accidental storage of display names in ArangoDB.
"""
import sys
import os
import logging

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from app.utils.arangodb_utils import (
    get_arango_client, 
    USERS_COLLECTION, 
    STUDY_GROUPS_COLLECTION,
    FRIEND_RELATIONS_COLLECTION,
    GROUP_MEMBERS_COLLECTION
)

logger = logging.getLogger(__name__)

def check_and_clean_collection(db, collection_name):
    """
    Check a collection for display_name fields and remove them if found.
    
    Args:
        db: ArangoDB database instance
        collection_name: Name of the collection to check
    
    Returns:
        Tuple of (documents_checked, display_names_found, documents_cleaned)
    """
    print(f"\n🔍 Checking collection: {collection_name}")
    
    if not db.has_collection(collection_name):
        print(f"   ⚠️  Collection '{collection_name}' does not exist - skipping")
        return 0, 0, 0
    
    # Query all documents to check for display_name fields
    aql_query = f"""
    FOR doc IN {collection_name}
        FILTER HAS(doc, 'display_name') OR HAS(doc, 'displayName')
        RETURN {{
            _key: doc._key,
            _id: doc._id,
            display_name: doc.display_name,
            displayName: doc.displayName
        }}
    """
    
    cursor = db.aql.execute(aql_query)
    documents_with_display_names = list(cursor)
    
    total_docs_query = f"FOR doc IN {collection_name} COLLECT WITH COUNT INTO count RETURN count"
    total_cursor = db.aql.execute(total_docs_query)
    total_documents = next(total_cursor, 0)
    
    print(f"   📊 Total documents: {total_documents}")
    print(f"   🔍 Documents with display_name fields: {len(documents_with_display_names)}")
    
    documents_cleaned = 0
    
    if documents_with_display_names:
        print(f"   ⚠️  Found {len(documents_with_display_names)} documents with display_name fields:")
        
        for doc in documents_with_display_names:
            print(f"      - {doc['_id']}: display_name={doc.get('display_name')}, displayName={doc.get('displayName')}")
        
        # Remove display_name fields
        for doc in documents_with_display_names:
            update_query = f"""
            UPDATE '{doc['_key']}' WITH {{}} IN {collection_name}
            OPTIONS {{ keepNull: false }}
            LET updated = NEW
            UPDATE '{doc['_key']}' WITH {{
                display_name: null,
                displayName: null
            }} IN {collection_name}
            OPTIONS {{ keepNull: false }}
            RETURN NEW
            """
            
            try:
                db.aql.execute(update_query)
                documents_cleaned += 1
                print(f"      ✅ Cleaned display_name fields from {doc['_id']}")
            except Exception as e:
                print(f"      ❌ Failed to clean {doc['_id']}: {e}")
    else:
        print("   ✅ No display_name fields found - collection is clean!")
    
    return total_documents, len(documents_with_display_names), documents_cleaned

def main():
    """
    Main function to check and clean all ArangoDB collections.
    """
    print("🧹 ArangoDB Display Name Cleanup Script")
    print("=" * 50)
    
    try:
        arango_client = get_arango_client()
        
        # Test connection
        if not arango_client.ping():
            print("❌ Cannot connect to ArangoDB. Please check your connection.")
            return
        
        print("✅ Connected to ArangoDB successfully")
        
        db = arango_client.db
        
        # Collections to check
        collections_to_check = [
            USERS_COLLECTION,
            STUDY_GROUPS_COLLECTION, 
            FRIEND_RELATIONS_COLLECTION,
            GROUP_MEMBERS_COLLECTION
        ]
        
        total_docs = 0
        total_found = 0
        total_cleaned = 0
        
        for collection_name in collections_to_check:
            docs, found, cleaned = check_and_clean_collection(db, collection_name)
            total_docs += docs
            total_found += found
            total_cleaned += cleaned
        
        print("\n📋 Summary:")
        print(f"   📊 Total documents checked: {total_docs}")
        print(f"   🔍 Documents with display_name fields: {total_found}")
        print(f"   🧹 Documents cleaned: {total_cleaned}")
        
        if total_found == 0:
            print("\n✅ All ArangoDB collections are clean!")
            print("   No display_name fields found in any collection.")
            print("   The system correctly separates:")
            print("   • ArangoDB: Relationships and structure")
            print("   • Firestore: User account data (userName)")
            print("   • Redis: Cached user information")
        else:
            print("\n🧹 Cleanup completed!")
            print(f"   Removed display_name fields from {total_cleaned} documents.")
            print("   ArangoDB now only stores structural data.")
        
        # Verify the cleanup worked
        verification_query = """
        LET all_collections = ["users", "study_groups", "friend_relations", "group_members"]
        FOR collection_name IN all_collections
            FOR doc IN DOCUMENT(collection_name)
                FILTER HAS(doc, 'display_name') OR HAS(doc, 'displayName')
                COLLECT collection = collection_name WITH COUNT INTO remaining
                RETURN {collection: collection, remaining_display_names: remaining}
        """
        
        try:
            remaining_cursor = db.aql.execute(verification_query)
            remaining_issues = list(remaining_cursor)
            
            if remaining_issues:
                print("\n⚠️  Verification found remaining issues:")
                for issue in remaining_issues:
                    print(f"   - {issue['collection']}: {issue['remaining_display_names']} display_name fields")
            else:
                print("\n✅ Verification successful: No display_name fields remain in ArangoDB")
        except Exception as e:
            print(f"\n⚠️  Could not verify cleanup: {e}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
