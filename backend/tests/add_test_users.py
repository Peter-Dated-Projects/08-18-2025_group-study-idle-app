#!/usr/bin/env python3
"""
Test script to add sample user session data to Firestore for testing display names.
This simulates what the frontend would create when a user logs in.
"""
import sys
import os
import asyncio
from datetime import datetime

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from app.services.user_service_firestore import get_user_service

async def add_test_user_data():
    """Add some test user session data to Firestore for testing."""
    user_service = get_user_service()
    
    if not user_service.is_available():
        print("Firestore not available, cannot add test data")
        return
    
    # Sample user session data that matches the frontend structure
    test_users = [
        {
            "user_id": "test_user_with_name_123",
            "sessionId": "test_session_123",
            "userId": "test_user_with_name_123",
            "userAccountInformation": {
                "userId": "test_user_with_name_123",
                "email": "test@example.com",
                "userName": "John Test User",
                "created_at": datetime.now(),
                "updated_at": datetime.now()
            },
            "created_at": datetime.now(),
            "expires_at": datetime.now(),
            "updated_at": datetime.now()
        },
        {
            "user_id": "test_user_jane_456", 
            "sessionId": "test_session_456",
            "userId": "test_user_jane_456",
            "userAccountInformation": {
                "userId": "test_user_jane_456",
                "email": "jane@example.com", 
                "userName": "Jane Test User",
                "created_at": datetime.now(),
                "updated_at": datetime.now()
            },
            "created_at": datetime.now(),
            "expires_at": datetime.now(),
            "updated_at": datetime.now()
        }
    ]
    
    try:
        collection_name = user_service.user_sessions_collection
        print(f"Adding test users to collection: {collection_name}")
        
        for user_data in test_users:
            user_id = user_data["user_id"]
            # Remove user_id from the document data since it's the document ID
            doc_data = {k: v for k, v in user_data.items() if k != "user_id"}
            
            user_service.db.collection(collection_name).document(user_id).set(doc_data)
            print(f"Added test user: {user_id} with userName: {user_data['userAccountInformation']['userName']}")
        
        print("\nTest data added successfully!")
        print("You can now test the API with these user IDs:")
        for user_data in test_users:
            print(f"  - {user_data['user_id']}")
            
    except Exception as e:
        print(f"Error adding test data: {e}")

if __name__ == "__main__":
    asyncio.run(add_test_user_data())
