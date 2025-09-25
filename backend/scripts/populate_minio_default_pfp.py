#!/usr/bin/env python3
"""
Script to populate minIO with the default profile picture.
Uploads default_pfp.png from frontend/public/entities to minIO with the ID 'default_pfp.png'.
"""

import sys
import logging
from pathlib import Path

# Add the backend directory to Python path
sys.path.append(str(Path(__file__).parent.parent))

from app.services.minio_image_service import minio_service

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def populate_minio_with_default_pfp():
    """
    Upload the default profile picture to minIO.
    """
    try:
        # Path to the default profile picture in frontend
        default_pfp_path = Path(__file__).parent.parent.parent / "frontend" / "public" / "entities" / "default_pfp.png"
        
        # Check if file exists
        if not default_pfp_path.exists():
            logger.error(f"❌ Default profile picture not found at: {default_pfp_path}")
            return False
            
        logger.info(f"📁 Found default profile picture at: {default_pfp_path}")
        
        # Read the file
        with open(default_pfp_path, 'rb') as pfp_file:
            logger.info("📤 Uploading default_pfp.png to minIO...")
            
            # Upload to minIO with specific ID
            image_id = minio_service.store_image_with_id(
                image_data=pfp_file,
                image_id="default_pfp.png",
                content_type="image/png"
            )
            
            logger.info(f"✅ Successfully uploaded default profile picture with ID: {image_id}")
            
        # Test that we can retrieve the image
        logger.info("🔍 Testing image retrieval...")
        url = minio_service.get_image_url("default_pfp.png")
        logger.info(f"✅ Default profile picture URL: {url}")
        
        # Test that None resolves to default
        logger.info("🔍 Testing None resolution...")
        default_url = minio_service.get_image_url(None)
        logger.info(f"✅ None resolves to URL: {default_url}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Error uploading default profile picture: {e}")
        return False

def main():
    """Main function to run the population script."""
    print("🖼️  Populating minIO with default profile picture")
    print("=" * 55)
    
    try:
        # Test minIO connection first
        logger.info("🔌 Testing minIO connection...")
        
        # Try to check if bucket exists (this will test the connection)
        bucket_exists = minio_service.client.bucket_exists(minio_service.bucket_name)
        logger.info(f"✅ Connected to minIO. Bucket '{minio_service.bucket_name}' exists: {bucket_exists}")
        
        # Upload the default profile picture
        success = populate_minio_with_default_pfp()
        
        if success:
            print("\n🎉 minIO population completed successfully!")
            print("   Default profile picture is now available at ID: default_pfp.png")
            print("   Users with None as user_picture_url will get the default image")
        else:
            print("\n❌ minIO population failed. Please check the logs above.")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"❌ Failed to connect to minIO: {e}")
        print("\n❌ Cannot connect to minIO. Please ensure:")
        print("   1. minIO server is running (docker-compose up)")
        print("   2. Environment variables are set correctly")
        print("   3. minIO credentials are valid")
        sys.exit(1)

if __name__ == "__main__":
    main()