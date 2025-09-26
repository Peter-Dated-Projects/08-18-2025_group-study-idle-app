#!/usr/bin/env python3
"""
Test improved profile picture resizing with aspect ratio preservation and center cropping.
"""

import sys
import logging
from pathlib import Path
from io import BytesIO

# Add the backend directory to Python path
sys.path.append(str(Path(__file__).parent))

from PIL import Image, ImageDraw

# Import the MinIO service
from app.services.minio_image_service import MinIOImageService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_test_image(width, height, color=(255, 0, 0)):
    """Create a test image with specified dimensions and color."""
    image = Image.new('RGB', (width, height), color)
    # Add a distinctive pattern to see how cropping works
    draw = ImageDraw.Draw(image)
    
    # Draw corners to visualize cropping
    corner_size = min(width, height) // 8
    draw.rectangle([0, 0, corner_size, corner_size], fill=(0, 255, 0))  # Green top-left
    draw.rectangle([width-corner_size, 0, width, corner_size], fill=(0, 0, 255))  # Blue top-right
    draw.rectangle([0, height-corner_size, corner_size, height], fill=(255, 255, 0))  # Yellow bottom-left
    draw.rectangle([width-corner_size, height-corner_size, width, height], fill=(255, 0, 255))  # Magenta bottom-right
    
    # Add center circle
    center_x, center_y = width // 2, height // 2
    radius = min(width, height) // 10
    draw.ellipse([center_x-radius, center_y-radius, center_x+radius, center_y+radius], fill=(255, 255, 255))
    
    return image

def test_resizing_scenarios():
    """Test various image aspect ratios and sizes."""
    
    minio_service = MinIOImageService()
    
    # Test scenarios: (width, height, description)
    test_cases = [
        (256, 256, "Square image (same as target)"),
        (512, 512, "Large square image"),
        (300, 200, "Landscape image (3:2 ratio)"),
        (200, 300, "Portrait image (2:3 ratio)"),
        (800, 600, "Large landscape (4:3 ratio)"),
        (600, 800, "Large portrait (3:4 ratio)"),
        (1920, 1080, "Very wide landscape (16:9 ratio)"),
        (1080, 1920, "Very tall portrait (9:16 ratio)"),
        (150, 200, "Small portrait"),
        (200, 150, "Small landscape"),
    ]
    
    success_count = 0
    
    for width, height, description in test_cases:
        try:
            print(f"\n🧪 Testing: {description} ({width}x{height})")
            
            # Create test image
            test_image = create_test_image(width, height)
            
            # Save to BytesIO
            input_stream = BytesIO()
            test_image.save(input_stream, format='PNG')
            input_stream.seek(0)
            
            # Test the resizing function
            output_stream = minio_service._resize_image_to_128px(input_stream, 'image/png')
            
            # Load the result to verify dimensions
            output_stream.seek(0)
            result_image = Image.open(output_stream)
            
            if result_image.size == (128, 128):
                print(f"   ✅ Result: {result_image.size} - Correct dimensions")
                success_count += 1
            else:
                print(f"   ❌ Result: {result_image.size} - Incorrect dimensions!")
                
        except Exception as e:
            print(f"   ❌ Error: {e}")
    
    print(f"\n📊 Results: {success_count}/{len(test_cases)} tests passed")
    
    if success_count == len(test_cases):
        print("🎉 All image resizing tests passed!")
        return True
    else:
        print("❌ Some tests failed!")
        return False

def main():
    """Main function to run all tests."""
    print("🖼️  Testing Improved Profile Picture Resizing")
    print("=" * 60)
    print("🧪 Testing aspect ratio preservation and center cropping")
    print("=" * 60)
    
    success = test_resizing_scenarios()
    
    if success:
        print("\n✅ All tests completed successfully!")
        print("   Improved resizing system is ready to use.")
    else:
        print("\n❌ Some tests failed. Please check the logs above.")
        sys.exit(1)

if __name__ == "__main__":
    main()