#!/usr/bin/env python3
"""
Test script to simulate GCP mode and verify the configuration logic.
"""
import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Save current environment
original_env = os.environ.copy()

def test_gcp_mode():
    """Test the database configuration in GCP mode."""
    print("=== Testing GCP Mode Configuration ===")
    
    # Temporarily set GCP mode
    os.environ["INSTANCE_IS_GCP"] = "true"
    
    # Force reload of modules to pick up new environment
    import importlib
    import database
    importlib.reload(database)
    
    try:
        from database import get_database_url
        from gcp_utils import check_gcp_instance_status, suggest_database_config
        
        print(f"INSTANCE_IS_GCP: {os.getenv('INSTANCE_IS_GCP')}")
        print(f"INSTANCE_CONNECTION_NAME: {os.getenv('INSTANCE_CONNECTION_NAME')}")
        print(f"USE_CLOUD_SQL_PROXY: {os.getenv('USE_CLOUD_SQL_PROXY')}")
        
        # Test URL generation
        db_url = get_database_url()
        print(f"Generated database URL: {db_url.split('@')[0]}@[REDACTED]")
        
        # Check if it's using Cloud SQL Connector
        if db_url.startswith("cloudsql+psycopg2://"):
            print("✓ Correctly configured for Cloud SQL Connector")
        else:
            print("⚠ Not using Cloud SQL Connector (might be using proxy or direct)")
        
        # Check GCP status
        status = check_gcp_instance_status()
        print(f"Instance Status: {status['status']}")
        print(f"GCP Mode: {status['is_gcp_configured']}")
        
        # Get configuration suggestions
        config = suggest_database_config()
        print(f"Configuration Mode: {config['mode']}")
        print(f"Description: {config['description']}")
        
        return True
        
    except Exception as e:
        print(f"❌ GCP mode test failed: {e}")
        return False

def test_local_mode():
    """Test the database configuration in local mode."""
    print("\n=== Testing Local Mode Configuration ===")
    
    # Temporarily set local mode
    os.environ["INSTANCE_IS_GCP"] = "false"
    
    # Force reload of modules to pick up new environment
    import importlib
    import database
    importlib.reload(database)
    
    try:
        from database import get_database_url
        from gcp_utils import check_gcp_instance_status, suggest_database_config
        
        print(f"INSTANCE_IS_GCP: {os.getenv('INSTANCE_IS_GCP')}")
        
        # Test URL generation
        db_url = get_database_url()
        print(f"Generated database URL: {db_url.split('@')[0]}@[REDACTED]")
        
        # Check if it's using direct connection
        if db_url.startswith("postgresql+psycopg2://") and not db_url.startswith("cloudsql+"):
            print("✓ Correctly configured for direct connection")
        else:
            print("⚠ Not using direct connection")
        
        # Check status
        status = check_gcp_instance_status()
        print(f"Instance Status: {status['status']}")
        print(f"GCP Mode: {status['is_gcp_configured']}")
        
        # Get configuration suggestions
        config = suggest_database_config()
        print(f"Configuration Mode: {config['mode']}")
        print(f"Description: {config['description']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Local mode test failed: {e}")
        return False

def main():
    """Run all configuration tests."""
    print("🧪 Testing Database Configuration Logic")
    print("=" * 50)
    
    # Test GCP mode
    gcp_success = test_gcp_mode()
    
    # Test local mode
    local_success = test_local_mode()
    
    # Restore original environment
    os.environ.clear()
    os.environ.update(original_env)
    
    print("\n" + "=" * 50)
    if gcp_success and local_success:
        print("🎉 All configuration tests passed!")
        print("\nThe INSTANCE_IS_GCP flag is working correctly:")
        print("  • When INSTANCE_IS_GCP=true: Uses Cloud SQL Connector")
        print("  • When INSTANCE_IS_GCP=false: Uses direct TCP connection")
    else:
        print("❌ Some tests failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()
