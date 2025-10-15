# Profile Picture Caching - Quick Start Guide

## 📊 Current State Analysis

### Data Flow Path

```
User Opens Modal
    ↓
ProfilePicture Component
    ↓
API Call: GET /images/user/{user_id}
    ↓
Backend: UserService.get_user_info()
    ↓
Redis Cache Check → ArangoDB Query
    ↓
Extract user_picture_url (image_id)
    ↓
MinIO.get_image_url() → Generate Presigned URL
    ↓
Return URL to Frontend
    ↓
Browser Downloads Image from MinIO
    ↓
Display Image (200-500ms total)
```

### 🔴 Current Problems

1. **No client-side caching** - Every modal open = API call
2. **Presigned URLs expire** - Regenerated every hour
3. **No offline support** - Network required
4. **Slow initial load** - 200-500ms per image
5. **Redux only stores image_id** - Not the URL
6. **Lost on refresh** - Redux state cleared

---

## 🎯 Proposed Solution: Multi-Layer Cache

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Cache Hierarchy                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1️⃣ Redux Store (In-Memory)          ⚡ <5ms              │
│     └─ Active session cache                                │
│                                                             │
│  2️⃣ LocalStorage (Persistent)         ⚡ ~10ms            │
│     └─ Survives page refresh                               │
│                                                             │
│  3️⃣ IndexedDB (Blob Storage)          ⚡ ~20ms            │
│     └─ Actual image files (no expiry)                      │
│                                                             │
│  4️⃣ Service Worker (Offline)          ⚡ ~30ms            │
│     └─ Network interceptor + cache                         │
│                                                             │
│  5️⃣ Backend Redis (URL Cache)         ⚡ ~50ms            │
│     └─ Reduce MinIO API calls                              │
│                                                             │
│  6️⃣ Network (API Call)                 🐌 ~200-500ms      │
│     └─ Fallback when all caches miss                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Implementation Checklist

### Phase 1: Backend Redis Cache (Week 1)

- [ ] Create `ImageURLCacheService` class
- [ ] Cache presigned URLs for 50 minutes
- [ ] Add HTTP cache headers (Cache-Control, ETag)
- [ ] Monitor MinIO API call reduction

**Files to Create**:

- `backend/app/services/image_url_cache_service.py`

**Files to Modify**:

- `backend/app/services/minio_image_service.py`
- `backend/app/routers/images.py`

**Expected Impact**: 90% reduction in MinIO API calls

---

### Phase 2: Frontend Caching (Week 2)

- [ ] Create `ImageCacheManager` service
- [ ] Implement LocalStorage layer
- [ ] Implement IndexedDB layer (with blob storage)
- [ ] Update Redux `profilePicturesSlice`
- [ ] Modify `ProfilePicture` component
- [ ] Add background refresh logic

**Files to Create**:

- `frontend/src/services/imageCacheManager.ts`
- `frontend/src/store/slices/profilePicturesSlice.ts`
- `frontend/src/services/imagePerformanceMonitor.ts`

**Files to Modify**:

- `frontend/src/components/common/ProfileComponents.tsx`
- `frontend/src/store/index.ts` (add new slice)

**Expected Impact**: <5ms load time for cached images

---

### Phase 3: Service Worker (Week 3)

- [ ] Create service worker
- [ ] Implement Cache API integration
- [ ] Add offline support
- [ ] Background sync for expired URLs

**Files to Create**:

- `frontend/public/sw.js`
- `frontend/src/utils/serviceWorkerRegistration.ts`

**Files to Modify**:

- `frontend/src/app/layout.tsx` (register SW)

**Expected Impact**: Full offline support

---

### Phase 4: Optimization (Week 4)

- [ ] Add performance monitoring
- [ ] Optimize cache eviction
- [ ] Add preloading strategies
- [ ] Fine-tune TTLs

**Files to Modify**:

- All cache-related files (refinements)

---

## 🚀 Quick Implementation Guide

### Step 1: Backend Redis Cache

```python
# backend/app/services/image_url_cache_service.py
class ImageURLCacheService:
    def get_cached_url(self, image_id: str) -> Optional[str]:
        key = f"profile_pic:url:{image_id}"
        return self.redis.get(key)

    def cache_url(self, image_id: str, url: str) -> None:
        key = f"profile_pic:url:{image_id}"
        self.redis.setex(key, 3000, url)  # 50 minutes
```

**Integration**:

```python
# In minio_image_service.py
def get_image_url(self, image_id: Optional[str]) -> str:
    # Check cache first
    cached = url_cache_service.get_cached_url(image_id)
    if cached:
        return cached

    # Generate new URL
    url = self.client.presigned_get_object(...)

    # Cache it
    url_cache_service.cache_url(image_id, url)
    return url
```

