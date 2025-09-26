"""
Image management router for handling profile picture uploads, retrieval, and deletion.
"""

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Query, Depends
from fastapi.responses import JSONResponse

try:
    from ..services.minio_image_service import minio_service
except ImportError:
    from services.minio_image_service import minio_service

try:
    from ..services.user_service_arangodb import get_user_service, UserService
except ImportError:
    from services.user_service_arangodb import get_user_service, UserService

router = APIRouter(prefix="/images", tags=["images"])
logger = logging.getLogger(__name__)

@router.get("/health")
async def image_service_health():
    """Health check for image service."""
    return {"status": "healthy", "service": "image_service"}

@router.get("/user/{user_id}/info")
async def get_user_image_info(
    user_id: str,
    user_service: UserService = Depends(get_user_service)
):
    """
    Get comprehensive user image information including whether they have a custom profile picture.
    Returns both the URL and metadata about the image.
    """
    try:
        # Get user info from user service (includes user_picture_url from ArangoDB)
        user_info = user_service.get_user_info(user_id)
        
        if not user_info:
            logger.warning(f"User {user_id} not found in user service")
            image_id = None
            has_custom_picture = False
        else:
            # Get the user's picture URL (could be None)
            image_id = user_info.get('user_picture_url')
            has_custom_picture = image_id is not None
            logger.debug(f"User {user_id} has picture URL: {image_id}")
        
        # Get presigned URL from minIO (handles None -> default)
        url = minio_service.get_image_url(image_id)
        
        return {
            "success": True,
            "user_id": user_id,
            "image_id": image_id if image_id else "default_pfp.png",
            "url": url,
            "has_custom_picture": has_custom_picture,
            "is_default": not has_custom_picture
        }
        
    except Exception as e:
        logger.error(f"Error getting image info for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve user profile picture info")

@router.get("/user/{user_id}")
async def get_image_url_by_user_id(
    user_id: str,
    user_service: UserService = Depends(get_user_service)
):
    """
    Get a presigned URL for a user's profile picture by fetching their user_picture_url from the user service.
    If user has no picture URL set, returns the default profile picture URL.
    """
    try:
        # Get user info from user service (includes user_picture_url from ArangoDB)
        user_info = user_service.get_user_info(user_id)
        
        if not user_info:
            logger.warning(f"User {user_id} not found in user service, returning default image")
            image_id = None  # Will return default
        else:
            # Get the user's picture URL (could be None)
            image_id = user_info.get('user_picture_url')
            logger.debug(f"User {user_id} has picture URL: {image_id}")
        
        # Get presigned URL from minIO (handles None -> default)
        url = minio_service.get_image_url(image_id)
        
        return {
            "success": True,
            "user_id": user_id,
            "image_id": image_id if image_id else "default_pfp.png",
            "url": url
        }
        
    except Exception as e:
        logger.error(f"Error getting image URL for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve user profile picture URL")

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

@router.post("/upload/profile")
async def upload_profile_picture(
    file: UploadFile = File(...),
    user_service: UserService = Depends(get_user_service)
):
    """
    Upload a new profile picture, resize it to 128x128, and update user's profile picture URL.
    This endpoint combines upload with user profile update.
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
        
        # Store image (automatically resizes to 128x128)
        image_id = minio_service.store_image(file.file, file.content_type)
        
        # Get the URL for the uploaded image
        image_url = minio_service.get_image_url(image_id)
        
        return {
            "success": True,
            "image_id": image_id,
            "url": image_url,
            "message": "Profile picture uploaded and resized successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading profile picture: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload profile picture")

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

@router.delete("/user/{user_id}/profile")
async def remove_user_profile_picture(
    user_id: str,
    user_service: UserService = Depends(get_user_service)
):
    """
    Remove a user's custom profile picture and set them back to default.
    Also deletes the image file from minIO if it exists.
    """
    try:
        # Get current user info to find their current picture
        user_info = user_service.get_user_info(user_id)
        
        if user_info:
            current_image_id = user_info.get('user_picture_url')
            if current_image_id:
                # Delete the image from minIO
                delete_success = minio_service.delete_image(current_image_id)
                if not delete_success:
                    logger.warning(f"Failed to delete image {current_image_id} from minIO")
        
        # Update user to have no custom profile picture (will use default)
        update_success = user_service.update_user_picture_url(user_id, None)
        
        if not update_success:
            raise HTTPException(status_code=500, detail="Failed to update user profile picture")
        
        # Get default image URL
        default_url = minio_service.get_image_url(None)
        
        return {
            "success": True,
            "message": "Profile picture removed successfully, using default",
            "user_id": user_id,
            "image_id": "default_pfp.png",
            "url": default_url,
            "has_custom_picture": False,
            "is_default": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing profile picture for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to remove profile picture")

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