# Profile Picture Caching - Quick Start Guide 🚀

**For Developers:** How to use the new cached profile picture system

---

## ⚡ TL;DR

**Old way (200-500ms):**

```tsx
import { ProfilePicture } from "@/components/common/ProfileComponents";
<ProfilePicture userId={userId} />;
```

**New way (<5ms cached):**

```tsx
import { CachedProfilePicture } from "@/components/common/CachedProfilePicture";
<CachedProfilePicture userId={userId} />;
```

That's it! Everything else is automatic. 🎉

---

## 📖 Basic Usage

### Option 1: Use the Component (Recommended)

```tsx
import { CachedProfilePicture } from "@/components/common/CachedProfilePicture";

function UserProfile({ userId }: { userId: string }) {
  return (
    <div>
      <h1>User Profile</h1>
      <CachedProfilePicture
        userId={userId}
        size="120px"
        onClick={() => console.log("Profile picture clicked")}
      />
    </div>
  );
}
```

### Option 2: Use the Hook (Advanced)

```tsx
import { useProfilePicture } from "@/hooks/useProfilePicture";

function CustomProfileDisplay({ userId }: { userId: string }) {
  const { url, loading, error, refetch } = useProfilePicture(userId);

  if (loading) return <Spinner />;
  if (error) return <button onClick={refetch}>Retry</button>;

  return <img src={url || "/default.png"} alt="Profile" />;
}
```

---

## 🎯 Common Use Cases

### 1. Friend List (Prefetching)

```tsx
import { CachedProfilePicture } from "@/components/common/CachedProfilePicture";
import { useAppDispatch } from "@/store/hooks";
import { prefetchProfilePictures } from "@/store/slices/profilePicturesSlice";

function FriendsList({ friends }: { friends: Friend[] }) {
  const dispatch = useAppDispatch();

  // Prefetch all friend pictures when list loads
  useEffect(() => {
    const userIds = friends.map((f) => f.userId);
    dispatch(prefetchProfilePictures({ userIds }));
  }, [friends, dispatch]);

  return (
    <div className="friends-grid">
      {friends.map((friend) => (
        <div key={friend.userId} className="friend-card">
          <CachedProfilePicture userId={friend.userId} size="80px" />
          <p>{friend.name}</p>
        </div>
      ))}
    </div>
  );
}
```

### 2. Profile Picture Upload (Cache Invalidation)

```tsx
import { useAppDispatch } from "@/store/hooks";
import { invalidateProfilePicture, fetchProfilePicture } from "@/store/slices/profilePicturesSlice";

function ProfilePictureUploader({ userId }: { userId: string }) {
  const dispatch = useAppDispatch();

  const handleUpload = async (file: File) => {
    // 1. Upload the new picture
    const response = await uploadProfilePicture(file);

    // 2. Invalidate old cache
    await dispatch(
      invalidateProfilePicture({
        userId,
        imageId: response.old_image_id,
      })
    );

    // 3. Fetch the new picture (will cache automatically)
    await dispatch(fetchProfilePicture({ userId }));

    toast.success("Profile picture updated!");
  };

  return <input type="file" onChange={(e) => handleUpload(e.target.files[0])} />;
}
```

### 3. User Modal (Instant Loading)

```tsx
import { CachedProfilePicture } from "@/components/common/CachedProfilePicture";
import { Modal } from "@/components/ui/Modal";

function UserProfileModal({ userId, isOpen, onClose }: UserProfileModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="modal-content">
        {/* Profile picture loads instantly if cached */}
        <CachedProfilePicture userId={userId} size="150px" />
        <UserDetails userId={userId} />
      </div>
    </Modal>
  );
}
```

### 4. Leaderboard (Bulk Loading)

```tsx
import { CachedProfilePicture } from "@/components/common/CachedProfilePicture";

function Leaderboard({ users }: { users: LeaderboardUser[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Rank</th>
          <th>User</th>
          <th>Score</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user, index) => (
          <tr key={user.userId}>
            <td>{index + 1}</td>
            <td>
              <div className="user-info">
                <CachedProfilePicture userId={user.userId} size="40px" />
                <span>{user.name}</span>
              </div>
            </td>
            <td>{user.score}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

## 🔧 Props & API Reference

### CachedProfilePicture Component

```typescript
interface CachedProfilePictureProps {
  userId: string; // Required: User ID to fetch picture for
  size?: string; // Optional: CSS size (default: "100px")
  emoji?: string; // Optional: Fallback emoji (default: "👤")
  style?: CSSProperties; // Optional: Custom styles
  onClick?: () => void; // Optional: Click handler
}
```

### useProfilePicture Hook

```typescript
function useProfilePicture(
  userId: string | undefined | null,
  autoFetch?: boolean // Default: true
): UseProfilePictureResult;

