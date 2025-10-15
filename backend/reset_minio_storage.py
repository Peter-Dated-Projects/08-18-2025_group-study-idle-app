#!/usr/bin/env python3
"""
MinIO Storage Container Reset Script

This script resets the MinIO storage by:
1. Listing all objects in the study-garden-bucket
2. Deleting all objects
3. Optionally recreating the bucket
4. Uploading the default profile picture

Usage:
    python reset_minio_storage.py [--keep-default] [--bucket BUCKET_NAME]

Options:
    --keep-default      Keep the default profile picture (default_pfp.png)
    --bucket NAME       Specify bucket name (default: study-garden-bucket)
    --recreate-bucket   Delete and recreate the bucket
    --dry-run           Show what would be deleted without actually deleting
"""

import argparse
import sys
from minio import Minio
from minio.error import S3Error
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MinIO configuration
MINIO_ENDPOINT = os.getenv('MINIO_ENDPOINT', 'localhost:9000')
MINIO_ACCESS_KEY = os.getenv('MINIO_ROOT_USER', 'minioadmin')
MINIO_SECRET_KEY = os.getenv('MINIO_ROOT_PASSWORD', 'minioadmin')
MINIO_SECURE = os.getenv('MINIO_SECURE', 'False').lower() == 'true'
DEFAULT_BUCKET = 'study-garden-bucket'
DEFAULT_PFP_PATH = 'default_pfp.png'


class MinIOResetter:
    def __init__(self, bucket_name: str, dry_run: bool = False):
        self.bucket_name = bucket_name
        self.dry_run = dry_run
        self.client = None
        
    def connect(self):
        """Connect to MinIO server"""
        try:
            print(f"🔌 Connecting to MinIO at {MINIO_ENDPOINT}...")
            self.client = Minio(
                MINIO_ENDPOINT,
                access_key=MINIO_ACCESS_KEY,
                secret_key=MINIO_SECRET_KEY,
                secure=MINIO_SECURE
            )
            print(f"✅ Connected to MinIO successfully")
            return True
        except Exception as e:
            print(f"❌ Failed to connect to MinIO: {e}")
            return False
    
    def bucket_exists(self) -> bool:
        """Check if bucket exists"""
        try:
            exists = self.client.bucket_exists(self.bucket_name)
            if exists:
                print(f"✅ Bucket '{self.bucket_name}' exists")
            else:
                print(f"⚠️  Bucket '{self.bucket_name}' does not exist")
            return exists
        except S3Error as e:
            print(f"❌ Error checking bucket: {e}")
            return False
    
    def list_objects(self) -> list:
        """List all objects in the bucket"""
        try:
            print(f"\n📋 Listing objects in bucket '{self.bucket_name}'...")
            objects = list(self.client.list_objects(self.bucket_name, recursive=True))
            
            if not objects:
                print("   No objects found")
                return []
            
            print(f"   Found {len(objects)} objects:")
            for obj in objects:
                size_kb = obj.size / 1024
                print(f"   - {obj.object_name} ({size_kb:.2f} KB)")
            
            return objects
        except S3Error as e:
            print(f"❌ Error listing objects: {e}")
            return []
    
    def delete_all_objects(self, keep_default: bool = False) -> int:
        """Delete all objects in the bucket"""
        objects = self.list_objects()
        
        if not objects:
            print("\n✅ No objects to delete")
            return 0
        
        # Filter out default profile picture if keep_default is True
        objects_to_delete = []
        for obj in objects:
            if keep_default and obj.object_name == DEFAULT_PFP_PATH:
                print(f"\n⏭️  Skipping default profile picture: {DEFAULT_PFP_PATH}")
                continue
            objects_to_delete.append(obj.object_name)
        
        if not objects_to_delete:
            print("\n✅ No objects to delete (default picture preserved)")
            return 0
        
        print(f"\n🗑️  Deleting {len(objects_to_delete)} objects...")
        
        if self.dry_run:
            print("   [DRY RUN - No actual deletion]")
            for obj_name in objects_to_delete:
                print(f"   Would delete: {obj_name}")
            return len(objects_to_delete)
        
        deleted_count = 0
        errors = []
        
        for obj_name in objects_to_delete:
            try:
                self.client.remove_object(self.bucket_name, obj_name)
                print(f"   ✓ Deleted: {obj_name}")
                deleted_count += 1
            except S3Error as e:
                error_msg = f"   ✗ Failed to delete {obj_name}: {e}"
                print(error_msg)
                errors.append(error_msg)
        
        if errors:
            print(f"\n⚠️  Deleted {deleted_count} objects with {len(errors)} errors")
        else:
            print(f"\n✅ Successfully deleted {deleted_count} objects")
        
        return deleted_count
    
    def recreate_bucket(self) -> bool:
        """Delete and recreate the bucket"""
        print(f"\n🔄 Recreating bucket '{self.bucket_name}'...")
        
        if self.dry_run:
            print("   [DRY RUN - Bucket would be recreated]")
            return True
        
        try:
            # Delete bucket if it exists
            if self.bucket_exists():
                # First delete all objects
                self.delete_all_objects(keep_default=False)
                
                # Then delete bucket
                print(f"   Deleting bucket '{self.bucket_name}'...")
                self.client.remove_bucket(self.bucket_name)
                print(f"   ✓ Bucket deleted")
            
            # Create bucket
            print(f"   Creating bucket '{self.bucket_name}'...")
            self.client.make_bucket(self.bucket_name)
            print(f"   ✓ Bucket created")
            
            print(f"✅ Bucket '{self.bucket_name}' recreated successfully")
            return True
            
        except S3Error as e:
            print(f"❌ Error recreating bucket: {e}")
            return False
    
    def upload_default_picture(self) -> bool:
        """Upload default profile picture if it exists"""
        if not os.path.exists(DEFAULT_PFP_PATH):
            print(f"\n⚠️  Default profile picture not found at: {DEFAULT_PFP_PATH}")
            return False
        
        print(f"\n📤 Uploading default profile picture...")
        
        if self.dry_run:
            print("   [DRY RUN - Would upload default_pfp.png]")
            return True
        
        try:
            self.client.fput_object(
                self.bucket_name,
                DEFAULT_PFP_PATH,
                DEFAULT_PFP_PATH,
                content_type='image/png'
            )
            print(f"✅ Default profile picture uploaded successfully")
            return True
        except S3Error as e:
            print(f"❌ Error uploading default picture: {e}")
            return False
    
    def get_stats(self) -> dict:
        """Get bucket statistics"""
        try:
            objects = list(self.client.list_objects(self.bucket_name, recursive=True))
            total_size = sum(obj.size for obj in objects)
            
            stats = {
                'total_objects': len(objects),
                'total_size_bytes': total_size,
                'total_size_mb': total_size / (1024 * 1024),
            }
            
            print(f"\n📊 Bucket Statistics:")
            print(f"   Total Objects: {stats['total_objects']}")
            print(f"   Total Size: {stats['total_size_mb']:.2f} MB ({stats['total_size_bytes']:,} bytes)")
            
            return stats
        except S3Error as e:
            print(f"❌ Error getting stats: {e}")
            return {}


