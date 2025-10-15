#!/usr/bin/env python3
"""
Test script to check user_picture_url data in ArangoDB
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

from arango import ArangoClient

# Get configuration from environment
ARANGO_HOST = os.getenv("ARANGO_HOST", "localhost")
ARANGO_PORT = os.getenv("ARANGO_PORT", "8529")
ARANGO_ROOT_PASSWORD = os.getenv("ARANGO_ROOT_PASSWORD")
ARANGO_DB_NAME = os.getenv("ARANGO_DB_NAME", "study_garden")

# Initialize ArangoDB client
client = ArangoClient(hosts=f'http://{ARANGO_HOST}:{ARANGO_PORT}')
db = client.db(ARANGO_DB_NAME, username='root', password=ARANGO_ROOT_PASSWORD)

# Get users collection
users_collection = db.collection('users')

print('===== Checking user_picture_url data in ArangoDB =====\n')

# Query all users and check their profile picture data
aql_query = '''
FOR user IN users
LIMIT 10
RETURN {
    user_id: user._key,
    display_name: user.display_name,
    user_picture_url: user.user_picture_url,
    photo_url: user.photo_url
}
'''

cursor = db.aql.execute(aql_query)
users_found = False

for user in cursor:
    users_found = True
    user_id = user.get('user_id', 'UNKNOWN')
    display_name = user.get('display_name', 'N/A')
    user_picture_url = user.get('user_picture_url', 'None')
    photo_url = user.get('photo_url', 'None')
    
    print(f"User: {user_id}")
    print(f"  Display Name: {display_name}")
    print(f"  user_picture_url: {user_picture_url}")
    print(f"  photo_url: {photo_url}")
    
    if user_picture_url and user_picture_url != 'None':
        print(f"  ✓ Has custom profile picture")
    else:
        print(f"  ✗ No custom profile picture (will use default)")
    print()

if not users_found:
    print("No users found in database!")
else:
    print("===== Summary =====")
    print("Check if users with user_picture_url are showing default images in the modal")
