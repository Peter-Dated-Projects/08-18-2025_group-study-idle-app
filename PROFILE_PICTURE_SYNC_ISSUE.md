# Profile Picture Display Issue - Root Cause Analysis

**Date:** October 14, 2025  
**Status:** 🔍 **ISSUE IDENTIFIED - Field Name Mismatch**

---

## 🐛 The Problem

**Symptom:** User uploads a new profile picture, but the old/wrong picture is still displayed.

**Root Cause:** Field name mismatch between backend API response and Redux state.

---

## 🔍 Issue Analysis

### Field Name Inconsistency

**Backend/API Response:**

```typescript
// From backend API (/api/users/update-profile-picture)
{
  success: true,
  user: {
    user_id: "123",
    user_picture_url: "new-image-uuid",  // ← snake_case
    // ...
  }
}
```

**Redux State (authSlice):**

```typescript
export interface UserSession {
  userId: string;
  userEmail: string;
  userName: string | null;
  sessionId: string;
  hasNotionTokens: boolean;
  userPictureUrl?: string | null; // ← camelCase
}
```

**Common User Type:**

```typescript
export interface User {
  id: string;
  email: string;
  given_name?: string;
  family_name?: string;
  userId?: string;
  user_picture_url?: string | null; // ← snake_case
}
```

### The Broken Flow

```tsx
// EditProfileModal.tsx - Line 131-133
if (updateResponse.user && updateResponse.user.user_picture_url) {
  // ❌ Updating Redux with snake_case field
  dispatch(updateProfilePicture(updateResponse.user.user_picture_url));
}
```

```typescript
// authSlice.ts - Line 138-141
updateProfilePicture: (state, action: PayloadAction<string | null>) => {
  if (state.user) {
    // ✅ Setting camelCase field
    state.user.userPictureUrl = action.payload;
  }
},
```

```tsx
// EditProfileModal.tsx - Line 276
<ProfilePicture
  size="120px"
  userId={userId}
  imageId={(user as any).user_picture_url} // ❌ Reading snake_case from User type
/>
```

**Result:**

- Redux state gets updated correctly (`userPictureUrl`)
- But ProfilePicture component reads from wrong field (`user_picture_url`)
- Component still shows old image because it's reading from the User prop, not Redux

---

## 🔄 What's Actually Happening

### Step-by-Step Breakdown

1. **User uploads image** ✅

   - Image uploaded to MinIO successfully
   - Returns `image_id` = "new-uuid"

2. **Update user profile** ✅

   - Backend updates ArangoDB: `user_picture_url = "new-uuid"`
   - Returns response with `user.user_picture_url = "new-uuid"`

3. **Update Redux (BROKEN)** ⚠️

   ```tsx
   // Gets: "new-uuid"
   dispatch(updateProfilePicture(updateResponse.user.user_picture_url));

   // Redux state DOES update:
   state.user.userPictureUrl = "new-uuid"; // ✅
   ```

4. **ProfilePicture component reads (BROKEN)** ❌

   ```tsx
   <ProfilePicture
     userId={userId}
     imageId={(user as any).user_picture_url} // ← Reads from User prop
   />
   ```

   The `user` prop is the User type (snake_case), NOT the Redux UserSession!

5. **Component displays old image** ❌
   - Reading `user.user_picture_url` which is from the initial User object
   - NOT reading from Redux `state.user.userPictureUrl`

---

## 🎯 Solutions

### Solution 1: Fix EditProfileModal to Read from Redux (RECOMMENDED)

**Current (Broken):**

```tsx
// EditProfileModal receives User prop
export default function EditProfileModal({
  user, // ← User type with user_picture_url
}: // ...
EditProfileModalProps) {
  // ...
  <ProfilePicture
    imageId={(user as any).user_picture_url} // ❌ Reading from prop
  />;
}
```

**Fixed:**

```tsx
import { useSelector } from "react-redux";
import { RootState } from "../../../store";

export default function EditProfileModal({
  user,
}: // ...
EditProfileModalProps) {
  // Get fresh data from Redux
  const reduxUser = useSelector((state: RootState) => state.auth.user);

  // ...
  <ProfilePicture
    imageId={reduxUser?.userPictureUrl} // ✅ Reading from Redux
  />;
}
```