def main():
    parser = argparse.ArgumentParser(
        description='Reset MinIO storage container',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    
    parser.add_argument(
        '--bucket',
        default=DEFAULT_BUCKET,
        help=f'Bucket name (default: {DEFAULT_BUCKET})'
    )
    
    parser.add_argument(
        '--keep-default',
        action='store_true',
        help='Keep the default profile picture (default_pfp.png)'
    )
    
    parser.add_argument(
        '--recreate-bucket',
        action='store_true',
        help='Delete and recreate the bucket'
    )
    
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be deleted without actually deleting'
    )
    
    parser.add_argument(
        '--stats-only',
        action='store_true',
        help='Only show bucket statistics without making changes'
    )
    
    parser.add_argument(
        '--upload-default',
        action='store_true',
        help='Upload default profile picture after reset'
    )
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("MinIO Storage Container Reset Script")
    print("=" * 60)
    
    if args.dry_run:
        print("\n⚠️  DRY RUN MODE - No actual changes will be made\n")
    
    # Create resetter instance
    resetter = MinIOResetter(args.bucket, dry_run=args.dry_run)
    
    # Connect to MinIO
    if not resetter.connect():
        sys.exit(1)
    
    # Check if bucket exists
    if not resetter.bucket_exists():
        print(f"\n❌ Bucket '{args.bucket}' does not exist. Create it first or use --recreate-bucket")
        sys.exit(1)
    
    # Show current stats
    print("\n📊 Current State:")
    resetter.get_stats()
    
    # If stats-only, exit here
    if args.stats_only:
        print("\n✅ Stats retrieved successfully")
        sys.exit(0)
    
    # Confirm action unless dry-run
    if not args.dry_run:
        print("\n⚠️  WARNING: This will delete objects in the bucket!")
        if args.recreate_bucket:
            print("⚠️  WARNING: The bucket will be completely recreated!")
        
        confirmation = input("\nType 'yes' to confirm: ")
        if confirmation.lower() != 'yes':
            print("❌ Operation cancelled")
            sys.exit(0)
    
    # Perform reset
    print("\n" + "=" * 60)
    print("Starting Reset Process")
    print("=" * 60)
    
    if args.recreate_bucket:
        # Recreate bucket (this also deletes all objects)
        if not resetter.recreate_bucket():
            sys.exit(1)
    else:
        # Just delete objects
        deleted = resetter.delete_all_objects(keep_default=args.keep_default)
        if deleted == 0 and not args.keep_default:
            print("\n⚠️  No objects were deleted")
    
    # Upload default picture if requested or if bucket was recreated
    if args.upload_default or args.recreate_bucket:
        resetter.upload_default_picture()
    
    # Show final stats
    print("\n" + "=" * 60)
    print("Final State:")
    print("=" * 60)
    resetter.get_stats()
    
    print("\n" + "=" * 60)
    print("✅ Reset Complete!")
    print("=" * 60)


if __name__ == '__main__':
    main()
