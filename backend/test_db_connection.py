#!/usr/bin/env python3
"""
Database connection test script for Cloud SQL integration.
Run this to verify your database configuration is working correctly.
"""
import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv

# Load environment variables
env_path = backend_dir / '.env'
if env_path.exists():
    load_dotenv(env_path)
    print(f"✓ Loaded environment from {env_path}")
else:
    print(f"⚠ No .env file found at {env_path}")

print("\n=== Database Configuration Test ===")
print(f"INSTANCE_CONNECTION_NAME: {os.getenv('INSTANCE_CONNECTION_NAME', 'Not set')}")
print(f"USE_CLOUD_SQL_PROXY: {os.getenv('USE_CLOUD_SQL_PROXY', 'Not set')}")
print(f"DB_USER: {os.getenv('DB_USER', 'Not set')}")
print(f"DB_NAME: {os.getenv('DB_NAME', 'Not set')}")
print(f"DB_HOST: {os.getenv('DB_HOST', 'Not set')}")
print(f"DB_PORT: {os.getenv('DB_PORT', 'Not set')}")

try:
    from database import get_database_url, create_engine_with_cloud_sql, create_tables
    
    print("\n=== Testing Database Connection ===")
    
    # Test URL generation
    db_url = get_database_url()
    print(f"Generated database URL: {db_url.split('@')[0]}@[REDACTED]")
    
    # Test engine creation
    print("Creating database engine...")
    engine = create_engine_with_cloud_sql()
    print("✓ Database engine created successfully!")
    
    # Test connection
    print("Testing database connection...")
    with engine.connect() as connection:
        from sqlalchemy import text
        result = connection.execute(text("SELECT 1 as test"))
        test_value = result.scalar()
        if test_value == 1:
            print("✓ Database connection successful!")
        else:
            print("✗ Database connection test failed")
    
    # Test table creation
    print("Creating database tables...")
    create_tables()
    print("✓ Database tables created/verified successfully!")
    
    print("\n🎉 All database tests passed! Your Cloud SQL configuration is working correctly.")
    
except ImportError as e:
    print(f"\n✗ Import error: {e}")
    print("Make sure you've installed all dependencies with: pip install -r requirements.txt")
except Exception as e:
    print(f"\n✗ Database error: {e}")
    print("\nTroubleshooting tips:")
    print("1. If using Cloud SQL Proxy, make sure it's running: ./start-proxy.sh")
    print("2. Check your .env file configuration")
    print("3. Verify your Cloud SQL instance is running")
    print("4. Ensure you have the correct permissions")