### Solution 2: Standardize Field Names (COMPREHENSIVE)

**Option A: Use camelCase everywhere**

```typescript
// Update backend to return camelCase
{
  userId: "123",
  userPictureUrl: "uuid",  // ← camelCase
}

// Or transform in API layer
const transformUser = (backendUser) => ({
  userId: backendUser.user_id,
  userPictureUrl: backendUser.user_picture_url,
  // ...
});
```

**Option B: Use snake_case in Redux**

```typescript
// Change Redux UserSession
export interface UserSession {
  user_id: string;
  user_email: string;
  user_name: string | null;
  session_id: string;
  has_notion_tokens: boolean;
  user_picture_url?: string | null; // ← snake_case
}
```

### Solution 3: Update After Reload (WORKAROUND)

```tsx
// Force reload user image info after update
await loadUserImageInfo();

// Update local state instead of just Redux
setImageInfo({
  ...imageInfo,
  image_id: uploadResponse.image_id,
  url: uploadResponse.url,
  has_custom_picture: true,
});
```

---

## 🔧 Recommended Fix (Immediate)

**File:** `frontend/src/components/garden/ui/EditProfileModal.tsx`

### Change 1: Read from Redux instead of props

```tsx
// Add selector at top of component
const reduxUser = useSelector((state: RootState) => state.auth.user);

// Update ProfilePicture to use Redux state
<ProfilePicture
  size="120px"
  userId={userId}
  imageId={reduxUser?.userPictureUrl || (user as any).user_picture_url}
/>;
```

### Change 2: Update local user object after upload

```tsx
if (updateResponse.success) {
  // ... existing Redux update ...

  // Also update the local user object
  if (updateResponse.user && updateResponse.user.user_picture_url) {
    (user as any).user_picture_url = updateResponse.user.user_picture_url;
  }

  // ... rest of code ...
}
```

---

## 🧪 Testing the Fix

After implementing the fix, test:

1. **Upload new profile picture**
   - Should see new image immediately in EditProfileModal
2. **Close and reopen modal**
   - Should still show new image
3. **Refresh page**
   - Should load new image from backend
4. **Check Redux DevTools**
   - `state.auth.user.userPictureUrl` should have new UUID
5. **Check Network tab**
   - Image URL should point to new UUID in study-garden-bucket

---

## 📋 Additional Issues Found

### Issue 2: Cache Invalidation

When uploading a new image, old cached URLs might still be served:

**Fix:** Invalidate cache after upload

```tsx
// After successful upload
await loadUserImageInfo(); // ✅ Already doing this

// Also invalidate Redux profile pictures cache
dispatch(invalidateProfilePicture(userId));
```

### Issue 3: Presigned URL Expiration

If the modal is open for >1 hour, presigned URLs expire:

**Current:** URL valid for 1 hour  
**Cached:** 50 minutes in Redis

**Fix:** Refresh URL when loading image info

```tsx
const loadUserImageInfo = async () => {
  // This already fetches fresh URL from backend
  const info = await getUserImageInfo(userId);
  setImageInfo(info); // ✅ Updates with fresh URL
};
```

---

## 🎯 Summary

### Root Cause

**Field name mismatch:** `user_picture_url` (snake_case) vs `userPictureUrl` (camelCase)

### Where It Breaks

- Redux gets updated correctly with new image_id
- ProfilePicture component reads from wrong field (User prop instead of Redux)
- Component displays old image because User prop wasn't updated

### Quick Fix

Read from Redux state instead of User prop:

```tsx
const reduxUser = useSelector((state: RootState) => state.auth.user);

<ProfilePicture imageId={reduxUser?.userPictureUrl} />;
```

### Long-term Fix

Standardize field names across the entire application (all camelCase or all snake_case)

---

## ✅ Action Items

- [ ] Fix EditProfileModal to read from Redux
- [ ] Test profile picture update flow
- [ ] Consider standardizing field names project-wide
- [ ] Add cache invalidation after upload
- [ ] Document field naming conventions

---

**Status:** Ready to implement fixes 🚀
