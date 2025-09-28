#!/usr/bin/env python3
"""
Test script to verify shop and balance API endpoints.
"""
import requests
import json

def test_shop_endpoints():
    """Test the shop and balance API endpoints."""
    base_url = "http://localhost:8000"
    
    print("Testing Shop and Balance API endpoints")
    
    # Test 1: Get balance
    print("\n1. Testing balance endpoint...")
    balance_response = requests.get(f"{base_url}/api/pomo-bank/balance", 
                                  cookies={"session_id": "your_session_here"})
    print(f"Balance response status: {balance_response.status_code}")
    print(f"Balance response: {balance_response.text}")
    
    # Test 2: Try a purchase
    print("\n2. Testing purchase endpoint...")
    purchase_data = {
        "user_id": "test_user",
        "structure_name": "chicken-coop",
        "price": 10
    }
    
    purchase_response = requests.post(
        f"{base_url}/api/shop/purchase",
        json=purchase_data,
        headers={"Content-Type": "application/json"},
        cookies={"session_id": "your_session_here"}
    )
    
    print(f"Purchase response status: {purchase_response.status_code}")
    print(f"Purchase response: {purchase_response.text}")

if __name__ == "__main__":
    test_shop_endpoints()