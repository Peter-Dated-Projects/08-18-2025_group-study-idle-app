#!/usr/bin/env python3
"""
Test script to verify level config update functionality.
"""
import requests
import json

def test_level_config_update():
    """Test the level config update endpoint directly."""
    base_url = "http://localhost:8000"
    test_user_id = "803db0b1a2085280bdc9a1ba40e5bfbef8f4c9723e423a7e505d3e33f9f762cd"
    
    print(f"Testing level config update for user: {test_user_id}")
    
    # First, get the current config
    print("\n1. Getting current config...")
    get_response = requests.get(f"{base_url}/api/level-config/{test_user_id}")
    if get_response.status_code == 200:
        current_data = get_response.json()
        print(f"Current config: {current_data}")
        current_config = current_data.get('data', {}).get('level_config', [])
        if isinstance(current_config, str):
            current_config = json.loads(current_config)
        print(f"Parsed current config: {current_config}")
    else:
        print(f"Failed to get current config: {get_response.status_code}")
        return
    
    # Test updating a specific slot
    print("\n2. Updating slot 0 to 'mailbox'...")
    update_data = {
        "slot_index": 0,
        "structure_id": "mailbox"
    }
    
    update_response = requests.patch(
        f"{base_url}/api/level-config/{test_user_id}/slot",
        json=update_data,
        headers={"Content-Type": "application/json"}
    )
    
    print(f"Update response status: {update_response.status_code}")
    if update_response.status_code == 200:
        update_result = update_response.json()
        print(f"Update result: {update_result}")
        
        updated_config = update_result.get('data', {}).get('level_config', [])
        if isinstance(updated_config, str):
            updated_config = json.loads(updated_config)
        print(f"Updated config: {updated_config}")
    else:
        print(f"Update failed: {update_response.text}")
        return
    
    # Verify the change persisted by getting config again
    print("\n3. Verifying persistence...")
    verify_response = requests.get(f"{base_url}/api/level-config/{test_user_id}")
    if verify_response.status_code == 200:
        verify_data = verify_response.json()
        verify_config = verify_data.get('data', {}).get('level_config', [])
        if isinstance(verify_config, str):
            verify_config = json.loads(verify_config)
        print(f"Verified config: {verify_config}")
        
        if verify_config[0] == "mailbox":
            print("✅ SUCCESS: Change persisted correctly!")
        else:
            print("❌ FAILED: Change did not persist")
    else:
        print(f"Failed to verify: {verify_response.status_code}")

if __name__ == "__main__":
    test_level_config_update()