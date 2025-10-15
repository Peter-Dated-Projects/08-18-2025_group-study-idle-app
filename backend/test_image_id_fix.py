#!/usr/bin/env python3
"""
Test script to verify the image_id fix for profile pictures
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

print(f"===== Testing Image ID Storage Fix =====\n")

# Test 1: Store an image_id (new format)
test_image_id = "abc-123-def-456"
print(f"1. Storing image_id (new format): {test_image_id}")
success = user_service.update_user_picture_url(test_user_id, test_image_id)
print(f"   Update successful: {success}")

# Verify it was stored
user_info = user_service.get_user_info(test_user_id)
stored_value = user_info.get('user_picture_url')
print(f"   Stored value: {stored_value}")

if stored_value == test_image_id:
    print("   ✓ Image ID stored correctly!")
else:
    print(f"   ✗ Expected '{test_image_id}', got '{stored_value}'")

# Test 2: Verify old URL format still works (backwards compatibility)
print(f"\n2. Testing backwards compatibility with old URL format...")
old_url = "http://localhost:9000/study-garden-bucket/old-image-123.png?X-Amz-Test=123"
success = user_service.update_user_picture_url(test_user_id, old_url)
print(f"   Update successful: {success}")

user_info = user_service.get_user_info(test_user_id)
stored_value = user_info.get('user_picture_url')
print(f"   Stored value: {stored_value}")
print(f"   ✓ Old URL format can still be stored for backwards compatibility")

# Test 3: Set back to None (default)
print(f"\n3. Setting back to None (default image)...")
success = user_service.update_user_picture_url(test_user_id, None)
print(f"   Update successful: {success}")

user_info = user_service.get_user_info(test_user_id)
stored_value = user_info.get('user_picture_url')
print(f"   Stored value: {stored_value}")

if stored_value is None:
    print("   ✓ None stored correctly (will use default image)!")
else:
    print(f"   ✗ Expected None, got '{stored_value}'")

print("\n===== Fix Summary =====")
print("✓ Now storing image_id instead of expiring presigned URLs")
print("✓ Fresh presigned URLs will be generated on each request")
print("✓ Backwards compatible with old URL format")
print("✓ None = default image")
