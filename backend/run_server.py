#!/usr/bin/env python3
"""
D    print(f"📁 Loading config from: {env_file}")
    print(f"🚀 Starting Group Study Idle App Backend on port {port}")
    print(f"📝 Debug mode: {debug}")
    print(f"🔗 Server will be available at: http://{host}:{port}")
    print("-" * 50)pment server launcher for the Group Study Idle App backend.
Run this file from the backend directory to start the development server.
"""

import os
import sys
import uvicorn
from pathlib import Path
from dotenv import load_dotenv

# Add the backend directory to Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

# Load environment variables from config/.env
config_dir = Path(backend_dir) / "config"
env_file = config_dir / ".env"
load_dotenv(env_file)

if __name__ == "__main__":
    # Configuration
    port = int(os.environ.get("PORT", "8000"))
    debug = os.environ.get("DEBUG", "true").lower() == "true"
    host = os.environ.get("HOST", "0.0.0.0")
    log_level = os.environ.get("LOG_LEVEL", "info").lower()  # Ensure lowercase
    
    print(f"� Loading config from: {env_file}")
    print(f"�🚀 Starting Group Study Idle App Backend on port {port}")
    print(f"📝 Debug mode: {debug}")
    print(f"🔗 Server will be available at: http://{host}:{port}")
    print("-" * 50)
    
    # Start the server
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=debug,
        log_level=log_level
    )
