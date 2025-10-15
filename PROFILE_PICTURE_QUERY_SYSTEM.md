# Profile Picture Querying System - Implementation Details

## Overview

The profile picture system in the User Profile Modal uses a sophisticated multi-layered architecture that combines React components, Redux state management, REST APIs, and MinIO object storage. This document outlines the complete flow of how profile pictures are queried, cached, and displayed.

---

## Architecture Components

### 1. Frontend Components

#### ProfilePicture Component (`ProfileComponents.tsx`)

**Location**: `frontend/src/components/common/ProfileComponents.tsx`

**Purpose**: React component that handles the display and fetching of profile pictures

**Props Interface**:

```typescript
interface ProfilePictureProps {
  size?: string; // Display size (default: "100px")
  emoji?: string; // Fallback emoji (default: "👤")
  imageId?: string | null; // Specific image ID in MinIO, or null for default
  userId?: string; // User ID to fetch their profile picture
  style?: React.CSSProperties;
}
```

**Behavior Logic**:

1. **Priority System**:

   - If `imageId` is provided (including `null`), uses that directly
   - If no `imageId` but `userId` is provided, fetches user's profile picture from backend
   - If neither provided, gets default profile picture

2. **State Management**:

   ```typescript
   const [imageUrl, setImageUrl] = useState<string | null>(null);
   const [imageError, setImageError] = useState<boolean>(false);
   const [isLoading, setIsLoading] = useState<boolean>(false);
   ```

3. **Fetch Process** (via `useEffect`):

   ```typescript
   useEffect(() => {
     setIsLoading(true);
     setImageError(false);
     setImageUrl(null);

     getImageUrlSmart(imageId, userId)
       .then((response) => {
         if (response.success && response.url) {
           setImageUrl(response.url);
         } else {
           setImageError(true);
         }
       })
       .catch((error) => {
         setImageError(true);
       })
       .finally(() => {
         setIsLoading(false);
       });
   }, [imageId, userId]);
   ```

4. **Render States**:
   - **Loading**: Shows ⏳ emoji while fetching
   - **Success**: Displays `<img>` with fetched URL
   - **Error**: Shows "Image Failed ↻" with click-to-retry functionality

**Error Handling**:

- Image load failures trigger `onError` handler
- Failed images can be retried by clicking
- Graceful fallback to retry UI

---

### 2. API Layer

#### Image API (`imageApi.ts`)

**Location**: `frontend/src/components/common/imageApi.ts`

**Key Functions**:

##### `getImageUrlSmart()`

**Purpose**: Smart routing function that determines the appropriate API endpoint

```typescript
export async function getImageUrlSmart(
  imageId?: string | null,
  userId?: string | null
): Promise<ImageResponse>;
```

**Logic**:

```typescript
if (imageId !== undefined) {
  // Explicit image ID provided (including null for default)
  return getImageUrl(imageId);
} else if (userId) {
  // No image ID but user ID provided - fetch user's profile picture
  return getImageUrlByUserId(userId);
} else {
  // Neither provided - get default
  return getImageUrl(null);
}
```

##### `getImageUrlByUserId()`

**Purpose**: Fetches user-specific profile picture via user ID

```typescript
export async function getImageUrlByUserId(userId: string): Promise<ImageResponse> {
  const url = createBackendURL(`/images/user/${encodeURIComponent(userId)}`);

  const response = await fetch(url, {
    method: "GET",
    credentials: API_CONFIG.credentials,
  });

  return response.json();
}
```

**Backend Endpoint**: `GET /images/user/{user_id}`

##### `getImageUrl()`

**Purpose**: Fetches image by image ID (or default if null)

```typescript
export async function getImageUrl(imageId: string | null | undefined): Promise<ImageResponse> {
  const id = imageId || "None";
  const url = createBackendURL(`/images/${encodeURIComponent(id)}`);

  const response = await fetch(url, {
    method: "GET",
    credentials: API_CONFIG.credentials,
  });

  return response.json();
}
```

**Backend Endpoint**: `GET /images/{image_id}`

