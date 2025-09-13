"""
Pytest test suite for the Redis-based lobby system.
This script tests all the major functionality of the new lobby service.
"""
import pytest
import asyncio
import logging
import json
from datetime import datetime
import sys
from pathlib import Path

# Add the parent directory to the path so we can import from app
sys.path.append(str(Path(__file__).parent.parent))

from utils.redis_json_utils import redis_json_client, ping_redis_json
from lobby_service_redis import (
    create_lobby, 
    get_lobby, 
    join_lobby, 
    leave_lobby, 
    close_lobby,
    get_lobby_users,
    list_all_lobbies,
    get_lobby_count,
    health_check
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@pytest.fixture(scope="session")
def event_loop():
    """Create an event loop for async tests."""
    loop = asyncio.get_event_loop()
    yield loop


@pytest.fixture
def test_user_ids():
    """Provide test user IDs."""
    return ["test_user_1", "test_user_2", "test_user_3"]


@pytest.fixture
async def test_lobby(test_user_ids):
    """Create a test lobby and clean up after test."""
    user_id = test_user_ids[0]
    lobby_data = await create_lobby(user_id)
    
    yield lobby_data
    
    # Cleanup: Close the lobby
    if lobby_data:
        try:
            await close_lobby(lobby_data.code, user_id)
        except:
            pass  # Ignore cleanup errors


@pytest.mark.asyncio
async def test_redis_connectivity():
    """Test basic Redis connectivity."""
    success = ping_redis_json()
    assert success, "Redis should be available"
    logger.info("✓ Redis connectivity test passed")


@pytest.mark.asyncio
async def test_health_check():
    """Test the health check functionality."""
    health_data = health_check()
    
    assert health_data["status"] == "healthy", f"Health status should be healthy, got {health_data['status']}"
    assert "redis_ping" in health_data, "Health data should contain redis_ping"
    
    logger.info(f"✓ Health check passed: {health_data}")


@pytest.mark.asyncio
async def test_create_lobby(test_user_ids):
    """Test lobby creation."""
    user_id = test_user_ids[0]
    lobby_data = await create_lobby(user_id)
    
    assert lobby_data is not None, "Lobby should be created successfully"
    assert lobby_data.code is not None, "Lobby should have a code"
    assert lobby_data.creator_id == user_id, "Lobby creator should match"
    
    # Cleanup
    await close_lobby(lobby_data.code, user_id)
    
    logger.info(f"✓ Lobby creation test passed: {lobby_data.code}")


@pytest.mark.asyncio
async def test_get_lobby(test_lobby):
    """Test getting lobby information."""
    lobby_code = test_lobby.code
    lobby_data = await get_lobby(lobby_code)
    
    assert lobby_data is not None, "Should be able to retrieve lobby"
    assert lobby_data.code == lobby_code, "Retrieved lobby code should match"
    assert lobby_data.creator_id == test_lobby.creator_id, "Creator should match"
    
    logger.info(f"✓ Get lobby test passed: {lobby_code}")


@pytest.mark.asyncio
async def test_join_lobby(test_lobby, test_user_ids):
    """Test joining a lobby."""
    lobby_code = test_lobby.code
    joiner_id = test_user_ids[1]
    
    result = await join_lobby(lobby_code, joiner_id)
    assert result is True, "Should be able to join lobby"
    
    # Verify user is in lobby
    lobby_users = await get_lobby_users(lobby_code)
    assert joiner_id in lobby_users, "Joiner should be in lobby users list"
    
    logger.info(f"✓ Join lobby test passed: {joiner_id} joined {lobby_code}")


@pytest.mark.asyncio
async def test_leave_lobby(test_lobby, test_user_ids):
    """Test leaving a lobby."""
    lobby_code = test_lobby.code
    joiner_id = test_user_ids[1]
    
    # First join the lobby
    await join_lobby(lobby_code, joiner_id)
    
    # Then leave the lobby
    result = await leave_lobby(lobby_code, joiner_id)
    assert result is True, "Should be able to leave lobby"
    
    # Verify user is not in lobby
    lobby_users = await get_lobby_users(lobby_code)
    assert joiner_id not in lobby_users, "User should not be in lobby after leaving"
    
    logger.info(f"✓ Leave lobby test passed: {joiner_id} left {lobby_code}")


@pytest.mark.asyncio
async def test_close_lobby(test_user_ids):
    """Test closing a lobby."""
    user_id = test_user_ids[0]
    
    # Create a lobby specifically for this test
    lobby_data = await create_lobby(user_id)
    lobby_code = lobby_data.code
    
    # Close the lobby
    result = await close_lobby(lobby_code, user_id)
    assert result is True, "Should be able to close lobby"
    
    # Verify lobby is closed
    lobby_data = await get_lobby(lobby_code)
    assert lobby_data is None, "Lobby should not exist after closing"
    
    logger.info(f"✓ Close lobby test passed: {lobby_code}")


@pytest.mark.asyncio
async def test_get_lobby_users(test_lobby, test_user_ids):
    """Test getting lobby users."""
    lobby_code = test_lobby.code
    joiner_id = test_user_ids[1]
    
    # Add a user to the lobby
    await join_lobby(lobby_code, joiner_id)
    
    # Get lobby users
    lobby_users = await get_lobby_users(lobby_code)
    
    assert isinstance(lobby_users, list), "Lobby users should be a list"
    assert test_lobby.creator_id in lobby_users, "Creator should be in lobby users"
    assert joiner_id in lobby_users, "Joiner should be in lobby users"
    
    logger.info(f"✓ Get lobby users test passed: {len(lobby_users)} users")


@pytest.mark.asyncio
async def test_list_all_lobbies():
    """Test listing all lobbies."""
    lobbies = await list_all_lobbies()
    
    assert isinstance(lobbies, list), "Lobbies should be a list"
    
    logger.info(f"✓ List all lobbies test passed: {len(lobbies)} lobbies")


@pytest.mark.asyncio
async def test_get_lobby_count():
    """Test getting lobby count."""
    count = await get_lobby_count()
    
    assert isinstance(count, int), "Lobby count should be an integer"
    assert count >= 0, "Lobby count should be non-negative"
    
    logger.info(f"✓ Get lobby count test passed: {count} lobbies")


@pytest.mark.asyncio
async def test_json_operations(test_user_ids):
    """Test JSON operations with Redis."""
    user_id = test_user_ids[0]
    lobby_data = await create_lobby(user_id)
    
    # Test that lobby data can be serialized/deserialized
    lobby_json = json.dumps(lobby_data.__dict__)
    parsed_data = json.loads(lobby_json)
    
    assert parsed_data["code"] == lobby_data.code, "JSON serialization should preserve code"
    assert parsed_data["creator_id"] == lobby_data.creator_id, "JSON serialization should preserve creator_id"
    
    # Cleanup
    await close_lobby(lobby_data.code, user_id)
    
    logger.info("✓ JSON operations test passed")


# Integration test class for compatibility
class LobbySystemTest:
    """Test suite for the Redis-based lobby system."""
    
    def __init__(self):
        self.test_results = []
        self.test_lobbies = []  # Track lobbies created during testing
    
    def log_test_result(self, test_name: str, success: bool, message: str = ""):
        """Log and store test results."""
        status = "PASS" if success else "FAIL"
        log_message = f"TEST {status}: {test_name}"
        if message:
            log_message += f" - {message}"
        
        if success:
            logger.info(log_message)
        else:
            logger.error(log_message)
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "timestamp": datetime.now().isoformat()
        })
    
    async def run_all_tests(self):
        """Run all tests for backwards compatibility."""
        try:
            # Test Redis connectivity
            await test_redis_connectivity()
            self.log_test_result("Redis Connectivity", True, "Redis is available")
            
            # Test health check
            await test_health_check()
            self.log_test_result("Health Check", True, "Health check passed")
            
            # Test lobby operations with mock data
            test_user_ids = ["test_user_1", "test_user_2", "test_user_3"]
            
            # Create test lobby
            lobby_data = await create_lobby(test_user_ids[0])
            if lobby_data:
                self.test_lobbies.append(lobby_data.code)
                self.log_test_result("Create Lobby", True, f"Created lobby {lobby_data.code}")
                
                # Join/leave test
                await join_lobby(lobby_data.code, test_user_ids[1])
                await leave_lobby(lobby_data.code, test_user_ids[1])
                self.log_test_result("Join/Leave Lobby", True, "Join and leave operations successful")
                
                # Get users test
                users = await get_lobby_users(lobby_data.code)
                self.log_test_result("Get Lobby Users", True, f"Found {len(users)} users")
                
                # Cleanup
                await close_lobby(lobby_data.code, test_user_ids[0])
                self.log_test_result("Close Lobby", True, f"Closed lobby {lobby_data.code}")
            
            # List operations
            await list_all_lobbies()
            self.log_test_result("List All Lobbies", True, "List operation successful")
            
            await get_lobby_count()
            self.log_test_result("Get Lobby Count", True, "Count operation successful")
            
        except Exception as e:
            self.log_test_result("Test Suite", False, str(e))
    
    def print_summary(self):
        """Print test summary."""
        passed = len([r for r in self.test_results if r["success"]])
        failed = len([r for r in self.test_results if not r["success"]])
        
        print(f"\n📊 Test Summary:")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"📈 Total: {len(self.test_results)}")


if __name__ == "__main__":
    # For backwards compatibility when run directly
    async def main():
        logger.info("🚀 Starting Redis Lobby System Tests")
        
        test_suite = LobbySystemTest()
        await test_suite.run_all_tests()
        test_suite.print_summary()
        
        logger.info("🎉 Redis lobby tests completed!")
    
    try:
        asyncio.run(main())
    except Exception as e:
        logger.error(f"❌ Test failed with error: {e}")
        sys.exit(1)
