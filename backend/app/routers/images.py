"""
Image management router for handling profile picture uploads, retrieval, and deletion.
"""

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from fastapi.responses import JSONResponse

try:
    from ..services.minio_image_service import minio_service
except ImportError:
    from services.minio_image_service import minio_service

router = APIRouter(prefix="/images", tags=["images"])
logger = logging.getLogger(__name__)

@router.get("/health")
async def image_service_health():
    """Health check for image service."""
    return {"status": "healthy", "service": "image_service"}

@router.get("/{image_id}")
async def get_image_url(image_id: str = None):
    """
    Get a presigned URL for an image by its ID.
    If image_id is None or "default", returns the default profile picture URL.
    """
    try:
        # Handle None case (when URL path is literally "None" or similar)
        if image_id and image_id.lower() in ["none", "null"]:
            image_id = None
            
        url = minio_service.get_image_url(image_id)
        
        return {
            "success": True,
            "image_id": image_id if image_id else "default_pfp.png",
            "url": url
        }
        
    except Exception as e:
        logger.error(f"Error getting image URL: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve image URL")

@router.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    """
    Upload a new image and get back an image_id.
    Expected file format: PNG, JPG, JPEG
    Expected size: 128x128 pixels (not enforced here, but recommended)
    """
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Supported formats
        supported_types = ["image/png", "image/jpeg", "image/jpg"]
        if file.content_type not in supported_types:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported image type. Supported: {', '.join(supported_types)}"
            )
        
        # Store image
        image_id = minio_service.store_image(file.file, file.content_type)
        
        return {
            "success": True,
            "image_id": image_id,
            "message": "Image uploaded successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading image: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload image")

@router.delete("/{image_id}")
async def delete_image(image_id: str):
    """
    Delete an image by its ID.
    Cannot delete the default profile picture.
    """
    try:
        if not image_id:
            raise HTTPException(status_code=400, detail="Image ID is required")
            
        success = minio_service.delete_image(image_id)
        
        if not success:
            if image_id == "default_pfp.png":
                raise HTTPException(status_code=403, detail="Cannot delete default profile picture")
            else:
                raise HTTPException(status_code=404, detail="Image not found or could not be deleted")
        
        return {
            "success": True,
            "message": f"Image {image_id} deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting image: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete image")

@router.get("/{image_id}/exists")
async def check_image_exists(image_id: str):
    """
    Check if an image exists by its ID.
    """
    try:
        exists = minio_service.image_exists(image_id)
        
        return {
            "success": True,
            "image_id": image_id,
            "exists": exists
        }
        
    except Exception as e:
        logger.error(f"Error checking image existence: {e}")
        raise HTTPException(status_code=500, detail="Failed to check image existence")