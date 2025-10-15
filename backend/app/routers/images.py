"""
Image management router for handling profile picture uploads, retrieval, and deletion.
"""

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Query, Depends, Response
from fastapi.responses import JSONResponse
import hashlib

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


def add_cache_headers(response: Response, max_age: int = 2700):
    """
    Add HTTP cache headers to the response.
    
    Args:
        response: FastAPI Response object
        max_age: Cache max-age in seconds (default 45 minutes = 2700 seconds)
    """
    response.headers["Cache-Control"] = f"public, max-age={max_age}, s-maxage={max_age}"
    response.headers["Vary"] = "Accept-Encoding"
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Max-Age"] = "86400"


def generate_etag(data: str) -> str:
    """Generate an ETag for the response."""
    return f'"{hashlib.md5(data.encode()).hexdigest()}"'

@router.get("/health")
async def image_service_health():
    """Health check for image service."""
    return {"status": "healthy", "service": "image_service"}

@router.get("/user/{user_id}/info")
async def get_user_image_info(
    user_id: str,
    response: Response,
    user_service: UserService = Depends(get_user_service)
):
    """
    Get comprehensive user image information including whether they have a custom profile picture.
    Returns both the URL and metadata about the image.
    The URL is already a full MinIO presigned URL stored in the database.
    """
    try:
        # Get user info from user service (includes user_picture_url from ArangoDB)
        user_info = user_service.get_user_info(user_id)
        
        if not user_info:
            logger.error(f"User {user_id} not found in user service")
            raise HTTPException(status_code=404, detail=f"User {user_id} not found")
        
        # Get the user's picture URL (should be image_id)
        stored_value = user_info.get('user_picture_url')
        
        if not stored_value:
            logger.error(f"User {user_id} has no profile picture set in database")
            raise HTTPException(status_code=404, detail=f"User {user_id} has no profile picture")
        
        logger.debug(f"User {user_id} has stored value: {stored_value}")
        
        # Check if stored_value is a full URL (backwards compatibility) or image_id
        if 'http://' in stored_value or 'https://' in stored_value:
            # Old format: full URL stored - extract image_id and generate fresh URL
            image_id = stored_value.split('/')[-1].split('?')[0]
            logger.info(f"Converting old URL format to image_id: {image_id}")
        else:
            # New format: image_id stored - use it directly
            image_id = stored_value
        
        # Generate fresh presigned URL from image_id
        try:
            picture_url = minio_service.get_image_url(image_id)
        except Exception as e:
            logger.error(f"Failed to get image URL for {image_id}: {e}")
            raise HTTPException(status_code=404, detail=f"Profile picture not found in storage")
        
        # Add cache headers (45 minutes)
        add_cache_headers(response, max_age=2700)
        
        result = {
            "success": True,
            "user_id": user_id,
            "image_id": image_id,
            "url": picture_url,
            "has_custom_picture": True,
            "is_default": False
        }
        
        # Add ETag
        response.headers["ETag"] = generate_etag(picture_url)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting image info for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve user profile picture info")

@router.get("/user/{user_id}")
async def get_user_image_url(
    user_id: str,
    response: Response,
    user_service: UserService = Depends(get_user_service)
):
    """
    Get the profile picture URL for a user by fetching their user_picture_url from the database.
    Generates fresh presigned URLs from stored image_id.
    """
    try:
        # Get user info from user service (includes user_picture_url from ArangoDB)
        user_info = user_service.get_user_info(user_id)
        
        if not user_info:
            logger.error(f"User {user_id} not found in user service")
            raise HTTPException(status_code=404, detail=f"User {user_id} not found")
        
        # Get the stored value (should be image_id)
        stored_value = user_info.get('user_picture_url')
        
        if not stored_value:
            logger.error(f"User {user_id} has no profile picture set in database")
            raise HTTPException(status_code=404, detail=f"User {user_id} has no profile picture")
        
        logger.debug(f"User {user_id} has stored value: {stored_value}")
        
        # Check if stored_value is a full URL (backwards compatibility) or image_id
        if 'http://' in stored_value or 'https://' in stored_value:
            # Old format: full URL stored - extract image_id and generate fresh URL
            image_id = stored_value.split('/')[-1].split('?')[0]
            logger.info(f"Converting old URL format to image_id: {image_id}")
        else:
            # New format: image_id stored - use it directly
            image_id = stored_value
        
        # Generate fresh presigned URL from image_id
        try:
            picture_url = minio_service.get_image_url(image_id)
        except Exception as e:
            logger.error(f"Failed to get image URL for {image_id}: {e}")
            raise HTTPException(status_code=404, detail=f"Profile picture not found in storage")
        
        # Add cache headers (45 minutes)
        add_cache_headers(response, max_age=2700)
        
        result = {
            "success": True,
            "user_id": user_id,
            "image_id": image_id,
            "url": picture_url
        }
        
        logger.info(f"Successfully retrieved image URL for user {user_id}: {image_id}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching image for user {user_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching image: {str(e)}")

