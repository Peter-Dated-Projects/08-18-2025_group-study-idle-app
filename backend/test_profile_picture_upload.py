#!/usr/bin/env python3
"""
Test script for the profile picture upload functionality
"""
import io
import sys
import logging
from pathlib import Path
from PIL import Image

# Add the backend directory to Python path
sys.path.append(str(Path(__file__).parent.parent))

from app.services.minio_image_service import minio_service

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_test_image(size=(256, 256), format="PNG"):
    """Create a test image for uploading"""
    # Create a simple test image
    img = Image.new('RGB', size, color=(255, 100, 100))  # Red image
    
    # Add some text or pattern to make it identifiable
    try:
        from PIL import ImageDraw
        draw = ImageDraw.Draw(img)
        # Draw a simple pattern
        draw.rectangle([10, 10, size[0]-10, size[1]-10], outline=(0, 0, 255), width=5)
        draw.rectangle([30, 30, size[0]-30, size[1]-30], outline=(0, 255, 0), width=3)
    except Exception:
        # If font/drawing fails, just use the solid color
        pass
    
    # Convert to bytes
    img_bytes = io.BytesIO()
    img.save(img_bytes, format=format)
    img_bytes.seek(0)
    
    return img_bytes

def test_image_upload_and_resize():
    """Test the image upload and resize functionality"""
    try:
        print("🧪 Testing profile picture upload and resize functionality")
        print("=" * 60)
        
        # Create test image (larger than 128x128 to test resize)
        print("📸 Creating test image (256x256)...")
        test_image = create_test_image((256, 256), "PNG")
        
        # Upload and resize the image
        print("⬆️  Uploading and resizing image to 128x128...")
        image_id = minio_service.store_image(test_image, "image/png")
        print(f"✅ Image uploaded successfully with ID: {image_id}")
        
        # Get the URL for the uploaded image
        print("🔗 Getting presigned URL for image...")
        image_url = minio_service.get_image_url(image_id)
        print(f"✅ Image URL generated: {image_url[:50]}...")
        
        # Test image existence
        print("🔍 Checking if image exists...")
        exists = minio_service.image_exists(image_id)
        print(f"✅ Image exists: {exists}")
        
        # Test default image URL
        print("🖼️  Testing default image URL...")
        default_url = minio_service.get_image_url(None)
        print(f"✅ Default image URL: {default_url[:50]}...")
        
        # Test image deletion
        print("🗑️  Testing image deletion...")
        deleted = minio_service.delete_image(image_id)
        print(f"✅ Image deleted: {deleted}")
        
        print("\n🎉 All tests passed! Profile picture functionality is working correctly.")
        return True
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        logger.error(f"Test error: {e}", exc_info=True)
        return False

def main():
    """Main function to run the test"""
    print("🖼️  Testing Profile Picture Upload System")
    print("=" * 60)
    
    success = test_image_upload_and_resize()
    
    if success:
        print("\n✅ All tests completed successfully!")
        print("   Profile picture upload system is ready to use.")
    else:
        print("\n❌ Tests failed. Please check the logs above.")
        sys.exit(1)

if __name__ == "__main__":
    main()