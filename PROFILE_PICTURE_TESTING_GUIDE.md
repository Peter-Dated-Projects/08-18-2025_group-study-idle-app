# Profile Picture Testing Guide

**Date:** October 14, 2025  
**Purpose:** Verify profile pictures are using custom URLs correctly

---

## 🧪 Quick Test Checklist

### Test 1: Verify Console Logs

Open the browser console and look for these debug messages:

#### When Opening EditProfileModal:

```javascript
[EditProfileModal] ProfilePicture imageId: {
  reduxUserPictureUrl: "abc-123-uuid",  // or undefined
  userPictureUrl: "abc-123-uuid",       // or undefined
  finalImageId: "abc-123-uuid",         // or undefined
  userId: "user-123"
}
```

**What to check:**

- ✅ If you have a custom picture: `finalImageId` should be a UUID
- ✅ If using default: `finalImageId` should be `undefined`
- ✅ `userId` should always be present

#### When ProfilePicture Loads:

```javascript
Profile picture loaded for ID: custom-uuid-abc
// or
Profile picture loaded for ID: user:user-123
// or
Profile picture loaded for ID: default_pfp.png
```

**What to check:**

- ✅ Custom picture: Shows the actual UUID
- ✅ Default picture: Shows "default_pfp.png"

---

## 🔍 Test Scenarios

### Scenario 1: User with Custom Picture

**Steps:**

1. Upload a profile picture
2. Open browser DevTools Console
3. Refresh the page
4. Open user profile modal

**Expected Console Output:**

```javascript
[EditProfileModal] ProfilePicture imageId: {
  reduxUserPictureUrl: "abc-def-123-456",
  userPictureUrl: "abc-def-123-456",
  finalImageId: "abc-def-123-456",
  userId: "user-789"
}

Profile picture loaded for ID: abc-def-123-456 http://localhost:9000/study-garden-bucket/abc-def-123-456?X-Amz-...
```

**Network Tab:**

- Should see request to: `/api/images/abc-def-123-456`
- MinIO URL should contain: `study-garden-bucket/abc-def-123-456`

**Visual:**

- ✅ Your uploaded custom image should display

---

### Scenario 2: User with Default Picture

**Steps:**

1. Remove your profile picture (or use account that never uploaded one)
2. Open browser DevTools Console
3. Open user profile modal

**Expected Console Output:**

```javascript
[EditProfileModal] ProfilePicture imageId: {
  reduxUserPictureUrl: undefined,
  userPictureUrl: undefined,
  finalImageId: undefined,
  userId: "user-789"
}

Profile picture loaded for ID: user:user-789 http://localhost:9000/study-garden-bucket/default_pfp.png?X-Amz-...
```

**Network Tab:**

- Should see request to: `/api/images/user/user-789`
- MinIO URL should contain: `study-garden-bucket/default_pfp.png`

**Visual:**

- ✅ Default profile picture should display

---

### Scenario 3: Upload New Picture

**Steps:**

1. Open EditProfileModal
2. Upload a new profile picture
3. Watch console during upload

**Expected Console Output:**

```javascript
// During upload
Starting profile picture upload for user: user-789
File details: {name: "profile.png", size: 12345, type: "image/png"}
Uploading image to backend...
Upload response: {success: true, image_id: "new-uuid-xyz", url: "..."}
Updating user profile picture URL in database...
Update response: {success: true, user: {..., user_picture_url: "new-uuid-xyz"}}
Reloading user image info...

// After upload (modal re-renders)
[EditProfileModal] ProfilePicture imageId: {
  reduxUserPictureUrl: "new-uuid-xyz",  // ✅ UPDATED!
  userPictureUrl: undefined,             // Old prop value
  finalImageId: "new-uuid-xyz",          // ✅ Using Redux!
  userId: "user-789"
}

Profile picture loaded for ID: new-uuid-xyz http://localhost:9000/study-garden-bucket/new-uuid-xyz?X-Amz-...
```