---

### Step 2: Frontend Cache Manager

```typescript
// frontend/src/services/imageCacheManager.ts
class ImageCacheManager {
  async get(userId: string): Promise<CachedImage | null> {
    // Layer 1: LocalStorage
    const local = this.getFromLocalStorage(userId);
    if (local) return local;

    // Layer 2: IndexedDB
    const idb = await this.getFromIndexedDB(imageId);
    if (idb) return idb;

    return null;
  }

  async set(userId: string, data: CachedImage): Promise<void> {
    this.setInLocalStorage(userId, data);
    await this.setInIndexedDB(data.image_id, data);
  }
}
```

---

### Step 3: Updated ProfilePicture Component

```typescript
export function ProfilePicture({ userId, imageId }: ProfilePictureProps) {
  const dispatch = useDispatch();
  const cached = useSelector((state) => state.profilePictures.pictures[userId]);

  useEffect(() => {
    // Use cached if available
    if (cached) {
      setImageUrl(cached.url);
      return;
    }

    // Fetch with caching
    dispatch(fetchProfilePicture(userId));
  }, [userId, cached]);

  // ... rest of component
}
```

---

## 📈 Expected Performance Improvements

| Scenario              | Before    | After     | Improvement      |
| --------------------- | --------- | --------- | ---------------- |
| First load (cold)     | 200-500ms | 200-500ms | -                |
| Second load (warm)    | 200-500ms | <5ms      | **100x faster**  |
| After page refresh    | 200-500ms | <10ms     | **50x faster**   |
| Offline mode          | ❌ Fails  | ✅ Works  | **Infinite**     |
| API calls per session | ~10       | <2        | **5x reduction** |

---

## 🧪 Testing Commands

```bash
# Test backend cache
cd backend
python test_image_url_cache.py

# Test frontend cache
cd frontend
npm run test:cache

# E2E test
npm run test:e2e -- --spec=profile-picture-cache.spec.ts
```

---

## 🎓 Key Concepts

### Cache TTLs

- **Redux**: 30 minutes (in-memory, fast)
- **LocalStorage**: 45 minutes (persistent, fast)
- **IndexedDB**: 7 days (blob storage, medium)
- **Service Worker**: 7 days (offline support)
- **Backend Redis**: 50 minutes (URL cache)

### Cache Invalidation

```typescript
// When user uploads new picture
dispatch(invalidateProfilePicture(userId));

// When user logs out
dispatch(clearAllProfilePictures());
```

### Background Refresh

```typescript
// If URL expires in < 10 minutes, refresh in background
if (timeUntilExpiry < 10 * 60 * 1000) {
  dispatch(refreshProfilePicture(userId)); // Don't await
}
```

---

## 📚 Further Reading

- [PROFILE_PICTURE_QUERY_SYSTEM.md](./PROFILE_PICTURE_QUERY_SYSTEM.md) - Detailed current implementation
- [PROFILE_PICTURE_CACHING_IMPLEMENTATION_PLAN.md](./PROFILE_PICTURE_CACHING_IMPLEMENTATION_PLAN.md) - Full plan

---

## 🆘 Troubleshooting

### Cache not working?

1. Check browser console for errors
2. Verify `imageCacheManager.init()` was called
3. Check LocalStorage quota (5MB limit)
4. Clear caches: `imageCacheManager.clearAll()`

### Images not updating after upload?

1. Verify cache invalidation is triggered
2. Check WebSocket events are firing
3. Manually invalidate: `dispatch(invalidateProfilePicture(userId))`

### Performance still slow?

1. Check cache hit rates: `imagePerformanceMonitor.getStats()`
2. Verify service worker is registered
3. Check network tab for unnecessary requests

---

## 🎯 Success Criteria

- ✅ Profile modal opens in <100ms
- ✅ Images load in <50ms (cached)
- ✅ >90% cache hit rate
- ✅ <2 API calls per user session
- ✅ Works offline for viewed images
- ✅ No stale images after updates

---

## 👥 Team Assignments

**Backend Developer**:

- Week 1: Redis cache implementation
- Week 2: API optimization, monitoring

**Frontend Developer**:

- Week 1: Cache manager service
- Week 2: Redux integration, component updates
- Week 3: Service worker implementation
- Week 4: Performance monitoring

---

**Start Here**: Phase 1, Backend Redis Cache
**Questions?**: See detailed plan in `PROFILE_PICTURE_CACHING_IMPLEMENTATION_PLAN.md`
