#!/usr/bin/env python3
"""
Test script to replicate the profile picture update error by sending a direct request to the endpoint.
"""

import requests
import json
import sys
from pathlib import Path

def test_profile_picture_update():
    """Test the profile picture update endpoint directly."""
    
    base_url = "http://localhost:8000"
    endpoint = "/api/users/update-profile-picture"
    url = f"{base_url}{endpoint}"
    
    # Test cases with different user ID formats
    test_cases = [
        {
            "name": "Standard user ID",
            "payload": {
                "user_id": "803db0b1a2085280bdc9a1ba40e5bfbef8f4c9723e423a7e505d3e33f9f762cd",
                "image_id": "test-image-123"
            }
        },
        {
            "name": "Empty user ID",
            "payload": {
                "user_id": "",
                "image_id": "test-image-123"
            }
        },
        {
            "name": "None user ID", 
            "payload": {
                "user_id": None,
                "image_id": "test-image-123"
            }
        },
        {
            "name": "Missing user_id field",
            "payload": {
                "image_id": "test-image-123"
            }
        }
    ]
    
    for test_case in test_cases:
        print(f"\n🧪 Testing: {test_case['name']}")
        print(f"   Payload: {test_case['payload']}")
        
        try:
            response = requests.post(
                url,
                json=test_case['payload'],
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            print(f"   Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ Success: {data}")
            else:
                error_text = response.text
                print(f"   ❌ Error: {error_text}")
                
                # Try to parse JSON error details
                try:
                    error_data = response.json()
                    print(f"   Error details: {error_data}")
                except:
                    pass
                    
        except requests.exceptions.ConnectionError:
            print(f"   ❌ Connection Error: Backend server not running")
            return False
        except requests.exceptions.Timeout:
            print(f"   ❌ Timeout Error: Request took too long")
        except Exception as e:
            print(f"   ❌ Unexpected Error: {e}")
    
    return True

def main():
    """Main function."""
    print("🔍 Testing Profile Picture Update Endpoint")
    print("=" * 60)
    print("Testing various payload formats to identify the 500 error cause")
    print("=" * 60)
    
    if test_profile_picture_update():
        print("\n✅ Tests completed. Check output above for errors.")
    else:
        print("\n❌ Could not connect to backend server.")
        print("   Make sure the backend is running on http://localhost:8000")
        sys.exit(1)

if __name__ == "__main__":
    main()