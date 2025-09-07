"""
Test script for the Redis-based lobby system.
This script tests all the major functionality of the new lobby service.
"""
import asyncio
import logging
import json
from datetime import datetime
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
    
    async def test_redis_connectivity(self):
        """Test basic Redis connectivity."""
        try:
            success = ping_redis_json()
            self.log_test_result(
                "Redis Connectivity", 
                success, 
                "Redis is available" if success else "Redis is not available"
            )
            return success
        except Exception as e:
            self.log_test_result("Redis Connectivity", False, str(e))
            return False
    
    async def test_health_check(self):
        """Test the health check functionality."""
        try:
            health_data = health_check()
            success = health_data["status"] == "healthy"
            self.log_test_result(
                "Health Check", 
                success, 
                f"Status: {health_data['status']}, Redis ping: {health_data.get('redis_ping', False)}"
            )
            return success
        except Exception as e:
            self.log_test_result("Health Check", False, str(e))
            return False
    
    async def test_create_lobby(self):
        """Test lobby creation."""
        try:
            user_id = "test_user_1"
            lobby_data = await create_lobby(user_id)
            
            success = lobby_data is not None
            if success:
                self.test_lobbies.append(lobby_data.code)
                self.log_test_result(
                    "Create Lobby", 
                    True, 
                    f"Created lobby {lobby_data.code} for user {user_id}"
                )
                return lobby_data
            else:
                self.log_test_result("Create Lobby", False, "Failed to create lobby")
                return None
        except Exception as e:
            self.log_test_result("Create Lobby", False, str(e))
            return None
    
    async def test_get_lobby(self, lobby_code: str):
        """Test getting lobby information."""
        try:
            lobby_data = get_lobby(lobby_code)
            success = lobby_data is not None and lobby_data.code == lobby_code
            self.log_test_result(
                "Get Lobby", 
                success, 
                f"Retrieved lobby {lobby_code}" if success else f"Failed to get lobby {lobby_code}"
            )
            return lobby_data
        except Exception as e:
            self.log_test_result("Get Lobby", False, str(e))
            return None
    
    async def test_join_lobby(self, lobby_code: str):
        """Test joining a lobby."""
        try:
            user_id = "test_user_2"
            lobby_data = await join_lobby(lobby_code, user_id)
            
            success = lobby_data is not None and user_id in lobby_data.users
            self.log_test_result(
                "Join Lobby", 
                success, 
                f"User {user_id} joined lobby {lobby_code}" if success else f"Failed to join lobby {lobby_code}"
            )
            return lobby_data
        except Exception as e:
            self.log_test_result("Join Lobby", False, str(e))
            return None
    
    async def test_leave_lobby(self, lobby_code: str):
        """Test leaving a lobby."""
        try:
            user_id = "test_user_2"
            lobby_data = await leave_lobby(lobby_code, user_id)
            
            success = lobby_data is not None and user_id not in lobby_data.users
            self.log_test_result(
                "Leave Lobby", 
                success, 
                f"User {user_id} left lobby {lobby_code}" if success else f"Failed to leave lobby {lobby_code}"
            )
            return lobby_data
        except Exception as e:
            self.log_test_result("Leave Lobby", False, str(e))
            return None
    
    async def test_close_lobby(self, lobby_code: str):
        """Test closing a lobby."""
        try:
            host_id = "test_user_1"
            success = await close_lobby(lobby_code, host_id)
            
            # Verify lobby is actually deleted
            lobby_data = get_lobby(lobby_code)
            actually_deleted = lobby_data is None
            
            final_success = success and actually_deleted
            self.log_test_result(
                "Close Lobby", 
                final_success, 
                f"Closed lobby {lobby_code}" if final_success else f"Failed to close lobby {lobby_code}"
            )
            
            if lobby_code in self.test_lobbies:
                self.test_lobbies.remove(lobby_code)
            
            return final_success
        except Exception as e:
            self.log_test_result("Close Lobby", False, str(e))
            return False
    
    async def test_get_lobby_users(self, lobby_code: str):
        """Test getting lobby users."""
        try:
            users = get_lobby_users(lobby_code)
            success = isinstance(users, list)
            self.log_test_result(
                "Get Lobby Users", 
                success, 
                f"Retrieved {len(users)} users from lobby {lobby_code}" if success else "Failed to get lobby users"
            )
            return users
        except Exception as e:
            self.log_test_result("Get Lobby Users", False, str(e))
            return []
    
    async def test_list_all_lobbies(self):
        """Test listing all lobbies."""
        try:
            lobbies = list_all_lobbies()
            success = isinstance(lobbies, list)
            self.log_test_result(
                "List All Lobbies", 
                success, 
                f"Retrieved {len(lobbies)} total lobbies" if success else "Failed to list lobbies"
            )
            return lobbies
        except Exception as e:
            self.log_test_result("List All Lobbies", False, str(e))
            return []
    
    async def test_get_lobby_count(self):
        """Test getting lobby count."""
        try:
            count = get_lobby_count()
            success = isinstance(count, int) and count >= 0
            self.log_test_result(
                "Get Lobby Count", 
                success, 
                f"Total lobby count: {count}" if success else "Failed to get lobby count"
            )
            return count
        except Exception as e:
            self.log_test_result("Get Lobby Count", False, str(e))
            return -1
    
    async def test_json_operations(self):
        """Test basic RedisJSON operations."""
        try:
            test_key = "test:json:operations"
            test_data = {
                "test": True,
                "timestamp": datetime.now().isoformat(),
                "numbers": [1, 2, 3],
                "nested": {"key": "value"}
            }
            
            # Test JSON set
            set_success = redis_json_client.json_set(test_key, '.', test_data, expire_seconds=60)
            
            # Test JSON get
            retrieved_data = redis_json_client.json_get(test_key)
            get_success = retrieved_data == test_data
            
            # Test JSON array operations
            array_append_success = redis_json_client.json_array_append(test_key, '.numbers', 4, 5) > 0
            updated_numbers = redis_json_client.json_get(test_key, '.numbers')
            array_success = updated_numbers == [1, 2, 3, 4, 5]
            
            # Test JSON delete
            delete_success = redis_json_client.json_del(test_key)
            
            overall_success = all([set_success, get_success, array_append_success, array_success, delete_success])
            self.log_test_result(
                "JSON Operations", 
                overall_success, 
                "All JSON operations successful" if overall_success else "Some JSON operations failed"
            )
            return overall_success
        except Exception as e:
            self.log_test_result("JSON Operations", False, str(e))
            return False
    
    async def cleanup_test_lobbies(self):
        """Clean up any remaining test lobbies."""
        logger.info("Cleaning up test lobbies...")
        cleanup_count = 0
        
        for lobby_code in self.test_lobbies.copy():
            try:
                # Try to close the lobby
                await close_lobby(lobby_code, "test_user_1")
                cleanup_count += 1
                self.test_lobbies.remove(lobby_code)
            except Exception as e:
                logger.warning(f"Failed to cleanup lobby {lobby_code}: {e}")
        
        logger.info(f"Cleaned up {cleanup_count} test lobbies")
    
    async def run_all_tests(self):
        """Run all tests in sequence."""
        logger.info("Starting Redis-based lobby system tests...")
        
        # Basic connectivity tests
        if not await self.test_redis_connectivity():
            logger.error("Redis connectivity failed - aborting tests")
            return self.get_test_summary()
        
        await self.test_health_check()
        await self.test_json_operations()
        
        # Core lobby functionality tests
        lobby_data = await self.test_create_lobby()
        if lobby_data:
            lobby_code = lobby_data.code
            
            # Test getting the lobby
            await self.test_get_lobby(lobby_code)
            
            # Test getting lobby users
            await self.test_get_lobby_users(lobby_code)
            
            # Test joining the lobby
            await self.test_join_lobby(lobby_code)
            
            # Test leaving the lobby
            await self.test_leave_lobby(lobby_code)
            
            # Test closing the lobby
            await self.test_close_lobby(lobby_code)
        
        # Test listing functions
        await self.test_list_all_lobbies()
        await self.test_get_lobby_count()
        
        # Cleanup
        await self.cleanup_test_lobbies()
        
        return self.get_test_summary()
    
    def get_test_summary(self):
        """Get a summary of all test results."""
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        summary = {
            "total_tests": total_tests,
            "passed": passed_tests,
            "failed": failed_tests,
            "success_rate": round((passed_tests / total_tests) * 100, 2) if total_tests > 0 else 0,
            "results": self.test_results
        }
        
        logger.info(f"Test Summary: {passed_tests}/{total_tests} tests passed ({summary['success_rate']}%)")
        return summary


async def main():
    """Run the test suite."""
    test_suite = LobbySystemTest()
    summary = await test_suite.run_all_tests()
    
    print("\n" + "="*50)
    print("REDIS LOBBY SYSTEM TEST RESULTS")
    print("="*50)
    print(f"Total Tests: {summary['total_tests']}")
    print(f"Passed: {summary['passed']}")
    print(f"Failed: {summary['failed']}")
    print(f"Success Rate: {summary['success_rate']}%")
    print("="*50)
    
    if summary['failed'] > 0:
        print("\nFailed Tests:")
        for result in summary['results']:
            if not result['success']:
                print(f"- {result['test']}: {result['message']}")
    
    print("\nDetailed results saved to test log")
    
    # Save detailed results to file
    with open('redis_lobby_test_results.json', 'w') as f:
        json.dump(summary, f, indent=2)
    
    return summary['success_rate'] == 100.0


if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)
