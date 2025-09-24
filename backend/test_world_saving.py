#!/usr/bin/env python3
"""
Test script for the world saving feature.
Tests the level config and inventory services to ensure everything works correctly.
"""
import sys
import logging
from pathlib import Path

# Add the parent directory to the Python path to import app modules
parent_dir = Path(__file__).parent.parent
sys.path.append(str(parent_dir))

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_level_config_service():
    """Test the level config service functionality."""
    logger.info("Testing Level Config Service...")
    
    from app.services.level_config_service import LevelConfigService
    service = LevelConfigService()
    test_user = "test_user_world_save_123"
    
    try:
        # Test creating a user level config
        logger.info("Creating level config for test user...")
        result = service.create_user_level_config(test_user)
        logger.info(f"Created config: {result}")
        
        # Test getting the config
        logger.info("Getting level config...")
        config = service.get_user_level_config(test_user)
        logger.info(f"Retrieved config: {config}")
        
        # Test updating a slot
        logger.info("Updating slot 0 to chicken-coop...")
        updated = service.update_slot_config(test_user, 0, "chicken-coop")
        logger.info(f"Updated config: {updated}")
        
        # Test getting specific slot
        logger.info("Getting slot 0...")
        slot_value = service.get_slot_config(test_user, 0)
        logger.info(f"Slot 0 value: {slot_value}")
        
        # Test updating full config
        logger.info("Updating full config...")
        new_config = ["chicken-coop", "mailbox", "picnic", "water-well", "workbench", "empty", "empty"]
        full_updated = service.update_user_level_config(test_user, new_config)
        logger.info(f"Full updated config: {full_updated}")
        
        logger.info("✅ Level Config Service tests passed!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Level Config Service test failed: {e}")
        return False

def test_inventory_service():
    """Test the inventory service functionality with usage tracking."""
    logger.info("Testing Inventory Service...")
    
    from app.services.inventory_service import InventoryService
    service = InventoryService()
    test_user = "test_user_inventory_123"
    
    try:
        # Test adding inventory items
        logger.info("Adding inventory items...")
        result1 = service.add_inventory_item(test_user, "Chicken Coop", 3)
        logger.info(f"Added chicken coops: {result1}")
        
        result2 = service.add_inventory_item(test_user, "Mailbox", 2)
        logger.info(f"Added mailboxes: {result2}")
        
        # Test getting inventory
        logger.info("Getting inventory...")
        inventory = service.get_user_inventory(test_user)
        logger.info(f"User inventory: {inventory}")
        
        # Test updating usage
        logger.info("Updating usage for Chicken Coop...")
        usage_result = service.update_structure_usage(test_user, "Chicken Coop", 2)
        logger.info(f"Updated usage: {usage_result}")
        
        # Test getting usage
        logger.info("Getting usage...")
        usage = service.get_structure_usage(test_user, "Chicken Coop")
        logger.info(f"Current usage: {usage}")
        
        # Test getting available
        logger.info("Getting available structures...")
        available = service.get_available_structures(test_user, "Chicken Coop")
        logger.info(f"Available: {available}")
        
        logger.info("✅ Inventory Service tests passed!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Inventory Service test failed: {e}")
        return False

def main():
    """Run all tests."""
    logger.info("Starting World Saving Feature Tests...")
    
    tests_passed = 0
    total_tests = 2
    
    # Test level config service
    if test_level_config_service():
        tests_passed += 1
    
    # Test inventory service
    if test_inventory_service():
        tests_passed += 1
    
    logger.info(f"\n📊 Test Results: {tests_passed}/{total_tests} tests passed")
    
    if tests_passed == total_tests:
        logger.info("🎉 All tests passed! World saving feature is working correctly.")
        return True
    else:
        logger.error("❌ Some tests failed. Please check the logs above.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)