##### `getUserImageInfo()`

**Purpose**: Gets comprehensive image information including custom picture status

```typescript
export async function getUserImageInfo(userId: string): Promise<ImageInfoResponse> {
  const url = createBackendURL(`/images/user/${encodeURIComponent(userId)}/info`);

  const response = await fetch(url, {
    method: "GET",
    credentials: API_CONFIG.credentials,
  });

  return response.json();
}
```

**Backend Endpoint**: `GET /images/user/{user_id}/info`

**Response Type**:

```typescript
interface ImageInfoResponse {
  success: boolean;
  user_id: string;
  image_id: string;
  url: string;
  has_custom_picture: boolean;
  is_default: boolean;
}
```

---

### 3. Backend Endpoints

#### Images Router (`images.py`)

**Location**: `backend/app/routers/images.py`

##### `GET /images/user/{user_id}/info`

**Purpose**: Get comprehensive user image information

**Flow**:

1. Query user service for user info (includes `user_picture_url` from ArangoDB)
2. Determine if user has custom picture (`image_id is not None`)
3. Generate presigned URL from MinIO
4. Return metadata + URL

**Response**:

```python
{
    "success": True,
    "user_id": user_id,
    "image_id": image_id if image_id else "default_pfp.png",
    "url": url,  # Presigned MinIO URL
    "has_custom_picture": has_custom_picture,
    "is_default": not has_custom_picture
}
```

##### `GET /images/user/{user_id}`

**Purpose**: Get presigned URL for user's profile picture

**Flow**:

1. Fetch `user_picture_url` from ArangoDB via UserService
2. If no user found or `user_picture_url` is `None`, use default
3. Get presigned URL from MinIO service
4. Return URL with metadata

**Code**:

```python
@router.get("/user/{user_id}")
async def get_image_url_by_user_id(
    user_id: str,
    user_service: UserService = Depends(get_user_service)
):
    # Get user info from ArangoDB
    user_info = user_service.get_user_info(user_id)

    if not user_info:
        logger.warning(f"User {user_id} not found, returning default image")
        image_id = None
    else:
        image_id = user_info.get('user_picture_url')
        logger.debug(f"User {user_id} has picture URL: {image_id}")

    # Get presigned URL (handles None -> default)
    url = minio_service.get_image_url(image_id)

    return {
        "success": True,
        "user_id": user_id,
        "image_id": image_id if image_id else "default_pfp.png",
        "url": url
    }
```

##### `GET /images/{image_id}`

**Purpose**: Get presigned URL by image ID

**Flow**:

1. Handle special cases ("None", "null" → null)
2. Generate presigned URL from MinIO
3. Return URL

**Code**:

```python
@router.get("/{image_id}")
async def get_image_url(image_id: str = None):
    # Handle None case
    if image_id and image_id.lower() in ["none", "null"]:
        image_id = None

    url = minio_service.get_image_url(image_id)

    return {
        "success": True,
        "image_id": image_id if image_id else "default_pfp.png",
        "url": url
    }
```

---

### 4. Redux State Management

#### Auth Slice (`authSlice.ts`)

**Location**: `frontend/src/store/slices/authSlice.ts`

##### Async Thunk: `fetchUserProfilePicture`

**Purpose**: Fetch user profile picture URL and store in Redux

