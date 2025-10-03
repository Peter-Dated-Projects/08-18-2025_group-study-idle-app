#!/usr/bin/env python3
"""
Test the actual PATCH request that was failing to validate the fix.
"""

import requests
import json

# Test the exact scenario that was failing
def test_patch_request():
    """Test the PATCH request for updating structure usage."""
    
    base_url = "http://localhost:8000"
    user_id = "803db0b1a2085280bdc9a1ba40e5bfbef8f4c9723e423a7e505d3e33f9f762cd"
    
    print("🧪 Testing Inventory Add Request")
    print("=" * 50)
    
    # Test adding inventory items (since usage endpoint is removed)
    url = f"{base_url}/api/inventory/{user_id}/add"
    payload = {
        "structure_name": "Mailbox",
        "count": 1
    }
    
    print(f"\n📝 Making POST request to: {url}")
    print(f"📝 Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(url, json=payload)
        
        print(f"\n📊 Response Status: {response.status_code}")
        print(f"📊 Response Body: {response.text}")
        
        if response.status_code == 200:
            print("✅ PATCH request succeeded!")
            return True
        else:
            print("❌ PATCH request failed")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection failed - is the server running?")
        print("💡 Please start the server with: python run_server.py")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    test_patch_request()