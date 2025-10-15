# MinIO Bucket Name Update

## Summary

Updated all MinIO bucket references from `profile-pictures` to `study-garden-bucket`.

**Date:** October 14, 2025  
**Status:** ✅ Complete

---

## Files Updated

### 1. Backend Service

- **File:** `backend/app/services/minio_image_service.py`
- **Change:** Default bucket name in `__init__` method
- **Before:** `self.bucket_name = os.getenv("MINIO_BUCKET_NAME", "profile-images")`
- **After:** `self.bucket_name = os.getenv("MINIO_BUCKET_NAME", "study-garden-bucket")`

### 2. Python Reset Script

- **File:** `backend/reset_minio_storage.py`
- **Changes:**
  - Updated `DEFAULT_BUCKET` constant
  - Updated documentation header
- **Before:** `DEFAULT_BUCKET = 'profile-pictures'`
- **After:** `DEFAULT_BUCKET = 'study-garden-bucket'`

### 3. Shell Reset Script

- **File:** `backend/reset_minio_storage.sh`
- **Change:** Default bucket name configuration
- **Before:** `BUCKET_NAME="${BUCKET_NAME:-profile-pictures}"`
- **After:** `BUCKET_NAME="${BUCKET_NAME:-study-garden-bucket}"`

### 4. Documentation

- **File:** `backend/MINIO_RESET_GUIDE.md`
- **Changes:** Updated all references in:
  - Option descriptions
  - Example outputs
  - Default values section
  - Configuration examples

### 5. Bucket Creation Script (New)

- **File:** `backend/create_study_garden_bucket.sh`
- **Purpose:** Quick Docker-based script to create the bucket
- **Usage:** `./backend/create_study_garden_bucket.sh`
- **Advantage:** Works without installing minio Python package or mc CLI

---

## Environment Variable

The bucket name can still be overridden via environment variable:

```bash
export MINIO_BUCKET_NAME="study-garden-bucket"
```

Or in `.env` file:

```env
MINIO_BUCKET_NAME=study-garden-bucket
```

---

## Next Steps

### 1. Create the New Bucket

**Quick Method (Recommended):**

```bash
# Use the Docker-based creation script
./backend/create_study_garden_bucket.sh
```

**Alternative Methods:**

Using Python script (requires minio package installed):

```bash
python backend/reset_minio_storage.py --recreate-bucket --upload-default
```

Using shell script (requires mc CLI installed):

```bash
./backend/reset_minio_storage.sh
```

### 2. Verify Bucket Exists

Check that the bucket was created:

```bash
# Using Python script (stats only)
python backend/reset_minio_storage.py --stats-only

# Or using MinIO CLI
mc ls myminio/study-garden-bucket
```

### 3. Test the Application

Start your backend server and test profile picture uploads:

```bash
cd backend
python run_server.py
```

Upload a profile picture and verify it goes to `study-garden-bucket`.

### 4. Update Environment Files (if needed)

If you have environment-specific configurations, update them:

**Development (.env):**

```env
MINIO_BUCKET_NAME=study-garden-bucket
```

**Production:**
Update your production environment variables to use the new bucket name.

---

## Migration from Old Bucket (Optional)

If you have existing data in `profile-pictures` bucket, you can migrate it:

### Option 1: Using MinIO CLI

```bash
# Copy all objects from old to new bucket
mc cp --recursive myminio/profile-pictures/ myminio/study-garden-bucket/

# Verify copy
mc ls myminio/study-garden-bucket/

# Delete old bucket (optional)
mc rb --force myminio/profile-pictures/
```

### Option 2: Manual via MinIO Console

1. Open MinIO Console: http://localhost:9090
2. Login with credentials (minioadmin/minioadmin)
3. Navigate to `profile-pictures` bucket
4. Select all objects
5. Download or copy to `study-garden-bucket`
6. Delete `profile-pictures` bucket if no longer needed

---

## Docker Container

The MinIO container itself doesn't need changes. The bucket name is application-level configuration.

Container name remains: `studygarden-minio`

---

## Verification Checklist

- [x] Updated `minio_image_service.py` default bucket name
- [x] Updated `reset_minio_storage.py` default bucket name
- [x] Updated `reset_minio_storage.sh` default bucket name
- [x] Updated documentation (`MINIO_RESET_GUIDE.md`)
- [x] Updated environment variables (`backend/config/.env`)
- [x] Verified all code paths use `study-garden-bucket` (see `IMAGE_URL_VERIFICATION.md`)
- [x] Verified URL generation correctly points to new bucket
- [x] Verified cache system works with new bucket
- [ ] Created new bucket in MinIO (run `./backend/create_study_garden_bucket.sh`)
- [ ] Tested profile picture upload to new bucket
- [ ] Tested profile picture retrieval from new bucket
- [ ] Migrated existing data (if applicable)

---

## Rollback Instructions

If you need to revert to the old bucket name:

1. **Update code:**

   ```bash
   # Change back to 'profile-pictures' in:
   # - backend/app/services/minio_image_service.py
   # - backend/reset_minio_storage.py
   # - backend/reset_minio_storage.sh
   ```

2. **Or use environment variable:**
   ```bash
   export MINIO_BUCKET_NAME="profile-pictures"
   ```

---

## Testing

Test the new bucket name:

```bash
# Test backend service
cd backend
python test_profile_picture_upload.py

# Test reset script
python reset_minio_storage.py --dry-run

# Test bucket operations
python reset_minio_storage.py --stats-only
```

---

## Notes

- The bucket name change is **backwards compatible** via environment variables
- Existing code will continue to work if `MINIO_BUCKET_NAME` is set in environment
- The new default is `study-garden-bucket` to match the application theme
- All MinIO operations use the same bucket name from configuration

---

## Questions?

If you encounter issues:

1. Verify MinIO is running: `docker ps | grep minio`
2. Check bucket exists: `mc ls myminio/`
3. Review logs: `docker logs studygarden-minio`
4. Test connection: `python backend/reset_minio_storage.py --stats-only`

---

**Status:** ✅ All files updated and ready for use!
