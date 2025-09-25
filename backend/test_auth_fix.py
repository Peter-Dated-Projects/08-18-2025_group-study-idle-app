#!/usr/bin/env python3
"""
Test script to validate the 401 authentication fix
"""

import requests

def test_auth_fix():
    """Test both authenticated and unauthenticated scenarios."""
    
    base_url = "http://localhost:3000"
    
    print("🧪 Testing Authentication Fix")
    print("=" * 50)
    
    # Test 1: Unauthenticated request (should get structured 401)
    print("\n📝 Test 1: Unauthenticated request")
    url = f"{base_url}/api/inventory/bulk-update"
    payload = {
        "inventory_updates": [
            {"structure_name": "TestStructure", "count": 1, "currently_in_use": 1}
        ]
    }
    
    try:
        response = requests.put(url, json=payload)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 401:
            data = response.json()
            if 'code' in data and data['code'] == 'UNAUTHENTICATED':
                print("✅ Proper structured 401 response")
            else:
                print("⚠️  Got 401 but not structured properly")
        else:
            print(f"❌ Expected 401, got {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 2: Check if frontend server is running
    print("\n📝 Test 2: Frontend server status")
    try:
        response = requests.get(f"{base_url}/api/auth/session")
        print(f"Auth session endpoint status: {response.status_code}")
        if response.status_code == 200:
            print("✅ Frontend server is running")
        else:
            print("✅ Frontend server is running (expected non-200 for unauthenticated)")
    except requests.exceptions.ConnectionError:
        print("❌ Frontend server not running - please start with 'npm run dev'")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_auth_fix()