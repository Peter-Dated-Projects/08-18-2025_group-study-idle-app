"""
Quick script to verify the finished-tutorial field has been added to all users.
"""
import sys
from pathlib import Path

# Add the project root to the python path
sys.path.append(str(Path(__file__).parent.parent))

from app.utils.arangodb_utils import get_db, USERS_COLLECTION

def verify_finished_tutorial():
    """Verify that all users have the finished-tutorial field."""
    db = get_db()
    users_collection = db.collection(USERS_COLLECTION)
    
    print("=" * 60)
    print("Verifying finished-tutorial field in all users")
    print("=" * 60)
    
    # Get all users and check the field
    query = f"""
    FOR user IN {USERS_COLLECTION}
    RETURN {{
        user_id: user.user_id || user._key,
        "finished-tutorial": user["finished-tutorial"],
        has_field: HAS(user, 'finished-tutorial')
    }}
    """
    
    results = list(db.aql.execute(query))
    
    print(f"\nTotal users: {len(results)}")
    print("\nUser details:")
    for i, user in enumerate(results, 1):
        status = "✅" if user['has_field'] else "❌"
        print(f"{status} {i}. {user['user_id']}: finished-tutorial = {user.get('finished-tutorial', 'MISSING')}")
    
    # Summary
    users_with_field = sum(1 for u in results if u['has_field'])
    print("\n" + "=" * 60)
    print(f"Summary: {users_with_field}/{len(results)} users have the finished-tutorial field")
    print("=" * 60)

if __name__ == "__main__":
    verify_finished_tutorial()
