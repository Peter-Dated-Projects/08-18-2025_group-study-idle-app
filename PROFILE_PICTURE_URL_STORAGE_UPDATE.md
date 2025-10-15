# Profile Picture URL Storage Update

## Overview

Modified the system to store **full MinIO presigned URLs** in ArangoDB's `user_picture_url` field instead of just image IDs. This eliminates the need to generate presigned URLs on every request, improving performance and reducing backend processing.

## Changes Made

### Backend Changes

#### 1. `backend/app/routers/users.py`

- **Changed**: `UpdateProfilePictureRequest` model
  - Old: `image_id: str`
  - New: `picture_url: str` (Full MinIO URL, not just image_id)
- **Updated**: `/users/update-profile-picture` endpoint
  - Now accepts full URL instead of image ID
  - Stores complete MinIO URL in database via `user_service.update_user_picture_url(user_id, picture_url)`

#### 2. `backend/app/routers/images.py`

- **Updated**: `/images/user/{user_id}` endpoint (GET)

  - Now returns stored URL directly from database
  - Extracts image_id from URL for backwards compatibility in response
  - Fallback: Generates default_pfp.png URL if user has no custom picture

- **Updated**: `/images/user/{user_id}/info` endpoint (GET)

  - Returns stored full URL instead of generating presigned URL
  - Extracts image_id from URL for response metadata
  - Handles both old format (image_id) and new format (full URL) for migration

- **Updated**: `/images/upload/profile` endpoint (POST)

  - Now automatically stores full MinIO URL in database after upload
  - Added: `user_service.update_user_picture_url(user_id, image_url)`
  - Handles old image deletion with URL parsing (extracts image_id from full URL)

- **Updated**: `/images/user/{user_id}/profile` endpoint (DELETE)
  - Now handles URL parsing when deleting images
  - Extracts image_id from stored URL before calling `minio_service.delete_image()`

### Frontend Changes

#### 3. `frontend/src/components/garden/ui/EditProfileModal.tsx`

- **Removed**: Call to `updateUserProfilePicture(userId, uploadResult.image_id)`
- **Reason**: Upload endpoint now handles database update automatically
- **Simplified**: Upload flow - one API call instead of two

## Migration Strategy

The system now handles both formats gracefully:

1. **Old format**: `"abc123.png"` (just image_id)
2. **New format**: `"http://localhost:9000/study-garden-bucket/abc123.png?X-Amz-..."` (full URL)

When processing `user_picture_url`:

- If it contains `http://` or `https://`, it's treated as a full URL
- Image ID is extracted by splitting on `/` and `?`
- If it doesn't contain protocol, it's treated as legacy image_id

## Benefits

1. **Performance**: No need to call `minio_service.get_image_url()` on every request
2. **Reduced Latency**: Direct URL retrieval from database
3. **Less Backend Processing**: Eliminates presigned URL generation overhead
4. **Simpler Frontend**: One upload API call instead of upload + update

## Database Schema

### ArangoDB `users` Collection

```json
{
  "_key": "user123",
  "user_picture_url": "http://localhost:9000/study-garden-bucket/abc123.png?X-Amz-Algorithm=..."
  // ... other fields
}
```

**Before**: `user_picture_url` stored `"abc123.png"`
**After**: `user_picture_url` stores `"http://localhost:9000/study-garden-bucket/abc123.png?X-Amz-..."`

## API Response Format

All image endpoints maintain backwards compatibility:

```json
{
  "success": true,
  "user_id": "user123",
  "image_id": "abc123.png", // Extracted from URL for compatibility
  "url": "http://localhost:9000/study-garden-bucket/abc123.png?X-Amz-..."
}
```

## Testing Checklist

- [ ] Upload new profile picture → verify full URL stored in ArangoDB
- [ ] Refresh page → verify URL returned directly without regeneration
- [ ] Remove profile picture → verify deletion works with URL parsing
- [ ] Upload new picture over old one → verify old image deleted correctly
- [ ] Check users with old format (image_id) → verify backwards compatibility
- [ ] Verify default_pfp.png handling still works

## Files Modified

### Backend

1. `backend/app/routers/users.py` - Update profile picture request model
2. `backend/app/routers/images.py` - All image endpoints (GET, POST, DELETE)

### Frontend

3. `frontend/src/components/garden/ui/EditProfileModal.tsx` - Simplified upload flow

## Next Steps

1. **Test**: Upload and verify full URL storage
2. **Monitor**: Check logs for URL parsing issues
3. **Optional**: Create migration script to update existing users with image IDs to full URLs
4. **Documentation**: Update API docs to reflect new URL format
