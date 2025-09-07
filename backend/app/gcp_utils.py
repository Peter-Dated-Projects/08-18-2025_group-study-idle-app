#!/usr/bin/env python3
"""
Google Cloud Platform utilities for database management.
"""
import os
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


def check_gcp_instance_status() -> Dict[str, Any]:
    """
    Check the status of the GCP Cloud SQL instance.
    Returns information about the instance state and suggestions.
    """
    instance_connection_name = os.getenv("INSTANCE_CONNECTION_NAME")
    instance_is_gcp = os.getenv("INSTANCE_IS_GCP", "false").lower() == "true"
    
    result = {
        "is_gcp_configured": instance_is_gcp,
        "instance_connection_name": instance_connection_name,
        "suggestions": [],
        "status": "unknown"
    }
    
    if not instance_is_gcp:
        result["status"] = "local_mode"
        result["suggestions"].append("Running in local mode (INSTANCE_IS_GCP=false)")
        return result
    
    if not instance_connection_name:
        result["status"] = "misconfigured"
        result["suggestions"].extend([
            "INSTANCE_IS_GCP=true but INSTANCE_CONNECTION_NAME not set",
            "Set INSTANCE_CONNECTION_NAME to your Cloud SQL instance connection name",
            "Format: project:region:instance-name"
        ])
        return result
    
    try:
        # Try to import Google Cloud libraries using the recommended approach
        import importlib.util
        spec = importlib.util.find_spec("google.cloud.sql.connector")
        if spec is not None:
            result["connector_available"] = True
            result["status"] = "configured"
            result["suggestions"].append("GCP Cloud SQL Connector is properly configured")
        else:
            raise ImportError("google.cloud.sql.connector not found")
        
        # You could add more detailed checks here if needed
        
    except ImportError as e:
        result["connector_available"] = False
        result["status"] = "missing_dependencies"
        result["suggestions"].extend([
            f"Google Cloud SQL Connector not available: {e}",
            "Install with: pip install google-cloud-sql-connector[pg8000]"
        ])
    except Exception as e:
        result["status"] = "error"
        result["suggestions"].append(f"Error checking GCP status: {e}")
    
    return result


def suggest_database_config() -> Dict[str, str]:
    """
    Suggest appropriate database configuration based on current environment.
    """
    instance_is_gcp = os.getenv("INSTANCE_IS_GCP", "false").lower() == "true"
    instance_connection_name = os.getenv("INSTANCE_CONNECTION_NAME")
    use_cloud_sql_proxy = os.getenv("USE_CLOUD_SQL_PROXY", "false").lower() == "true"
    
    suggestions = {}
    
    if instance_is_gcp:
        if instance_connection_name:
            if use_cloud_sql_proxy:
                suggestions["mode"] = "GCP with Cloud SQL Proxy"
                suggestions["description"] = "Using Cloud SQL Proxy for GCP instance"
                suggestions["requirements"] = "Cloud SQL Proxy must be running"
            else:
                suggestions["mode"] = "GCP with Cloud SQL Connector"
                suggestions["description"] = "Using Cloud SQL Connector for GCP instance"
                suggestions["requirements"] = "Instance must be running and accessible"
        else:
            suggestions["mode"] = "Misconfigured GCP"
            suggestions["description"] = "INSTANCE_IS_GCP=true but no connection name"
            suggestions["fix"] = "Set INSTANCE_CONNECTION_NAME environment variable"
    else:
        if use_cloud_sql_proxy:
            suggestions["mode"] = "Local with Cloud SQL Proxy"
            suggestions["description"] = "Using Cloud SQL Proxy for local development"
        else:
            suggestions["mode"] = "Local Direct Connection"
            suggestions["description"] = "Direct TCP connection to database"
    
    return suggestions


def print_gcp_diagnostics():
    """Print comprehensive GCP database configuration diagnostics."""
    print("=== GCP Database Configuration Diagnostics ===\n")
    
    # Environment variables
    print("Environment Variables:")
    env_vars = [
        "INSTANCE_IS_GCP",
        "INSTANCE_CONNECTION_NAME", 
        "USE_CLOUD_SQL_PROXY",
        "DB_HOST",
        "DB_PORT",
        "DB_USER",
        "DB_NAME"
    ]
    
    for var in env_vars:
        value = os.getenv(var, "Not set")
        if var in ["DB_PASSWORD"]:  # Sensitive vars
            print(f"  {var}: {'[SET]' if value != 'Not set' else '[NOT SET]'}")
        else:
            print(f"  {var}: {value}")
    
    print()
    
    # Instance status check
    status = check_gcp_instance_status()
    print(f"Instance Status: {status['status']}")
    print(f"GCP Mode: {status['is_gcp_configured']}")
    print(f"Connection Name: {status['instance_connection_name']}")
    
    if status.get('connector_available') is not None:
        print(f"Connector Available: {status['connector_available']}")
    
    print("\nSuggestions:")
    for suggestion in status['suggestions']:
        print(f"  • {suggestion}")
    
    print()
    
    # Configuration suggestions
    config_suggestions = suggest_database_config()
    print(f"Current Mode: {config_suggestions['mode']}")
    print(f"Description: {config_suggestions['description']}")
    
    if 'requirements' in config_suggestions:
        print(f"Requirements: {config_suggestions['requirements']}")
    
    if 'fix' in config_suggestions:
        print(f"Fix: {config_suggestions['fix']}")


if __name__ == "__main__":
    # Load environment if running directly
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass
    
    print_gcp_diagnostics()
