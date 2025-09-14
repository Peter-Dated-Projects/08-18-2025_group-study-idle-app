#!/usr/bin/env python3
"""
Test script to verify user service is correctly reading userName from Firestore.
"""
import sys
import os
import asyncio

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from app.services.user_service_firestore import get_user_service

async def test_user_service():
    """Test the user service with some sample user IDs."""
    user_service = get_user_service()
    
    # Test if service is available
    print(f"User service available: {user_service.is_available()}")
    
    if not user_service.is_available():
        print("Firestore not available, cannot test")
        return
    
    # Test with some user IDs from the leaderboard
    test_user_ids = [
        "803db0b1a2085280bdc9a1ba40e5bfbef8f4c9723e423a7e505d3e33f9f762cd",
        "5a7b661593f73212460242713dd442c0cc0523fb8a4ad238ba01a0e726eaf911",
        "user123",
        "user456"
    ]
    
    print("\nTesting single user fetch:")
    for user_id in test_user_ids[:2]:  # Test first 2
        user_info = user_service.get_user_info(user_id)
        print(f"User {user_id[:12]}...: {user_info}")
    
    print("\nTesting batch user fetch:")
    users_info = user_service.get_users_info(test_user_ids)
    for user_id, info in users_info.items():
        display_name = info.get('display_name', 'None')
        print(f"User {user_id[:12]}... -> display_name: {display_name}")

if __name__ == "__main__":
    asyncio.run(test_user_service())
