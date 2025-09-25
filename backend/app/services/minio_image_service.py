"""
MinIO Image Service for handling user profile images.
Provides methods for storing, retrieving, and deleting 128px profile images.
"""

import os
import logging
from typing import Optional, BinaryIO
from minio import Minio
from minio.error import S3Error
from io import BytesIO
import uuid
from datetime import timedelta

logger = logging.getLogger(__name__)

class MinIOImageService:
    def __init__(self):
        """Initialize MinIO client with environment variables."""
        self.bucket_name = os.getenv("MINIO_BUCKET_NAME", "profile-images")
        
        # MinIO client configuration
        self.client = Minio(
            endpoint=os.getenv("MINIO_ENDPOINT", "localhost:9000"),
            access_key=os.getenv("MINIO_ACCESS_KEY", "minioadmin"),
            secret_key=os.getenv("MINIO_SECRET_KEY", "minioadmin"),
            secure=os.getenv("MINIO_SECURE", "False").lower() == "true"
        )
        
        # Ensure bucket exists
        self._ensure_bucket_exists()
    
    def _ensure_bucket_exists(self):
        """Create bucket if it doesn't exist."""
        try:
            if not self.client.bucket_exists(self.bucket_name):
                self.client.make_bucket(self.bucket_name)
                logger.info(f"Created bucket: {self.bucket_name}")
            else:
                logger.info(f"Bucket {self.bucket_name} already exists")
        except S3Error as e:
            logger.error(f"Error ensuring bucket exists: {e}")
            raise
    
    def store_image(self, image_data: BinaryIO, content_type: str = "image/png") -> str:
        """
        Store an image and return a unique image_id.
        
        Args:
            image_data: Binary image data
            content_type: MIME type of the image
            
        Returns:
            str: Unique image_id for the stored image
        """
        try:
            # Generate unique image ID
            image_id = str(uuid.uuid4())
            
            # Reset stream position if needed
            if hasattr(image_data, 'seek'):
                image_data.seek(0)
            
            # Get data size
            data = image_data.read()
            data_stream = BytesIO(data)
            data_size = len(data)
            
            # Store object in MinIO
            self.client.put_object(
                bucket_name=self.bucket_name,
                object_name=image_id,
                data=data_stream,
                length=data_size,
                content_type=content_type
            )
            
            logger.info(f"Successfully stored image with ID: {image_id}")
            return image_id
            
        except S3Error as e:
            logger.error(f"Error storing image: {e}")
            raise
    
    def store_image_with_id(self, image_data: BinaryIO, image_id: str, content_type: str = "image/png") -> str:
        """
        Store an image with a specific ID (used for default image).
        
        Args:
            image_data: Binary image data
            image_id: Specific ID to use for the image
            content_type: MIME type of the image
            
        Returns:
            str: The image_id that was used
        """
        try:
            # Reset stream position if needed
            if hasattr(image_data, 'seek'):
                image_data.seek(0)
            
            # Get data size
            data = image_data.read()
            data_stream = BytesIO(data)
            data_size = len(data)
            
            # Store object in MinIO with specific ID
            self.client.put_object(
                bucket_name=self.bucket_name,
                object_name=image_id,
                data=data_stream,
                length=data_size,
                content_type=content_type
            )
            
            logger.info(f"Successfully stored image with specific ID: {image_id}")
            return image_id
            
        except S3Error as e:
            logger.error(f"Error storing image with ID {image_id}: {e}")
            raise
    
    def get_image_url(self, image_id: Optional[str]) -> str:
        """
        Get a presigned URL for an image.
        
        Args:
            image_id: The image ID to retrieve, or None for default
            
        Returns:
            str: Presigned URL for the image or default image URL
        """
        try:
            # Return default image URL if image_id is None or "default"
            if image_id is None or image_id == "default_pfp.png":
                image_id = "default_pfp.png"
            
            # Check if object exists
            try:
                self.client.stat_object(self.bucket_name, image_id)
            except S3Error:
                logger.warning(f"Image {image_id} not found, returning default")
                image_id = "default_pfp.png"
            
            # Generate presigned URL valid for 1 hour
            url = self.client.presigned_get_object(
                bucket_name=self.bucket_name,
                object_name=image_id,
                expires=timedelta(hours=1)  # 1 hour using timedelta
            )
            
            logger.info(f"Generated URL for image: {image_id}")
            return url
            
        except S3Error as e:
            logger.error(f"Error getting image URL for {image_id}: {e}")
            # Return default image URL as fallback
            try:
                return self.client.presigned_get_object(
                    bucket_name=self.bucket_name,
                    object_name="default_pfp.png",
                    expires=timedelta(hours=1)  # 1 hour using timedelta
                )
            except S3Error:
                logger.error("Even default image is not available")
                raise
    
    def delete_image(self, image_id: str) -> bool:
        """
        Delete an image by its ID.
        
        Args:
            image_id: The image ID to delete
            
        Returns:
            bool: True if deleted successfully, False otherwise
        """
        try:
            # Don't allow deletion of default profile picture
            if image_id == "default_pfp.png":
                logger.warning("Cannot delete default profile picture")
                return False
            
            # Delete object from MinIO
            self.client.remove_object(
                bucket_name=self.bucket_name,
                object_name=image_id
            )
            
            logger.info(f"Successfully deleted image: {image_id}")
            return True
            
        except S3Error as e:
            logger.error(f"Error deleting image {image_id}: {e}")
            return False
    
    def image_exists(self, image_id: str) -> bool:
        """
        Check if an image exists.
        
        Args:
            image_id: The image ID to check
            
        Returns:
            bool: True if image exists, False otherwise
        """
        try:
            self.client.stat_object(self.bucket_name, image_id)
            return True
        except S3Error:
            return False


# Global service instance
minio_service = MinIOImageService()