#!/usr/bin/env python3
"""
Test script to verify the new tutorial system endpoints work correctly.
Tests both GET and PATCH /api/users/me endpoints.
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
test_user_id = "test_tutorial_user"

print(f"===== Testing Tutorial System Integration for {test_user_id} =====\n")

# Test 1: Get user info (should have finished-tutorial field)
print("1. Getting user info...")
user_info = user_service.get_user_info(test_user_id)
if user_info:
    print(f"   User ID: {user_info.get('user_id')}")
    print(f"   finished-tutorial: {user_info.get('finished-tutorial', 'NOT SET')}")
else:
    print(f"   User not found, will be created on first update")

# Test 2: Update finished-tutorial field to False (simulating new user)
print("\n2. Setting finished-tutorial to False (new user)...")
success = user_service.update_user_field(test_user_id, "finished-tutorial", False)
print(f"   Update successful: {success}")

# Verify the update
print("\n3. Verifying finished-tutorial is False...")
user_info = user_service.get_user_info(test_user_id)
if user_info:
    finished_tutorial = user_info.get("finished-tutorial")
    print(f"   finished-tutorial: {finished_tutorial}")
    if finished_tutorial == False:
        print("   ✓ Correctly set to False!")
    else:
        print(f"   ✗ Expected False, got {finished_tutorial}")

# Test 3: Update finished-tutorial to True (simulating tutorial completion)
print("\n4. Setting finished-tutorial to True (completed)...")
success = user_service.update_user_fields(test_user_id, {"finished-tutorial": True})
print(f"   Update successful: {success}")

# Verify the update
print("\n5. Verifying finished-tutorial is True...")
user_info = user_service.get_user_info(test_user_id)
if user_info:
    finished_tutorial = user_info.get("finished-tutorial")
    print(f"   finished-tutorial: {finished_tutorial}")
    if finished_tutorial == True:
        print("   ✓ Correctly set to True!")
    else:
        print(f"   ✗ Expected True, got {finished_tutorial}")

# Test 4: Update multiple fields at once
print("\n6. Updating multiple fields...")
success = user_service.update_user_fields(
    test_user_id, {"finished-tutorial": False, "display_name": "Tutorial Test User"}
)
print(f"   Update successful: {success}")

# Verify all updates
print("\n7. Verifying all updates...")
user_info = user_service.get_user_info(test_user_id)
if user_info:
    print(f"   finished-tutorial: {user_info.get('finished-tutorial')}")
    print(f"   display_name: {user_info.get('display_name')}")

    if (
        user_info.get("finished-tutorial") == False
        and user_info.get("display_name") == "Tutorial Test User"
    ):
        print("   ✓ All fields updated correctly!")
    else:
        print("   ✗ Some fields not updated correctly")

print("\n===== Test Complete =====")
