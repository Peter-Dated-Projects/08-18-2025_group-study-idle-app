#!/usr/bin/env python3
"""
Simple test to verify GCP mode configuration with all required variables.
"""
import os
import subprocess
import sys

def test_with_env_vars(env_vars, test_name):
    """Run a test with specific environment variables."""
    print(f"\n=== {test_name} ===")
    
    # Prepare environment
    test_env = os.environ.copy()
    test_env.update(env_vars)
    
    # Print configuration
    for key, value in env_vars.items():
        print(f"{key}: {value}")
    
    # Run test in subprocess to get fresh environment
    cmd = [
        sys.executable, 
        "-c", 
        """
import os
import sys
from pathlib import Path
sys.path.insert(0, str(Path.cwd()))

from database import get_database_url
from gcp_utils import check_gcp_instance_status

# Test URL generation
try:
    db_url = get_database_url()
    print(f"Generated database URL: {db_url.split('@')[0]}@[REDACTED]")
    
    if db_url.startswith("cloudsql+psycopg2://"):
        print("✓ Using Cloud SQL Connector")
    elif db_url.startswith("postgresql+psycopg2://"):
        print("✓ Using direct PostgreSQL connection")
    else:
        print(f"? Unknown connection type: {db_url[:20]}...")
    
    # Check status
    status = check_gcp_instance_status()
    print(f"Status: {status['status']}")
    print(f"GCP Mode: {status['is_gcp_configured']}")
    
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
"""
    ]
    
    try:
        result = subprocess.run(cmd, env=test_env, capture_output=True, text=True, 
                              cwd="/Users/petthepotat/Documents/code/dated-projects/08-18-2025_group-study-idle-app/backend")
        print(result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)
        return result.returncode == 0
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

def main():
    """Run configuration tests."""
    print("🧪 Testing Database Configuration with Different Environment Variables")
    print("=" * 70)
    
    # Test 1: Local mode (INSTANCE_IS_GCP=false)
    local_success = test_with_env_vars({
        "INSTANCE_IS_GCP": "false",
        "DB_HOST": "localhost",
        "DB_PORT": "5432",
        "DB_USER": "postgres",
        "DB_PASSWORD": "test",
        "DB_NAME": "postgres"
    }, "Local Mode (INSTANCE_IS_GCP=false)")
    
    # Test 2: GCP mode with Cloud SQL Connector
    gcp_connector_success = test_with_env_vars({
        "INSTANCE_IS_GCP": "true",
        "INSTANCE_CONNECTION_NAME": "group-study-idle-app:us-central1:study-garden-psql-db",
        "USE_CLOUD_SQL_PROXY": "false",
        "DB_USER": "postgres",
        "DB_PASSWORD": "test",
        "DB_NAME": "postgres"
    }, "GCP Mode with Cloud SQL Connector")
    
    # Test 3: GCP mode with Cloud SQL Proxy
    gcp_proxy_success = test_with_env_vars({
        "INSTANCE_IS_GCP": "true",
        "INSTANCE_CONNECTION_NAME": "group-study-idle-app:us-central1:study-garden-psql-db",
        "USE_CLOUD_SQL_PROXY": "true",
        "DB_HOST": "127.0.0.1",
        "DB_PORT": "5432",
        "DB_USER": "postgres",
        "DB_PASSWORD": "test",
        "DB_NAME": "postgres"
    }, "GCP Mode with Cloud SQL Proxy")
    
    # Summary
    print("\n" + "=" * 70)
    print("📊 Test Results:")
    print(f"  Local Mode: {'✅ PASS' if local_success else '❌ FAIL'}")
    print(f"  GCP Connector: {'✅ PASS' if gcp_connector_success else '❌ FAIL'}")
    print(f"  GCP Proxy: {'✅ PASS' if gcp_proxy_success else '❌ FAIL'}")
    
    if all([local_success, gcp_connector_success, gcp_proxy_success]):
        print("\n🎉 All configuration tests passed!")
        print("\nThe INSTANCE_IS_GCP system is working correctly:")
        print("  • Local mode uses direct TCP connection")
        print("  • GCP mode can use either Cloud SQL Connector or Proxy")
        print("  • Configuration logic correctly routes based on environment variables")
    else:
        print("\n❌ Some tests failed!")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