**Visual:**

- ✅ New uploaded image should appear immediately
- ✅ No page refresh needed

---

## 🔧 Backend Verification

### Check Backend Logs

If you have access to backend logs, look for:

```python
# When user loads their profile
User user-789 has picture URL: abc-def-123-456

# When generating presigned URL
Generated and cached URL for image: abc-def-123-456
```

### Check ArangoDB

Query the user document:

```javascript
// In ArangoDB web interface
db.users.document('user-789')

// Should show:
{
  "_key": "user-789",
  "user_picture_url": "abc-def-123-456",  // Custom picture UUID
  // or
  "user_picture_url": null,  // Using default
}
```

### Check MinIO

Open MinIO Console: http://localhost:9090

1. Login with `minioadmin` / `minioadmin`
2. Navigate to `study-garden-bucket`
3. Look for your image files

**Should see:**

- `default_pfp.png` - Default profile picture
- `abc-def-123-456` - Your custom uploaded images (UUIDs)
- Each file should be ~5-20KB (128x128 PNG)

---

## ❌ Common Issues

### Issue 1: Always Shows Default

**Symptom:**

```javascript
finalImageId: undefined; // But user has custom picture in database
```

**Possible Causes:**

1. Redux state not updated after upload
2. User prop doesn't have `user_picture_url`
3. Database `user_picture_url` is null

**Fix:**

- Check Redux DevTools: `state.auth.user.userPictureUrl`
- Check database: Is `user_picture_url` actually set?
- Try refreshing the page

### Issue 2: Shows Wrong Picture

**Symptom:**

```javascript
finalImageId: "old-uuid-123"; // But uploaded new picture
```

**Possible Causes:**

1. Redux not updated
2. Cache showing old image
3. Upload succeeded but database update failed

**Fix:**

- Check console for "Update response"
- Verify Redux state was updated
- Clear browser cache
- Check backend logs

### Issue 3: Network Error

**Symptom:**

```javascript
Error fetching profile picture from minIO: Failed to get image URL
```

**Possible Causes:**

1. Backend not running
2. MinIO not running
3. Wrong bucket name
4. Image doesn't exist in MinIO

**Fix:**

```bash
# Check if backend is running
curl http://localhost:8000/api/images/health

# Check if MinIO is running
docker ps | grep studygarden-minio

# Check bucket exists
./backend/create_study_garden_bucket.sh
```

---

## ✅ Success Criteria

After testing, you should confirm:

- [x] Console shows correct `finalImageId` for your profile
- [x] Custom pictures display with their UUID in logs
- [x] Default picture shows when no custom picture exists
- [x] Upload updates `reduxUserPictureUrl` immediately
- [x] Network requests go to correct URLs
- [x] MinIO URLs contain `study-garden-bucket`
- [x] Images display correctly in UI

---

## 🎯 Quick Verification Commands

### Frontend

```bash
# Open browser console
# Look for: [EditProfileModal] ProfilePicture imageId
# Look for: Profile picture loaded for ID
```

### Backend

```bash
# Check backend logs
tail -f backend/server.log | grep "picture URL"
```

### Database

```bash
# Check ArangoDB
docker exec -it studygarden-arangodb arangosh
# Then: db.users.document('YOUR_USER_ID')
```

### MinIO

```bash
# List objects in bucket
docker exec studygarden-minio mc ls local/study-garden-bucket/
```

---

## 📊 Expected Flow Summary

```
1. User Opens Modal
   ↓
2. EditProfileModal renders
   ↓
3. Debug log shows imageId values
   ↓
4. ProfilePicture component calls API
   ↓
5. If imageId provided:
   → GET /api/images/{imageId}
   → Returns custom image URL
   ↓
6. If imageId undefined:
   → GET /api/images/user/{userId}
   → Backend looks up user_picture_url
   → Returns custom or default
   ↓
7. Image displays in UI
```

---

**Status:** ✅ Use this guide to verify your profile picture system is working correctly!