@router.get("/{image_id}")
async def get_image_url(image_id: str = None, response: Response = None):
    """
    Get a presigned URL for an image by its ID.
    """
    try:
        # Validate image_id
        if not image_id or image_id.lower() in ["none", "null"]:
            raise HTTPException(status_code=400, detail="Valid image_id is required")
        
        try:
            url = minio_service.get_image_url(image_id)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            logger.error(f"Failed to get image URL for {image_id}: {e}")
            raise HTTPException(status_code=404, detail="Image not found in storage")
        
        # Add cache headers (45 minutes)
        if response:
            add_cache_headers(response, max_age=2700)
            response.headers["ETag"] = generate_etag(url)
        
        return {
            "success": True,
            "image_id": image_id,
            "url": url
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting image URL: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve image URL")

@router.post("/upload/profile")
async def upload_profile_picture(
    file: UploadFile = File(...),
    user_id: str = None,  # Optional user_id to enable old image deletion
    user_service: UserService = Depends(get_user_service)
):
    """
    Upload a new profile picture, resize it to 128x128, and update user's profile picture URL.
    If user_id is provided and user has an existing profile picture, the old image will be deleted.
    This endpoint combines upload with user profile update and cleanup.
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
        
        # If user_id is provided, check for existing profile picture and delete it
        old_image_id = None
        if user_id:
            user_info = user_service.get_user_info(user_id)
            if user_info and user_info.get('user_picture_url'):
                old_picture_url = user_info.get('user_picture_url')
                # Extract image_id from URL if it's a full URL, otherwise use as-is for backwards compatibility
                if old_picture_url and ('http://' in old_picture_url or 'https://' in old_picture_url):
                    old_image_id = old_picture_url.split('/')[-1].split('?')[0]
                else:
                    old_image_id = old_picture_url
                
                # Don't delete if no image_id
                if old_image_id:
                    logger.info(f"Deleting old profile picture for user {user_id}: {old_image_id}")
                    delete_success = minio_service.delete_image(old_image_id)
                    if not delete_success:
                        logger.warning(f"Failed to delete old image {old_image_id}, but continuing with upload")
        
        # Store new image (automatically resizes to 128x128)
        image_id = minio_service.store_image(file.file, file.content_type)
        
        # Get the URL for the uploaded image
        image_url = minio_service.get_image_url(image_id)
        
        # If user_id is provided, update the user's profile picture IMAGE_ID in the database
        # Store image_id (not URL) so we can generate fresh presigned URLs on demand
        if user_id:
            logger.info(f"Updating user {user_id} profile picture image_id to: {image_id}")
            user_service.update_user_picture_url(user_id, image_id)
        
        return {
            "success": True,
            "image_id": image_id,
            "url": image_url,
            "message": "Profile picture uploaded and resized successfully",
            "old_image_deleted": old_image_id is not None
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
    Remove a user's profile picture from the database and delete the image file from MinIO.
    This sets the user's user_picture_url to None.
    """
    try:
        # Get current user info to find their current picture
        user_info = user_service.get_user_info(user_id)
        
        if user_info:
            current_picture_url = user_info.get('user_picture_url')
            if current_picture_url:
                # Extract image_id from URL if it's a full URL, otherwise use as-is for backwards compatibility
                if 'http://' in current_picture_url or 'https://' in current_picture_url:
                    current_image_id = current_picture_url.split('/')[-1].split('?')[0]
                else:
                    current_image_id = current_picture_url
                
                # Delete the image from minIO
                delete_success = minio_service.delete_image(current_image_id)
                if not delete_success:
                    logger.warning(f"Failed to delete image {current_image_id} from minIO")
        
        # Update user to have no profile picture
        update_success = user_service.update_user_picture_url(user_id, None)
        
        if not update_success:
            raise HTTPException(status_code=500, detail="Failed to update user profile picture")
        
        return {
            "success": True,
            "message": "Profile picture removed successfully",
            "user_id": user_id
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
    """
    try:
        if not image_id:
            raise HTTPException(status_code=400, detail="Image ID is required")
            
        success = minio_service.delete_image(image_id)
        
        if not success:
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