```typescript
export const fetchUserProfilePicture = createAsyncThunk(
  "auth/fetchUserProfilePicture",
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/users/info`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_ids: [userId] }),
      });

      const data = await response.json();

      if (data.success && data.users && data.users[userId]) {
        return data.users[userId].user_picture_url || null;
      }

      return null;
    } catch (error) {
      return rejectWithValue("Network error while fetching profile picture");
    }
  }
);
```

**Note**: This uses the `/api/users/info` endpoint, not `/images/*` endpoints

##### Reducer: `updateProfilePicture`

**Purpose**: Synchronously update profile picture in Redux state

```typescript
updateProfilePicture: (state, action: PayloadAction<string | null>) => {
  if (state.user) {
    state.user.userPictureUrl = action.payload;
  }
};
```

**Usage**:

```typescript
dispatch(updateProfilePicture(newImageUrl));
```

##### Extra Reducer: Handle fetch completion

```typescript
.addCase(fetchUserProfilePicture.fulfilled, (state, action) => {
  if (state.user) {
    state.user.userPictureUrl = action.payload;
  }
})
```

---

### 5. User Profile Modal Integration

#### UserProfileModal Component

**Location**: `frontend/src/components/garden/UserProfileModal.tsx`

**Profile Picture Display**:

```tsx
<ProfilePicture
  size="100px"
  userId={user.id || user.userId}
  imageId={(user as any).user_picture_url}
/>
```

**Key Points**:

- Passes both `userId` and `imageId` (as `user_picture_url`)
- If `user_picture_url` exists, it takes priority
- Otherwise, falls back to fetching by `userId`

**Interaction Flow**:

1. User clicks profile picture
2. Opens `EditProfileModal`
3. Modal calls `getUserImageInfo()` to load current state
4. Displays upload/remove options based on `has_custom_picture`

---

### 6. Edit Profile Modal

#### EditProfileModal Component

**Location**: `frontend/src/components/garden/ui/EditProfileModal.tsx`

**Image Info Loading**:

```typescript
const loadUserImageInfo = async () => {
  const userId = user.id || user.userId;
  if (!userId) return;

  setIsLoadingImageInfo(true);
  try {
    const info = await getUserImageInfo(userId);
    setImageInfo(info);
  } catch (error) {
    console.error("Error loading user image info:", error);
    showMessage("Failed to load profile picture information", "error");
  } finally {
    setIsLoadingImageInfo(false);
  }
};
```

**Upload Flow**:

```typescript
const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  // Validation
  const validTypes = ["image/png", "image/jpeg", "image/jpg"];
  if (!validTypes.includes(file.type)) {
    showMessage("Please select a PNG, JPEG, or JPG image file", "error");
    return;
  }

  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    showMessage("Image file size must be less than 10MB", "error");
    return;
  }

  // Upload
  const uploadResponse = await uploadProfilePicture(file);

  // Update user's profile picture URL in ArangoDB
  const updateResponse = await updateUserProfilePicture(userId, uploadResponse.image_id);

  // Update Redux state
  if (updateResponse.user && updateResponse.user.user_picture_url) {
    dispatch(updateProfilePicture(updateResponse.user.user_picture_url));
  } else {
    // Fallback: fetch the profile picture from the API
    dispatch(fetchUserProfilePicture(userId));
  }

  // Reload image info
  await loadUserImageInfo();
};
```

**Remove Flow**:

```typescript
const handleRemoveImage = async () => {
  const response = await removeUserProfilePicture(userId);

  if (response.success) {
    // Update Redux state (null = default)
    dispatch(updateProfilePicture(null));

    // Update local image info
    setImageInfo({
      ...imageInfo,
      has_custom_picture: false,
      is_default: true,
      image_id: "default_pfp.png",
      url: response.url,
    });
  }
};
```

---

## Complete Query Flow

### Scenario 1: User Profile Modal Opens

**Step-by-step**:

1. **Component Render**

   - `UserProfileModal` renders with `user` prop
   - User object contains `user.id`, `user.userId`, and possibly `(user as any).user_picture_url`

2. **ProfilePicture Component Mount**

   ```tsx
   <ProfilePicture
     size="100px"
     userId={user.id || user.userId}
     imageId={(user as any).user_picture_url}
   />
   ```

3. **useEffect Triggers**

   - Checks if `imageId` (user_picture_url) is provided
   - If yes, calls `getImageUrlSmart(imageId, userId)`
   - Priority: imageId → userId → default

4. **API Call Path A** (if user_picture_url exists):

   ```
   getImageUrlSmart(imageId, userId)
   → getImageUrl(imageId)
   → GET /images/{image_id}
   → MinIO presigned URL returned
   ```

5. **API Call Path B** (if user_picture_url is null/undefined):

   ```
   getImageUrlSmart(undefined, userId)
   → getImageUrlByUserId(userId)
   → GET /images/user/{user_id}
   → UserService.get_user_info(user_id)
   → Check user_picture_url from ArangoDB
   → MinIO presigned URL returned (default if null)
   ```

6. **Backend Processing** (Path B):

   ```python
   # In images.py
   user_info = user_service.get_user_info(user_id)
   image_id = user_info.get('user_picture_url')  # Could be None
   url = minio_service.get_image_url(image_id)   # Handles None → default
   ```

7. **MinIO Service**:

   - If `image_id` is None → returns `default_pfp.png`
   - If `image_id` exists → generates presigned URL for that object
   - Returns URL with expiration (typically 1 hour)

8. **Frontend Receives Response**:

   ```typescript
   {
     success: true,
     user_id: "user123",
     image_id: "abc123.png" | "default_pfp.png",
     url: "https://minio-url.com/presigned-url"
   }
   ```

9. **Component Updates**:

   - `setImageUrl(response.url)`
   - `setIsLoading(false)`
   - Component re-renders with `<img src={imageUrl} />`

10. **Image Display**:
    - Browser fetches image from presigned MinIO URL
    - If fetch fails, `onError` triggers → `setImageError(true)`
    - Error state shows "Image Failed ↻" with retry option

---

### Scenario 2: Redux State Integration

**When does Redux get involved?**

1. **Initial App Load** (`GardenIcons.tsx`):

   ```typescript
   useEffect(() => {
     if (user && user.userId && !reduxUser?.userPictureUrl) {
       dispatch(fetchUserProfilePicture(user.userId));
     }
   }, [user, reduxUser?.userPictureUrl, dispatch]);
   ```

2. **Fetch Flow**:

   ```
   dispatch(fetchUserProfilePicture(userId))
   → POST /api/users/info with { user_ids: [userId] }
   → Returns { users: { userId: { user_picture_url: "abc123.png" } } }
   → Redux state updated: state.user.userPictureUrl = "abc123.png"
   ```

3. **Usage in Components**:

   ```typescript
   const reduxUser = useSelector((state: RootState) => state.auth.user);
   const userPictureUrl = reduxUser?.userPictureUrl;

   // Passed to ProfilePicture component
   <ProfilePicture imageId={userPictureUrl} userId={userId} />;
   ```

4. **Update After Upload/Remove**:

   ```typescript
   // After successful upload
   dispatch(updateProfilePicture(newImageId));

   // After successful removal
   dispatch(updateProfilePicture(null));
   ```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER PROFILE MODAL                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  <ProfilePicture                                           │ │
│  │    size="100px"                                            │ │
│  │    userId={user.id}                                        │ │
│  │    imageId={user.user_picture_url}  // from Redux or prop │ │
│  │  />                                                        │ │
│  └────────────────────┬───────────────────────────────────────┘ │
└─────────────────────┬─┴───────────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │  useEffect in ProfilePicture │
        │  Triggers on mount/deps      │
        └─────────────┬───────────────┘
                      │
                      ▼
        ┌─────────────────────────────────────────┐
        │  getImageUrlSmart(imageId, userId)      │
        │                                          │
        │  Logic:                                  │
        │  if imageId !== undefined:              │
        │    → getImageUrl(imageId)               │
        │  else if userId:                        │
        │    → getImageUrlByUserId(userId)        │
        │  else:                                   │
        │    → getImageUrl(null)                  │
        └──────────┬─────────┬────────────────────┘
                   │         │
          ┌────────┘         └─────────┐
          ▼                            ▼
┌──────────────────────┐    ┌────────────────────────────┐
│ GET /images/{id}     │    │ GET /images/user/{user_id} │
│                      │    │                            │
│ → MinIO Service      │    │ → UserService.get_user_info│
│ → Generate URL       │    │ → Get user_picture_url     │
│                      │    │ → MinIO Service            │
│                      │    │ → Generate URL             │
└──────────┬───────────┘    └────────────┬───────────────┘
           │                             │
           └──────────┬──────────────────┘
                      ▼
         ┌─────────────────────────────┐
         │  ArangoDB Query              │
         │  users/{user_id}             │
         │  → user_picture_url field    │
         └──────────┬──────────────────┘
                    │
                    ▼
         ┌──────────────────────────────┐
         │  MinIO Service                │
         │  get_image_url(image_id)      │
         │                               │
         │  if image_id is None:         │
         │    return "default_pfp.png"   │
         │  else:                        │
         │    generate presigned URL     │
         └──────────┬───────────────────┘
                    │
                    ▼
         ┌──────────────────────────────┐
         │  Return to Frontend           │
         │  {                            │
         │    success: true,             │
         │    image_id: "...",           │
         │    url: "presigned-url",      │
         │    user_id: "..." (optional)  │
         │  }                            │
         └──────────┬───────────────────┘
                    │
                    ▼
         ┌──────────────────────────────┐
         │  ProfilePicture Component     │
         │  setImageUrl(response.url)    │
         │  Re-render with <img>         │
         └───────────────────────────────┘
```

---

## Key Technical Details

### 1. Presigned URLs

- **Lifetime**: Typically 1 hour (configured in MinIO service)
- **Security**: Temporary access tokens, no direct MinIO access needed
- **Caching**: URLs are not cached; component refetches on every mount
- **Expiration**: If URL expires, component shows error and allows retry

### 2. Default Profile Picture

- **Image ID**: `default_pfp.png`
- **Storage**: Stored in MinIO bucket
- **Trigger**: Automatically used when `user_picture_url` is `None` in ArangoDB
- **Backend Logic**: MinIO service handles `None` → `default_pfp.png` conversion

### 3. Image Validation

**Frontend**:

- Accepted types: PNG, JPEG, JPG
- Max size: 10MB
- Auto-resize: Images are resized to 128x128 on backend

**Backend**:

- Content-Type validation
- Format validation
- Automatic resizing via PIL/Pillow

### 4. State Management Layers

**Component State** (ProfilePicture):

```typescript
const [imageUrl, setImageUrl] = useState<string | null>(null);
const [imageError, setImageError] = useState<boolean>(false);
const [isLoading, setIsLoading] = useState<boolean>(false);
```

**Redux State** (Global):

```typescript
interface UserSession {
  userId: string;
  userEmail: string;
  userName: string;
  userPictureUrl: string | null; // ← Profile picture URL
}
```

**Why Both?**

- **Component State**: Immediate UI feedback, loading states, error handling
- **Redux State**: Global persistence, shared across components, avoid re-fetching

### 5. Error Handling Strategy

**Network Errors**:

```typescript
.catch((error) => {
  console.error("Error fetching profile picture from minIO:", error);
  setImageError(true);
})
```

**Image Load Errors**:

```tsx
<img
  onError={() => {
    console.error("Failed to load profile image from minIO:", imageUrl);
    setImageError(true);
    setImageUrl(null);
  }}
/>
```

**Retry Mechanism**:

- Click on error state triggers re-fetch
- Same logic as initial fetch
- Allows user to manually retry failed loads

---

## Performance Considerations

### 1. Fetch Optimization

- **Dependency Array**: `useEffect` only re-fetches when `imageId` or `userId` changes
- **Early Returns**: Component checks loading/error states before rendering
- **Smart Routing**: Priority system avoids unnecessary API calls

### 2. Caching Strategy

**Current**: No caching in ProfilePicture component
**Redux**: Caches `userPictureUrl` globally
**MinIO**: Presigned URLs provide browser-level caching

**Potential Improvements**:

- Implement React Query for automatic cache management
- Add SWR (stale-while-revalidate) pattern
- Cache presigned URLs in localStorage with expiration

### 3. Loading States

- **Immediate Feedback**: Shows loading spinner on mount
- **Prevents Layout Shift**: Fixed size container (100px default)
- **Graceful Degradation**: Error state maintains same dimensions

---

## Security Aspects

### 1. Presigned URLs

- **Temporary Access**: URLs expire after set duration
- **No Direct Credentials**: Frontend never has MinIO credentials
- **Scoped Permissions**: URLs only grant access to specific objects

### 2. User Validation

- **Backend Verification**: User service validates user existence
- **Access Control**: Users can only access their own profile picture endpoint for modifications
- **Image Validation**: Content-Type and size limits prevent malicious uploads

### 3. CORS & Credentials

```typescript
const response = await fetch(url, {
  method: "GET",
  credentials: API_CONFIG.credentials, // "include" for cookies
});
```

---

## Common Issues & Solutions

### Issue 1: Profile Picture Not Loading

**Symptoms**: Loading spinner indefinitely or shows error state

**Debugging Steps**:

1. Check browser console for API errors
2. Verify `userId` and `imageId` props are correct
3. Check network tab for failed requests
4. Verify backend `/images/*` endpoints are accessible
5. Check ArangoDB for `user_picture_url` field

**Common Causes**:

- User not found in ArangoDB
- MinIO service down
- Presigned URL expired
- CORS issues

### Issue 2: Wrong Image Displayed

**Symptoms**: Seeing another user's image or default when should have custom

**Debugging Steps**:

1. Check Redux state: `useSelector((state) => state.auth.user.userPictureUrl)`
2. Verify `user_picture_url` in ArangoDB matches expected image_id
3. Check MinIO for existence of image file
4. Clear browser cache

**Common Causes**:

- Stale Redux state
- Image upload failed but UI didn't update
- Database update failed during upload

### Issue 3: Upload Succeeds but Image Not Updating

**Symptoms**: Upload completes but old image still shown

**Debugging Steps**:

1. Check if Redux was updated: `dispatch(updateProfilePicture(...))`
2. Verify `loadUserImageInfo()` was called after upload
3. Check if `user_picture_url` in ArangoDB was updated
4. Force component remount

**Common Causes**:

- Missing Redux dispatch after upload
- Component not re-rendering due to dependency issues
- Async race condition

---

## Testing Checklist

### Unit Tests

- [ ] ProfilePicture renders loading state
- [ ] ProfilePicture renders image when URL provided
- [ ] ProfilePicture renders error state on fetch failure
- [ ] ProfilePicture retry mechanism works
- [ ] getImageUrlSmart routes correctly based on params
- [ ] Redux actions update state correctly

### Integration Tests

- [ ] Full upload flow: file → MinIO → ArangoDB → Redux → UI
- [ ] Full removal flow: delete from MinIO → clear ArangoDB → update Redux → UI
- [ ] User profile modal displays correct image
- [ ] Edit modal loads current image info
- [ ] Switching between users shows correct images

### E2E Tests

- [ ] User can upload profile picture
- [ ] User can remove profile picture
- [ ] Image persists across page refreshes
- [ ] Default image shown for new users
- [ ] Presigned URLs refresh correctly

---

## Future Enhancements

### 1. Caching Layer

- Implement React Query for automatic caching and refetching
- Add localStorage cache for presigned URLs with expiration
- Implement SWR pattern for better UX

### 2. Image Optimization

- Add WebP format support
- Implement lazy loading for images
- Add blur placeholder while loading
- Support multiple image sizes (thumbnails, full-size)

### 3. User Experience

- Drag-and-drop upload
- Image cropping before upload
- Real-time preview during upload
- Avatar customization options

### 4. Performance

- Batch image requests for friend lists
- Implement CDN caching layer
- Add service worker for offline support
- Optimize image compression

### 5. Analytics

- Track image upload success rates
- Monitor presigned URL expiration issues
- Measure load times for images
- Track user engagement with profile pictures

---

## Conclusion

The profile picture querying system is a well-architected, multi-layered solution that balances:

- **Performance**: Smart routing, loading states, error handling
- **Security**: Presigned URLs, backend validation, access control
- **User Experience**: Immediate feedback, retry mechanisms, graceful degradation
- **Maintainability**: Clear separation of concerns, typed interfaces, documented flow

The system successfully handles the complexity of integrating React components, Redux state, REST APIs, ArangoDB, and MinIO object storage while providing a seamless user experience.
