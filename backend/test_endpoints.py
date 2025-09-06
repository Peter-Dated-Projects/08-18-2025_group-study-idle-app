#!/usr/bin/env python3
"""
Simple test script to verify the FastAPI endpoints are working.
"""

import requests
import json

BASE_URL = "http://localhost:5000"

def test_health():
    """Test the health endpoint."""
    try:
        response = requests.get(f"{BASE_URL}/healthz")
        print(f"Health Check - Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

def test_readiness():
    """Test the readiness endpoint."""
    try:
        response = requests.get(f"{BASE_URL}/ready")
        print(f"Readiness Check - Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"Readiness check failed: {e}")
        return False

def test_create_lobby():
    """Test the create lobby endpoint."""
    try:
        response = requests.get(f"{BASE_URL}/api/hosting/create")
        print(f"Create Lobby - Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"Create lobby test failed: {e}")
        return False

def test_join_lobby():
    """Test the join lobby endpoint."""
    try:
        response = requests.get(f"{BASE_URL}/api/hosting/join?lobby_id=test-lobby-123")
        print(f"Join Lobby - Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"Join lobby test failed: {e}")
        return False

def test_join_lobby_no_id():
    """Test the join lobby endpoint without lobby_id."""
    try:
        response = requests.get(f"{BASE_URL}/api/hosting/join")
        print(f"Join Lobby (no ID) - Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 400  # Should return error
    except Exception as e:
        print(f"Join lobby (no ID) test failed: {e}")
        return False

if __name__ == "__main__":
    print("Testing FastAPI Backend Endpoints")
    print("=" * 50)
    
    tests = [
        ("Health Check", test_health),
        ("Readiness Check", test_readiness),
        ("Create Lobby", test_create_lobby),
        ("Join Lobby", test_join_lobby),
        ("Join Lobby (No ID)", test_join_lobby_no_id),
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n--- {test_name} ---")
        result = test_func()
        results.append((test_name, result))
        print(f"Result: {'✅ PASS' if result else '❌ FAIL'}")
    
    print("\n" + "=" * 50)
    print("Test Summary:")
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name}: {status}")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    print(f"\nTotal: {passed}/{total} tests passed")
