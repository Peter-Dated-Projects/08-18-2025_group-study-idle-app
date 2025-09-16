#!/usr/bin/env python3
"""
Test script for chat service functionality.
"""
import asyncio
import sys
import os

# Add the project root to Python path
project_root = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, project_root)

# Add the backend directory to Python path  
backend_dir = os.path.dirname(__file__)
sys.path.insert(0, backend_dir)

# Import with absolute paths
from app.services.chat_service import (
    add_chat_message,
    get_chat_messages,
    clear_chat_messages,
    get_chat_info
)

async def test_chat_functionality():
    """Test basic chat functionality."""
    print("Testing chat service functionality...")
    
    # Test lobby code
    test_lobby = "TEST_LOBBY_123"
    
    try:
        # Test 1: Add a chat message
        print(f"\n1. Adding chat message to lobby {test_lobby}")
        message1 = await add_chat_message(
            lobby_code=test_lobby,
            user_id="user123",
            username="TestUser",
            content="Hello, this is a test message!"
        )
        
        if message1:
            print(f"✓ Message added successfully: {message1.content}")
        else:
            print("✗ Failed to add message")
            return False
        
        # Test 2: Add another message
        print(f"\n2. Adding second chat message to lobby {test_lobby}")
        message2 = await add_chat_message(
            lobby_code=test_lobby,
            user_id="user456",
            username="AnotherUser",
            content="Hi there! This is another test message."
        )
        
        if message2:
            print(f"✓ Second message added successfully: {message2.content}")
        else:
            print("✗ Failed to add second message")
            return False
        
        # Test 3: Get chat messages
        print(f"\n3. Retrieving chat messages from lobby {test_lobby}")
        messages = await get_chat_messages(lobby_code=test_lobby)
        
        if messages:
            print(f"✓ Retrieved {len(messages)} messages:")
            for i, msg in enumerate(messages, 1):
                print(f"   {i}. [{msg.time_created}] {msg.username}: {msg.content}")
        else:
            print("✗ No messages retrieved")
            return False
        
        # Test 4: Get chat info
        print(f"\n4. Getting chat info for lobby {test_lobby}")
        info = await get_chat_info(lobby_code=test_lobby)
        
        print(f"✓ Chat info: exists={info['exists']}, length={info['length']}, ttl={info['ttl']}s")
        
        # Test 5: Clear chat messages
        print(f"\n5. Clearing chat messages for lobby {test_lobby}")
        cleared = await clear_chat_messages(lobby_code=test_lobby)
        
        if cleared:
            print("✓ Chat messages cleared successfully")
        else:
            print("✗ Failed to clear chat messages")
            return False
        
        # Test 6: Verify messages are cleared
        print(f"\n6. Verifying messages are cleared for lobby {test_lobby}")
        messages_after_clear = await get_chat_messages(lobby_code=test_lobby)
        
        if len(messages_after_clear) == 0:
            print("✓ Chat messages successfully cleared")
        else:
            print(f"✗ {len(messages_after_clear)} messages still remain")
            return False
        
        print("\n✓ All chat service tests passed!")
        return True
        
    except Exception as e:
        print(f"\n✗ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_chat_functionality())
    exit(0 if success else 1)