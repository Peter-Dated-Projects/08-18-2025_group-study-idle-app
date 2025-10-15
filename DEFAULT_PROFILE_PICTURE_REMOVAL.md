# Default Profile Picture System Removal

## Overview

Removed the default profile picture fallback system from the backend. The system now requires all users to have a profile picture stored in ArangoDB. Profile pictures are always loaded from the database without fallback to default images.

## Changes Made

### Backend Changes

#### 1. MinIO Image Service (`backend/app/services/minio_image_service.py`)

**`get_image_url()` method:**

- ❌ Removed automatic fallback to `default_pfp.png` when `image_id` is `None`
- ❌ Removed fallback to default image when requested image doesn't exist
- ✅ Now raises `ValueError` if `image_id` is `None` or empty
- ✅ Now raises `S3Error` if the image doesn't exist in MinIO
- ✅ Requires valid `image_id` to be provided

**`delete_image()` method:**

- ❌ Removed special protection for `default_pfp.png`
- ✅ All images can now be deleted (no special cases)

#### 2. Images Router (`backend/app/routers/images.py`)

**`GET /images/user/{user_id}/info`:**

- ❌ Removed default image fallback when user not found
- ❌ Removed default image fallback when `user_picture_url` is `None`
- ✅ Returns `404` error if user not found
- ✅ Returns `404` error if user has no profile picture
- ✅ Returns `404` error if profile picture not found in MinIO storage

**`GET /images/user/{user_id}`:**

- ❌ Removed default image fallback when user not found
- ❌ Removed default image fallback when `user_picture_url` is `None`
- ✅ Returns `404` error if user not found
- ✅ Returns `404` error if user has no profile picture
- ✅ Returns `404` error if profile picture not found in MinIO storage

**`GET /images/{image_id}`:**

- ❌ Removed automatic conversion of `None`/`null` to `default_pfp.png`
- ✅ Returns `400` error if `image_id` is invalid (`None`, `null`, empty)
- ✅ Returns `404` error if image not found in MinIO storage

**`POST /images/upload/profile`:**

- ❌ Removed check to prevent deletion of `default_pfp.png`
- ✅ All old profile pictures are now eligible for deletion

**`DELETE /images/user/{user_id}/profile`:**

- ❌ Removed generation of default image URL in response
- ❌ Removed `has_custom_picture` and `is_default` fields from response
- ✅ Sets user's `user_picture_url` to `None` in database
- ✅ Deletes the image file from MinIO storage
- ✅ Simpler response with just success status

**`DELETE /images/{image_id}`:**

- ❌ Removed special `403` error for `default_pfp.png`
- ✅ Any image can now be deleted

### Frontend Changes

#### 1. Image API (`frontend/src/components/common/imageApi.ts`)

**`removeUserProfilePicture()`:**

- Updated JSDoc comment to reflect that it removes the picture entirely (no default fallback)
- Updated return type to match simpler backend response

#### 2. CachedProfilePicture Component (`frontend/src/components/common/CachedProfilePicture.tsx`)

**Documentation:**

- Updated component documentation to clarify:
  - Local fallback image (`/entities/default_pfp.png`) is for UI display only
  - Backend no longer provides default profile pictures
  - Users must have a picture set in ArangoDB

**Note:** The component still shows a local fallback image in the UI for better UX, but this is purely a frontend concern. The backend will return errors if no profile picture exists.

## Migration Guide

### For Existing Users Without Profile Pictures

Users who don't have a profile picture in the database will now receive error responses:

```json
{
  "detail": "User {user_id} has no profile picture"
}
```

**Recommended Actions:**

1. Run a migration script to ensure all users have profile pictures
2. Set a default profile picture for all users during registration
3. Handle the `404` errors gracefully in the frontend UI

### For API Consumers

**Before:**

```typescript
// Would return default_pfp.png URL
const response = await fetch(`/images/user/${userId}`);
// Always successful, returns default if user has no picture
```

**After:**

```typescript
// Returns 404 if user has no picture
try {
  const response = await fetch(`/images/user/${userId}`);
  if (!response.ok) {
    // Handle error - user has no profile picture
    console.error("User has no profile picture");
  }
} catch (error) {
  // Handle error
}
```

## Benefits

1. **Data Integrity**: Ensures all users explicitly have profile pictures in the database
2. **No Magic Defaults**: System behavior is more predictable and explicit
3. **Clearer Errors**: 404 errors make it obvious when profile pictures are missing
4. **Simplified Logic**: Removed complex fallback chains and special cases
5. **Storage Cleanup**: No need to maintain a special `default_pfp.png` file

## Error Handling

### Backend Error Responses

| Endpoint                          | Scenario             | Status | Response                                              |
| --------------------------------- | -------------------- | ------ | ----------------------------------------------------- |
| `GET /images/user/{user_id}/info` | User not found       | 404    | `{"detail": "User {user_id} not found"}`              |
| `GET /images/user/{user_id}/info` | No profile picture   | 404    | `{"detail": "User {user_id} has no profile picture"}` |
| `GET /images/user/{user_id}/info` | Image not in storage | 404    | `{"detail": "Profile picture not found in storage"}`  |
| `GET /images/user/{user_id}`      | User not found       | 404    | `{"detail": "User {user_id} not found"}`              |
| `GET /images/user/{user_id}`      | No profile picture   | 404    | `{"detail": "User {user_id} has no profile picture"}` |
| `GET /images/{image_id}`          | Invalid image_id     | 400    | `{"detail": "Valid image_id is required"}`            |
| `GET /images/{image_id}`          | Image not found      | 404    | `{"detail": "Image not found in storage"}`            |

### Frontend Handling

The frontend `CachedProfilePicture` component will:

1. Attempt to fetch the profile picture from the backend
2. If the fetch fails (404/500), show the local fallback image
3. Display a retry button in error state
4. Still use local `/entities/default_pfp.png` for UI display purposes only

## Testing Checklist

- [ ] Test user with valid profile picture - should display correctly
- [ ] Test user without profile picture - should return 404 error
- [ ] Test user with deleted profile picture - should return 404 error
- [ ] Test invalid image_id - should return 400 or 404 error
- [ ] Test profile picture upload - should replace old picture
- [ ] Test profile picture deletion - should remove from DB and storage
- [ ] Test frontend error handling - should show fallback UI gracefully

## Related Files

- `backend/app/services/minio_image_service.py`
- `backend/app/routers/images.py`
- `frontend/src/components/common/imageApi.ts`
- `frontend/src/components/common/CachedProfilePicture.tsx`
- `frontend/src/store/slices/profilePicturesSlice.ts`

## Rollback Plan

If needed, the default profile picture system can be restored by:

1. Reverting changes to `minio_image_service.py` to re-add default fallbacks
2. Reverting changes to `images.py` router endpoints
3. Ensuring `default_pfp.png` exists in MinIO storage
4. Reverting frontend documentation changes

## Date

October 15, 2025