interface UseProfilePictureResult {
  url: string | null; // Profile picture URL (or null if not loaded)
  imageId: string | null; // Image ID in MinIO
  loading: boolean; // True while fetching
  error: string | null; // Error message if failed
  refetch: () => void; // Function to manually refetch
  timestamp: number; // When the picture was cached
}
```

---

## 📊 Performance Expectations

### First Load (Not Cached)

- **Time:** 200-500ms
- **Action:** Fetches from backend, caches in all layers

### Second Load (Same Session)

- **Time:** <1ms
- **Action:** Reads from Redux store (in-memory)

### After Page Refresh (Within 45 minutes)

- **Time:** 1-5ms
- **Action:** Reads from LocalStorage, populates Redux

### After Days (Within 7 days)

- **Time:** 5-10ms
- **Action:** Reads from IndexedDB, populates LocalStorage + Redux

### After Cache Expiry

- **Time:** 50-100ms (backend Redis cache) or 200-500ms (full fetch)
- **Action:** Fetches from backend, updates all caches

---

## 🐛 Troubleshooting

### Issue: Images not showing

**Check authentication:**

```tsx
import { useAppSelector } from "@/store/hooks";

function MyComponent() {
  const isAuth = useAppSelector((state) => state.auth.isAuthenticated);
  console.log("Authenticated?", isAuth);
  // Images only load if user is authenticated
}
```

### Issue: Stale images after upload

**Invalidate cache:**

```tsx
import { invalidateProfilePicture } from "@/store/slices/profilePicturesSlice";

// After upload
dispatch(invalidateProfilePicture({ userId, imageId }));
dispatch(fetchProfilePicture({ userId }));
```

### Issue: Cache taking too much space

**Clear old caches:**

```tsx
import { clearAllProfilePictures } from "@/store/slices/profilePicturesSlice";

// Clear all cached pictures
dispatch(clearAllProfilePictures());
```

**Or check cache stats:**

```tsx
import { imageCacheManager } from "@/services/imageCacheManager";

const stats = await imageCacheManager.getStats();
console.log(stats);
// { localStorageEntries: 25, indexedDBEntries: 50, totalSize: "1.2 MB" }
```

---

## 🎨 Customization Examples

### Custom Loading State

```tsx
function CustomLoading({ userId }: { userId: string }) {
  const { url, loading } = useProfilePicture(userId);

  if (loading) {
    return <Skeleton circle width={100} height={100} />;
  }

  return <img src={url || "/default.png"} />;
}
```

### Custom Error State

```tsx
function ProfileWithRetry({ userId }: { userId: string }) {
  const { url, error, refetch } = useProfilePicture(userId);

  if (error) {
    return (
      <div className="error-state">
        <FiAlertCircle />
        <p>Failed to load</p>
        <button onClick={refetch}>Try Again</button>
      </div>
    );
  }

  return <img src={url || "/default.png"} />;
}
```

### Conditional Prefetching

```tsx
function SmartFriendsList({ friends, activeView }: Props) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Only prefetch when user is viewing the friends tab
    if (activeView === "friends") {
      const userIds = friends.map((f) => f.userId);
      dispatch(prefetchProfilePictures({ userIds }));
    }
  }, [friends, activeView, dispatch]);

  // ... render logic
}
```

---

## 📈 Migration Checklist

If migrating from old ProfilePicture component:

- [ ] Install `idb` package: `pnpm add idb`
- [ ] Import Redux slice in `store.ts` (✅ Already done)
- [ ] Replace imports:

  ```tsx
  // Old
  import { ProfilePicture } from "@/components/common/ProfileComponents";

  // New
  import { CachedProfilePicture } from "@/components/common/CachedProfilePicture";
  ```

- [ ] Update component usage:

  ```tsx
  // Old
  <ProfilePicture userId={userId} imageId={imageId} />

  // New
  <CachedProfilePicture userId={userId} />
  ```

- [ ] Remove manual `imageId` management (automatic now)
- [ ] Test in browser: open DevTools → Application → Local Storage / IndexedDB
- [ ] Verify cache hits in Console: `[ProfilePictures] Cache hit for user ...`

---

## 💡 Best Practices

### DO ✅

- Use `CachedProfilePicture` for all profile picture displays
- Prefetch pictures for lists (friends, leaderboards)
- Invalidate cache after profile picture uploads
- Check authentication state before fetching

### DON'T ❌

- Don't manually manage cache (automatic)
- Don't pass `imageId` prop (fetched automatically)
- Don't fetch without checking `isAuthenticated`
- Don't forget to invalidate after uploads

---

## 📞 Need Help?

**Check the docs:**

- Full implementation: `PROFILE_PICTURE_CACHING_PHASE_2_COMPLETE.md`
- Original plan: `PROFILE_PICTURE_CACHING_IMPLEMENTATION_PLAN.md`
- Current system: `PROFILE_PICTURE_QUERY_SYSTEM.md`

**Debug in browser:**

```javascript
// Open DevTools Console

// Check Redux state
store.getState().profilePictures;

// Check cache stats
import { imageCacheManager } from "@/services/imageCacheManager";
imageCacheManager.getStats();

// Clear all caches
imageCacheManager.clearAll();
```

---

**Happy Caching! 🚀**
