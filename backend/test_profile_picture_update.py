#!/usr/bin/env python3
"""
Test script to verify profile picture URL updates are working
"""
import sys
import os
from pathlib import Path
from dotenv import load_dotenv

# Add the backend directory to Python path
sys.path.append(str(Path(__file__).parent))

# Load environment variables
config_dir = Path(__file__).parent / "config"
env_file = config_dir / ".env"
load_dotenv(env_file)

from app.services.user_service_arangodb import UserService

# Create user service
user_service = UserService()

# Test user
test_user_id = "testuser"

print(f"===== Testing Profile Picture Update for {test_user_id} =====\n")

# Get current user info
print("1. Getting current user info...")
user_info = user_service.get_user_info(test_user_id)
if user_info:
    print(f"   Current user_picture_url: {user_info.get('user_picture_url')}")
else:
    print(f"   User not found!")

# Update with a test URL
test_url = "http://localhost:9000/study-garden-bucket/test123.png?X-Amz-Test=123"
print(f"\n2. Updating user_picture_url to: {test_url}")
success = user_service.update_user_picture_url(test_user_id, test_url)
print(f"   Update successful: {success}")

# Get user info again to verify
print("\n3. Getting updated user info...")
user_info_after = user_service.get_user_info(test_user_id)
if user_info_after:
    print(f"   Updated user_picture_url: {user_info_after.get('user_picture_url')}")
    if user_info_after.get('user_picture_url') == test_url:
        print("   ✓ URL was updated correctly!")
    else:
        print("   ✗ URL was NOT updated correctly!")
else:
    print(f"   User not found after update!")

# Check directly in database to bypass cache
print("\n4. Checking directly in ArangoDB (bypassing cache)...")
from arango import ArangoClient

ARANGO_HOST = os.getenv("ARANGO_HOST", "localhost")
ARANGO_PORT = os.getenv("ARANGO_PORT", "8529")
ARANGO_ROOT_PASSWORD = os.getenv("ARANGO_ROOT_PASSWORD")
ARANGO_DB_NAME = os.getenv("ARANGO_DB_NAME", "study_garden")

client = ArangoClient(hosts=f'http://{ARANGO_HOST}:{ARANGO_PORT}')
db = client.db(ARANGO_DB_NAME, username='root', password=ARANGO_ROOT_PASSWORD)

aql_query = '''
FOR user IN users
FILTER user._key == @user_id
RETURN user
'''

cursor = db.aql.execute(aql_query, bind_vars={'user_id': test_user_id})
users = list(cursor)

if users:
    user = users[0]
    db_url = user.get('user_picture_url')
    print(f"   Database user_picture_url: {db_url}")
    if db_url == test_url:
        print("   ✓ Database has the correct URL!")
    else:
        print(f"   ✗ Database has different URL: {db_url}")
else:
    print(f"   User {test_user_id} not found in database!")

print("\n===== Test Complete =====")
