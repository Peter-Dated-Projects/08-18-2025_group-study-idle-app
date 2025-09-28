#!/usr/bin/env python3
"""
Debug script to inspect ArangoDB friends data.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.utils.arangodb_utils import get_db, USERS_COLLECTION, FRIEND_RELATIONS_COLLECTION, FRIENDS_GRAPH

def debug_friends_data():
    """Check what's actually in the database."""
    db = get_db()
    
    print("=== Debug Friends Database ===")
    
    # Check users collection
    users_collection = db.collection(USERS_COLLECTION)
    print(f"\n1. Users in database:")
    user_cursor = users_collection.all()
    users = list(user_cursor)
    print(f"   Total users: {len(users)}")
    for user in users[:10]:  # Show first 10
        print(f"   - {user.get('_key', 'no_key')}: {user}")
    
    # Check friend relations
    friend_relations = db.collection(FRIEND_RELATIONS_COLLECTION)
    print(f"\n2. Friend relations in database:")
    relations_cursor = friend_relations.all()
    relations = list(relations_cursor)
    print(f"   Total relations: {len(relations)}")
    for relation in relations[:10]:  # Show first 10
        print(f"   - {relation}")
    
    # Check graph structure
    print(f"\n3. Graph information:")
    graph = db.graph(FRIENDS_GRAPH)
    print(f"   Graph exists: {db.has_graph(FRIENDS_GRAPH)}")
    try:
        graph_info = graph.properties()
        print(f"   Graph properties: {graph_info}")
    except Exception as e:
        print(f"   Failed to get graph properties: {e}")
    
    # Test a specific user's friends
    test_user = "803db0b1a2085280bdc9a1ba40e5bfbef8f4c9723e423a7e505d3e33f9f762cd"
    print(f"\n4. Testing friends for user: {test_user}")
    
    # Check if user exists
    if users_collection.has(test_user):
        print(f"   User exists in database")
        
        # Query friends using graph traversal
        aql_query = f"""
        FOR friend IN 1..1 OUTBOUND '{USERS_COLLECTION}/{test_user}' GRAPH '{FRIENDS_GRAPH}'
            RETURN {{
                key: friend._key,
                user_id: friend.user_id,
                full_doc: friend
            }}
        """
        cursor = db.aql.execute(aql_query)
        friends = list(cursor)
        print(f"   Friends found via graph traversal: {len(friends)}")
        for friend in friends:
            print(f"   - {friend}")
        
        # Check direct relations
        direct_relations_query = f"""
        FOR relation IN {FRIEND_RELATIONS_COLLECTION}
            FILTER relation._from == '{USERS_COLLECTION}/{test_user}'
            RETURN relation
        """
        cursor2 = db.aql.execute(direct_relations_query)
        direct_relations = list(cursor2)
        print(f"   Direct relations from user: {len(direct_relations)}")
        for relation in direct_relations:
            print(f"   - {relation}")
            
    else:
        print(f"   User does NOT exist in database")

if __name__ == "__main__":
    debug_friends_data()