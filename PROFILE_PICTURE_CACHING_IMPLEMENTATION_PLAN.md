# Profile Picture Loading & Caching Implementation Plan

**Goal**: Recreate and optimize the profile picture loading system with comprehensive caching to ensure instant loading when the user profile modal opens.

**Date**: October 14, 2025  
**Status**: Planning Phase

---

## Table of Contents

1. [Current System Analysis](#current-system-analysis)
2. [Data Flow Mapping](#data-flow-mapping)
3. [Identified Issues & Bottlenecks](#identified-issues--bottlenecks)
4. [Proposed Caching Strategy](#proposed-caching-strategy)
5. [Implementation Phases](#implementation-phases)
6. [Technical Specifications](#technical-specifications)
7. [Testing Strategy](#testing-strategy)
8. [Rollout Plan](#rollout-plan)

---

## Current System Analysis

### Backend Architecture

#### 1. **ArangoDB Storage**

- **Location**: `backend/app/services/user_service_arangodb.py`
- **Field**: `user_picture_url` (stores image_id or null)
- **Caching**: Redis cache with TTL (likely 1 hour based on user data caching)

**Current Implementation**:

```python
def get_user_info(self, user_id: str) -> Optional[Dict[str, Any]]:
    # Try Redis cache first
    cached_user = self.cache_service.get_user_from_cache(user_id)
    if cached_user:
        return cached_user

    # Fetch from ArangoDB
    user_info = self._get_user_data_from_arangodb(user_id)

    # Cache in Redis
    self.cache_service.cache_user_info(user_id, user_info)
    return user_info
```

**Issues**:

- ❌ Redis cache doesn't specifically optimize profile picture URLs
- ❌ No separate cache key for profile pictures alone
- ❌ Cache invalidation happens for entire user object, not granular

#### 2. **MinIO Object Storage**

- **Location**: `backend/app/services/minio_image_service.py`
- **Bucket**: `profile-images`
- **Image Format**: PNG/JPEG, auto-resized to 128x128px
- **URL Type**: Presigned URLs (1 hour expiration)

**Current Implementation**:

```python
def get_image_url(self, image_id: Optional[str]) -> str:
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
        expires=timedelta(hours=1)
    )
    return url
```

**Issues**:

- ❌ Presigned URLs expire after 1 hour → requires regeneration
- ❌ No backend caching of presigned URLs
- ❌ Each request generates a new URL (unnecessary overhead)
- ❌ No CDN integration for static assets

#### 3. **REST API Endpoints**

- **Location**: `backend/app/routers/images.py`

**Endpoints**:

1. `GET /images/user/{user_id}/info` - Full image metadata
2. `GET /images/user/{user_id}` - User's profile picture URL
3. `GET /images/{image_id}` - Direct image URL by ID

**Issues**:

- ❌ No HTTP cache headers (Cache-Control, ETag)
- ❌ Every request hits the backend (no browser caching)
- ❌ No rate limiting on image endpoints

### Frontend Architecture

#### 1. **React Component (`ProfilePicture`)**

- **Location**: `frontend/src/components/common/ProfileComponents.tsx`

**Current Flow**:

```typescript
useEffect(() => {
  setIsLoading(true);
  setImageError(false);
  setImageUrl(null);

  getImageUrlSmart(imageId, userId)
    .then((response) => {
      if (response.success && response.url) {
        setImageUrl(response.url);
      }
    })
    .catch(() => setImageError(true))
    .finally(() => setIsLoading(false));
}, [imageId, userId]);
```

**Issues**:

- ❌ Fetches on every component mount
- ❌ No localStorage/sessionStorage caching
- ❌ No service worker caching
- ❌ No image preloading
- ❌ Dependency array causes re-fetch even if URL hasn't changed

#### 2. **Redux State Management**

- **Location**: `frontend/src/store/slices/authSlice.ts`

**Current Implementation**:

```typescript
export const fetchUserProfilePicture = createAsyncThunk(
  "auth/fetchUserProfilePicture",
  async (userId: string) => {
    const response = await fetch(`/api/users/info`, {
      method: "POST",
      body: JSON.stringify({ user_ids: [userId] }),
    });
    const data = await response.json();
    return data.users[userId].user_picture_url || null;
  }
);
```

**Issues**:

- ❌ Only stores `image_id`, not the presigned URL
- ❌ Still requires API call to get presigned URL
- ❌ No timestamp tracking for cache invalidation
- ❌ Redux state lost on page refresh

#### 3. **API Layer**

- **Location**: `frontend/src/components/common/imageApi.ts`

**Issues**:

- ❌ No request deduplication
- ❌ No automatic retry logic
- ❌ No background refresh of expired URLs
- ❌ No optimistic updates

---

## Data Flow Mapping

### Current Flow (Without Optimization)

```
┌─────────────────────────────────────────────────────────────────┐
│                   USER OPENS PROFILE MODAL                       │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │  ProfilePicture Component    │
        │  Mounts & useEffect Triggers │
        └─────────────┬───────────────┘
                      │
                      ▼
        ┌──────────────────────────────────────┐
        │  getImageUrlSmart(imageId, userId)   │
        │  Check Priority:                      │
        │  1. imageId → getImageUrl()          │
        │  2. userId → getImageUrlByUserId()   │
        │  3. default → getImageUrl(null)      │
        └──────────────┬───────────────────────┘
                      │
                      ▼
        ┌──────────────────────────────────────┐
        │  Frontend API Call                    │
        │  GET /images/user/{user_id}          │
        └──────────────┬───────────────────────┘
                      │
                      ▼
        ┌──────────────────────────────────────┐
        │  Backend: images.py                   │
        │  get_image_url_by_user_id()          │
        └──────────────┬───────────────────────┘
                      │
                      ▼
        ┌──────────────────────────────────────┐
        │  UserService.get_user_info(user_id)  │
        │  1. Check Redis Cache                 │
        │  2. If miss, query ArangoDB           │
        │  3. Cache result in Redis             │
        └──────────────┬───────────────────────┘
                      │
                      ▼
        ┌──────────────────────────────────────┐
        │  Extract user_picture_url             │
        │  (image_id or null)                   │
        └──────────────┬───────────────────────┘
                      │
                      ▼
        ┌──────────────────────────────────────┐
        │  MinIOService.get_image_url(image_id)│
        │  1. Validate image exists             │
        │  2. Generate presigned URL            │
        │  3. Return URL (expires in 1 hour)    │
        └──────────────┬───────────────────────┘
                      │
                      ▼
        ┌──────────────────────────────────────┐
        │  Return to Frontend                   │
        │  { success, image_id, url, user_id } │
        └──────────────┬───────────────────────┘
                      │
                      ▼
        ┌──────────────────────────────────────┐
        │  ProfilePicture: setImageUrl(url)    │
        │  Re-render with <img src={url} />    │
        └──────────────┬───────────────────────┘
                      │
                      ▼
        ┌──────────────────────────────────────┐
        │  Browser fetches image from MinIO     │
        │  via presigned URL                    │
        └───────────────────────────────────────┘

⏱️ TOTAL TIME: ~200-500ms
   - Frontend → Backend: 20-50ms
   - Redis/ArangoDB query: 10-50ms
   - MinIO presigned URL generation: 5-20ms
   - Backend → Frontend: 20-50ms
   - Image download: 50-200ms
```

### Proposed Flow (With Multi-Layer Caching)

```
┌─────────────────────────────────────────────────────────────────┐
│                   USER OPENS PROFILE MODAL                       │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────────────────┐
        │  ProfilePicture Component Mounts         │
        └─────────────┬───────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────────────────┐
        │  Check Layer 1: Redux State Cache       │
        │  state.profilePictures[userId]           │
        └─────────────┬───────────────────────────┘
                      │
            ┌─────────┴──────────┐
            │ HIT?              │ MISS
            ▼                    ▼
    ┌──────────────────┐  ┌─────────────────────────┐
    │ Check expiration │  │ Check Layer 2: LocalStorage │
    │ If < 30 min old  │  │ profilePictures[userId]     │
    │ → Use URL        │  └─────────┬─────────────────┘
    │ If expired:      │            │
    │ → Refresh in bg  │  ┌─────────┴──────────┐
    └──────────────────┘  │ HIT?              │ MISS
                          ▼                    ▼
                  ┌──────────────────┐  ┌──────────────────────┐
                  │ Check expiration │  │ Check Layer 3:       │
                  │ If < 45 min old  │  │ IndexedDB            │
                  │ → Use URL        │  │ imageBlobs[image_id] │
                  │ If expired:      │  └─────────┬────────────┘
                  │ → Fetch new      │            │
                  └──────────────────┘  ┌─────────┴──────────┐
                                       │ HIT?              │ MISS
                                       ▼                    ▼
                               ┌──────────────┐  ┌───────────────────┐
                               │ Create Blob  │  │ Check Layer 4:    │
                               │ URL from     │  │ Service Worker    │
                               │ stored data  │  │ Cache API         │
                               │ → Display    │  └─────────┬─────────┘
                               └──────────────┘            │
                                                 ┌─────────┴──────────┐
                                                 │ HIT?              │ MISS
                                                 ▼                    ▼
                                         ┌──────────────┐  ┌───────────────┐
                                         │ Return       │  │ API Call      │
                                         │ cached image │  │ (as current)  │
                                         └──────────────┘  └───────┬───────┘
                                                                    │
                                                                    ▼
                                                         ┌──────────────────────┐
                                                         │ Store in ALL caches: │
                                                         │ 1. Redux             │
                                                         │ 2. LocalStorage      │
                                                         │ 3. IndexedDB         │
                                                         │ 4. Service Worker    │
                                                         └──────────────────────┘

⏱️ OPTIMIZED TIME:
   - Cache Hit (Layer 1): <5ms   ✅ 100x faster
   - Cache Hit (Layer 2): <10ms  ✅ 50x faster
   - Cache Hit (Layer 3): ~20ms  ✅ 10x faster
   - Cache Hit (Layer 4): ~30ms  ✅ 7x faster
   - Cache Miss: ~200-500ms (same as current)
```

---

## Identified Issues & Bottlenecks

### Performance Bottlenecks

1. **No Client-Side Caching**

   - Every component mount triggers API call
   - No persistence across page refreshes
   - No preloading of images

2. **Presigned URL Regeneration**

   - 1-hour expiration causes frequent regeneration
   - Backend generates new URL on every request
   - No URL caching on backend

3. **Sequential Image Loading**

   - Component must fetch URL before loading image
   - Two network requests per image (URL + image)
   - No prefetching or preloading

4. **Redux Inefficiency**
   - Only stores `image_id`, not the URL
   - Lost on page refresh
   - No background refresh of expired URLs

### Cache Invalidation Issues

1. **No Granular Invalidation**

   - Entire user object cache invalidated on any change
   - Profile picture changes clear all user data cache

2. **No Event-Driven Updates**

   - No WebSocket notification when profile picture changes
   - Relies on polling or manual refresh

3. **Cross-Tab Synchronization**
   - No sync between multiple browser tabs
   - Different tabs may show different profile pictures

---

## Proposed Caching Strategy

### Multi-Layer Cache Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    CACHE LAYER HIERARCHY                        │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Layer 1: Redux Store (In-Memory)                              │
│  ├─ TTL: 30 minutes                                            │
│  ├─ Storage: { [userId]: { url, image_id, timestamp } }       │
│  ├─ Scope: Current page session                                │
│  └─ Invalidation: On profile picture update event              │
│                                                                 │
│  Layer 2: LocalStorage (Persistent)                            │
│  ├─ TTL: 45 minutes                                            │
│  ├─ Storage: { [userId]: { url, image_id, timestamp } }       │
│  ├─ Scope: Domain-wide, survives page refresh                  │
│  └─ Invalidation: On timestamp expiration                      │
│                                                                 │
│  Layer 3: IndexedDB (Blob Storage)                             │
│  ├─ TTL: 7 days                                                │
│  ├─ Storage: { [image_id]: Blob, metadata }                   │
│  ├─ Scope: Actual image files, no URL expiration               │
│  └─ Invalidation: LRU eviction when storage > 50MB             │
│                                                                 │
│  Layer 4: Service Worker Cache API                             │
│  ├─ TTL: 7 days                                                │
│  ├─ Storage: Network responses (images + URLs)                 │
│  ├─ Scope: Offline support, background sync                    │
│  └─ Invalidation: On app version change                        │
│                                                                 │
│  Layer 5: Backend Redis (Presigned URLs)                       │
│  ├─ TTL: 50 minutes                                            │
│  ├─ Storage: { [image_id]: presigned_url }                    │
│  ├─ Scope: All users, reduces MinIO API calls                  │
│  └─ Invalidation: 10 minutes before URL expiration             │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Cache Key Strategy

**Format**: `profile_pic:<cache_level>:<identifier>:<version>`

**Examples**:

- Redux: `profile_pic:redux:user123:v1`
- LocalStorage: `profile_pic:local:user123:v1`
- IndexedDB: `profile_pic:idb:abc123.png:v1`
- Service Worker: `profile_pic:sw:abc123.png:v1`
- Backend Redis: `profile_pic:url:abc123.png:v1`

**Version Bumping**:

- Increment `version` when profile picture changes
- Invalidates all caches for that user/image
- Propagated via WebSocket or polling

---

## Implementation Phases

### Phase 1: Backend Caching Layer (Week 1)

**Goal**: Reduce MinIO API calls and improve presigned URL generation

#### Tasks

1. **Redis Presigned URL Cache**

   - [ ] Create `ImageURLCacheService` class
   - [ ] Implement `get_cached_url(image_id)` method
   - [ ] Implement `cache_url(image_id, url, ttl)` method
   - [ ] Add TTL of 50 minutes (10 min buffer before expiration)
   - [ ] Integrate with `MinIOImageService.get_image_url()`

2. **HTTP Cache Headers**

   - [ ] Add `Cache-Control` headers to image endpoints
   - [ ] Implement ETag generation for images
   - [ ] Add `Last-Modified` headers
   - [ ] Configure CORS headers for caching

3. **Image Metadata Cache**
   - [ ] Create separate Redis key for image metadata
   - [ ] Cache `{ image_id, size, content_type, upload_date }`
   - [ ] Reduce ArangoDB queries for user info

**Code Example**:

```python
# backend/app/services/image_url_cache_service.py
from typing import Optional
import logging
from datetime import timedelta

logger = logging.getLogger(__name__)

class ImageURLCacheService:
    def __init__(self, redis_client):
        self.redis = redis_client
        self.cache_ttl = 3000  # 50 minutes in seconds
        self.key_prefix = "profile_pic:url:"

    def get_cached_url(self, image_id: str) -> Optional[str]:
        """Get presigned URL from cache"""
        key = f"{self.key_prefix}{image_id}"
        cached_url = self.redis.get(key)

        if cached_url:
            logger.debug(f"Cache HIT for image {image_id}")
            return cached_url.decode('utf-8')

        logger.debug(f"Cache MISS for image {image_id}")
        return None

    def cache_url(self, image_id: str, url: str) -> None:
        """Cache presigned URL"""
        key = f"{self.key_prefix}{image_id}"
        self.redis.setex(key, self.cache_ttl, url)
        logger.debug(f"Cached URL for image {image_id} (TTL: {self.cache_ttl}s)")

    def invalidate_url(self, image_id: str) -> None:
        """Invalidate cached URL"""
        key = f"{self.key_prefix}{image_id}"
        self.redis.delete(key)
        logger.debug(f"Invalidated cache for image {image_id}")
```

**Integration**:

```python
# backend/app/services/minio_image_service.py
def get_image_url(self, image_id: Optional[str]) -> str:
    if image_id is None or image_id == "default_pfp.png":
        image_id = "default_pfp.png"

    # Check URL cache first
    cached_url = url_cache_service.get_cached_url(image_id)
    if cached_url:
        return cached_url

    # Generate new presigned URL
    url = self.client.presigned_get_object(
        bucket_name=self.bucket_name,
        object_name=image_id,
        expires=timedelta(hours=1)
    )

    # Cache the URL
    url_cache_service.cache_url(image_id, url)

    return url
```

**Expected Impact**:

- ✅ 90% reduction in MinIO API calls
- ✅ 50ms faster response time for cached URLs
- ✅ Reduced MinIO rate limiting issues

---

### Phase 2: Frontend Caching Layer (Week 2)

**Goal**: Implement multi-layer browser caching for instant loads

#### Tasks

1. **Create Cache Manager Service**

   - [ ] Create `frontend/src/services/imageCacheManager.ts`
   - [ ] Implement LocalStorage cache layer
   - [ ] Implement IndexedDB cache layer
   - [ ] Add cache expiration logic
   - [ ] Add LRU eviction for storage limits

2. **Enhance Redux State**

   - [ ] Add `profilePictures` slice to Redux store
   - [ ] Store `{ url, image_id, timestamp, blob_url }`
   - [ ] Add background refresh thunk
   - [ ] Add invalidation actions

3. **Update ProfilePicture Component**
   - [ ] Check cache before API call
   - [ ] Display cached image immediately
   - [ ] Refresh in background if near expiration
   - [ ] Handle cache miss gracefully

**Code Example**:

```typescript
// frontend/src/services/imageCacheManager.ts
import { openDB, IDBPDatabase } from "idb";

interface CachedImage {
  url: string;
  image_id: string;
  timestamp: number;
  blob?: Blob;
}

interface CacheEntry {
  data: CachedImage;
  expiresAt: number;
}

class ImageCacheManager {
  private dbName = "profile_pictures_cache";
  private storeName = "images";
  private localStoragePrefix = "profile_pic:";
  private db: IDBPDatabase | null = null;

  // TTLs in milliseconds
  private readonly REDUX_TTL = 30 * 60 * 1000; // 30 minutes
  private readonly LOCALSTORAGE_TTL = 45 * 60 * 1000; // 45 minutes
  private readonly INDEXEDDB_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

  async init() {
    this.db = await openDB(this.dbName, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("images")) {
          const store = db.createObjectStore("images", { keyPath: "image_id" });
          store.createIndex("timestamp", "timestamp");
          store.createIndex("user_id", "user_id");
        }
      },
    });
  }

  /**
   * Layer 1: Check LocalStorage
   */
  getFromLocalStorage(userId: string): CachedImage | null {
    try {
      const key = `${this.localStoragePrefix}${userId}`;
      const cached = localStorage.getItem(key);

      if (!cached) return null;

      const entry: CacheEntry = JSON.parse(cached);

      // Check expiration
      if (Date.now() > entry.expiresAt) {
        localStorage.removeItem(key);
        return null;
      }

      console.debug(`LocalStorage HIT for user ${userId}`);
      return entry.data;
    } catch (error) {
      console.error("LocalStorage read error:", error);
      return null;
    }
  }

  /**
   * Store in LocalStorage
   */
  setInLocalStorage(userId: string, data: CachedImage): void {
    try {
      const key = `${this.localStoragePrefix}${userId}`;
      const entry: CacheEntry = {
        data,
        expiresAt: Date.now() + this.LOCALSTORAGE_TTL,
      };
      localStorage.setItem(key, JSON.stringify(entry));
      console.debug(`Cached in LocalStorage for user ${userId}`);
    } catch (error) {
      console.error("LocalStorage write error:", error);
    }
  }

  /**
   * Layer 2: Check IndexedDB (with blob storage)
   */
  async getFromIndexedDB(imageId: string): Promise<CachedImage | null> {
    if (!this.db) await this.init();

    try {
      const cached = await this.db!.get(this.storeName, imageId);

      if (!cached) return null;

      // Check expiration
      if (Date.now() - cached.timestamp > this.INDEXEDDB_TTL) {
        await this.db!.delete(this.storeName, imageId);
        return null;
      }

      console.debug(`IndexedDB HIT for image ${imageId}`);

      // Create blob URL from stored blob
      if (cached.blob) {
        const blobUrl = URL.createObjectURL(cached.blob);
        return {
          ...cached,
          url: blobUrl,
        };
      }

      return cached;
    } catch (error) {
      console.error("IndexedDB read error:", error);
      return null;
    }
  }

  /**
   * Store in IndexedDB with blob
   */
  async setInIndexedDB(imageId: string, data: CachedImage, blob?: Blob): Promise<void> {
    if (!this.db) await this.init();

    try {
      await this.db!.put(this.storeName, {
        image_id: imageId,
        ...data,
        blob: blob || null,
        timestamp: Date.now(),
      });
      console.debug(`Cached in IndexedDB for image ${imageId}`);

      // Cleanup old entries if storage is getting full
      await this.cleanupOldEntries();
    } catch (error) {
      console.error("IndexedDB write error:", error);
    }
  }

  /**
   * Download and cache image blob
   */
  async cacheImageBlob(imageId: string, url: string): Promise<Blob | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;

      const blob = await response.blob();

      // Store blob in IndexedDB
      const cachedData: CachedImage = {
        url,
        image_id: imageId,
        timestamp: Date.now(),
      };
      await this.setInIndexedDB(imageId, cachedData, blob);

      return blob;
    } catch (error) {
      console.error("Error caching image blob:", error);
      return null;
    }
  }

  /**
   * Smart get: Check all cache layers
   */
  async get(userId: string, imageId?: string): Promise<CachedImage | null> {
    // Layer 1: LocalStorage (fastest)
    const localCache = this.getFromLocalStorage(userId);
    if (localCache) return localCache;

    // Layer 2: IndexedDB (has actual image)
    if (imageId) {
      const idbCache = await this.getFromIndexedDB(imageId);
      if (idbCache) {
        // Also cache in LocalStorage for faster next access
        this.setInLocalStorage(userId, idbCache);
        return idbCache;
      }
    }

    return null;
  }

  /**
   * Smart set: Store in all appropriate layers
   */
  async set(userId: string, data: CachedImage, downloadBlob = true): Promise<void> {
    // Always cache in LocalStorage
    this.setInLocalStorage(userId, data);

    // Optionally download and cache blob in IndexedDB
    if (downloadBlob && data.image_id !== "default_pfp.png") {
      await this.cacheImageBlob(data.image_id, data.url);
    }
  }

  /**
   * Invalidate all caches for a user
   */
  async invalidate(userId: string, imageId?: string): Promise<void> {
    // Remove from LocalStorage
    const key = `${this.localStoragePrefix}${userId}`;
    localStorage.removeItem(key);

    // Remove from IndexedDB
    if (imageId && this.db) {
      await this.db.delete(this.storeName, imageId);
    }

    console.debug(`Invalidated caches for user ${userId}`);
  }

  /**
   * Cleanup old entries to prevent storage overflow
   */
  private async cleanupOldEntries(): Promise<void> {
    if (!this.db) return;

    try {
      // Get all entries sorted by timestamp
      const tx = this.db.transaction(this.storeName, "readonly");
      const index = tx.store.index("timestamp");
      const entries = await index.getAll();

      // If we have more than 100 entries, delete oldest
      if (entries.length > 100) {
        const toDelete = entries.slice(0, entries.length - 100);
        const deleteTx = this.db.transaction(this.storeName, "readwrite");

        for (const entry of toDelete) {
          await deleteTx.store.delete(entry.image_id);
        }

        console.debug(`Cleaned up ${toDelete.length} old cache entries`);
      }
    } catch (error) {
      console.error("Error cleaning up cache:", error);
    }
  }

  /**
   * Clear all caches
   */
  async clearAll(): Promise<void> {
    // Clear LocalStorage
    Object.keys(localStorage)
      .filter((key) => key.startsWith(this.localStoragePrefix))
      .forEach((key) => localStorage.removeItem(key));

    // Clear IndexedDB
    if (this.db) {
      await this.db.clear(this.storeName);
    }

    console.debug("Cleared all profile picture caches");
  }
}

// Export singleton instance
export const imageCacheManager = new ImageCacheManager();
```

**Redux Slice Enhancement**:

```typescript
// frontend/src/store/slices/profilePicturesSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { imageCacheManager } from "@/services/imageCacheManager";
import { getImageUrlByUserId } from "@/components/common/imageApi";

interface ProfilePictureData {
  url: string;
  image_id: string;
  timestamp: number;
  blobUrl?: string;
  isRefreshing?: boolean;
}

interface ProfilePicturesState {
  pictures: Record<string, ProfilePictureData>;
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;
}

const initialState: ProfilePicturesState = {
  pictures: {},
  loading: {},
  errors: {},
};

/**
 * Fetch profile picture with caching
 */
export const fetchProfilePicture = createAsyncThunk(
  "profilePictures/fetch",
  async (userId: string, { rejectWithValue }) => {
    try {
      // Check cache first
      const cached = await imageCacheManager.get(userId);
      if (cached) {
        // Check if URL is expiring soon (< 10 minutes)
        const timeUntilExpiry = cached.timestamp + 50 * 60 * 1000 - Date.now();

        if (timeUntilExpiry < 10 * 60 * 1000) {
          // Refresh in background
          console.debug(`URL expiring soon for ${userId}, refreshing...`);
          // Don't await, let it refresh in background
          refreshProfilePicture(userId);
        }

        return cached;
      }

      // Cache miss - fetch from API
      const response = await getImageUrlByUserId(userId);

      if (!response.success) {
        throw new Error("Failed to fetch profile picture");
      }

      const data: ProfilePictureData = {
        url: response.url,
        image_id: response.image_id,
        timestamp: Date.now(),
      };

      // Cache the result
      await imageCacheManager.set(userId, data, true);

      return data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Background refresh of expiring URLs
 */
export const refreshProfilePicture = createAsyncThunk(
  "profilePictures/refresh",
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await getImageUrlByUserId(userId);

      if (!response.success) {
        throw new Error("Failed to refresh profile picture");
      }

      const data: ProfilePictureData = {
        url: response.url,
        image_id: response.image_id,
        timestamp: Date.now(),
      };

      // Update cache
      await imageCacheManager.set(userId, data, false); // Don't re-download blob

      return data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

const profilePicturesSlice = createSlice({
  name: "profilePictures",
  initialState,
  reducers: {
    invalidateProfilePicture: (state, action: PayloadAction<string>) => {
      const userId = action.payload;
      delete state.pictures[userId];
      imageCacheManager.invalidate(userId);
    },

    clearAllProfilePictures: (state) => {
      state.pictures = {};
      state.loading = {};
      state.errors = {};
      imageCacheManager.clearAll();
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchProfilePicture.pending, (state, action) => {
        state.loading[action.meta.arg] = true;
        state.errors[action.meta.arg] = null;
      })
      .addCase(fetchProfilePicture.fulfilled, (state, action) => {
        state.loading[action.meta.arg] = false;
        state.pictures[action.meta.arg] = action.payload;
      })
      .addCase(fetchProfilePicture.rejected, (state, action) => {
        state.loading[action.meta.arg] = false;
        state.errors[action.meta.arg] = action.payload as string;
      })
      // Refresh
      .addCase(refreshProfilePicture.fulfilled, (state, action) => {
        const userId = action.meta.arg;
        state.pictures[userId] = {
          ...action.payload,
          isRefreshing: false,
        };
      });
  },
});

export const { invalidateProfilePicture, clearAllProfilePictures } = profilePicturesSlice.actions;
export default profilePicturesSlice.reducer;
```

**Updated ProfilePicture Component**:

```typescript
// frontend/src/components/common/ProfileComponents.tsx
export function ProfilePicture({
  size = "100px",
  emoji = "👤",
  imageId,
  userId,
  style,
}: ProfilePictureProps) {
  const dispatch = useDispatch<AppDispatch>();
  const cachedPicture = useSelector((state: RootState) =>
    userId ? state.profilePictures.pictures[userId] : null
  );
  const isLoading = useSelector((state: RootState) =>
    userId ? state.profilePictures.loading[userId] : false
  );

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<boolean>(false);

  useEffect(() => {
    // Priority 1: Use cached picture from Redux
    if (cachedPicture && !cachedPicture.isRefreshing) {
      setImageUrl(cachedPicture.blobUrl || cachedPicture.url);
      setImageError(false);
      return;
    }

    // Priority 2: Fetch from cache or API
    if (userId && !isLoading) {
      dispatch(fetchProfilePicture(userId))
        .unwrap()
        .then((data) => {
          setImageUrl(data.blobUrl || data.url);
          setImageError(false);
        })
        .catch(() => {
          setImageError(true);
        });
    }
  }, [userId, cachedPicture, isLoading, dispatch]);

  // Rest of component remains the same...
}
```

**Expected Impact**:

- ✅ Instant loading for cached images (<5ms)
- ✅ Offline support for viewed profile pictures
- ✅ 95% reduction in API calls
- ✅ Automatic background refresh before expiration

---

### Phase 3: Service Worker & CDN Integration (Week 3)

**Goal**: Add offline support and CDN-like caching

#### Tasks

1. **Service Worker Implementation**

   - [ ] Create `frontend/public/sw.js`
   - [ ] Implement Cache API for images
   - [ ] Add background sync for expired URLs
   - [ ] Add offline fallback

2. **CDN Configuration**

   - [ ] Configure Cloudflare or AWS CloudFront
   - [ ] Set cache headers for 7-day caching
   - [ ] Add image optimization (WebP conversion)
   - [ ] Configure edge caching rules

3. **Preloading Strategy**
   - [ ] Preload friend profile pictures
   - [ ] Prefetch on hover
   - [ ] Background download during idle time

**Service Worker Code**:

```javascript
// frontend/public/sw.js
const CACHE_NAME = "profile-pictures-v1";
const IMAGE_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      );
    })
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only cache image requests
  if (url.pathname.startsWith("/images/") || request.destination === "image") {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        // Try cache first
        const cachedResponse = await cache.match(request);

        if (cachedResponse) {
          // Check if cached response is still fresh
          const cachedDate = new Date(cachedResponse.headers.get("date"));
          const age = Date.now() - cachedDate.getTime();

          if (age < IMAGE_CACHE_TTL) {
            console.log("[SW] Cache HIT:", request.url);

            // Refresh in background if approaching expiration
            if (age > IMAGE_CACHE_TTL * 0.8) {
              fetch(request).then((response) => {
                if (response && response.status === 200) {
                  cache.put(request, response.clone());
                }
              });
            }

            return cachedResponse;
          }
        }

        // Cache miss or expired - fetch from network
        console.log("[SW] Cache MISS:", request.url);
        try {
          const networkResponse = await fetch(request);

          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }

          return networkResponse;
        } catch (error) {
          // Network error - return cached response if available (stale-while-revalidate)
          if (cachedResponse) {
            return cachedResponse;
          }

          // Return offline fallback
          return new Response("Offline", { status: 503 });
        }
      })
    );
  }
});

// Background sync for expired URLs
self.addEventListener("sync", (event) => {
  if (event.tag === "refresh-profile-pictures") {
    event.waitUntil(refreshExpiredImages());
  }
});

async function refreshExpiredImages() {
  const cache = await caches.open(CACHE_NAME);
  const requests = await cache.keys();

  for (const request of requests) {
    const cachedResponse = await cache.match(request);
    if (!cachedResponse) continue;

    const cachedDate = new Date(cachedResponse.headers.get("date"));
    const age = Date.now() - cachedDate.getTime();

    // Refresh if older than 6 days
    if (age > 6 * 24 * 60 * 60 * 1000) {
      try {
        const response = await fetch(request);
        if (response && response.status === 200) {
          await cache.put(request, response);
          console.log("[SW] Refreshed:", request.url);
        }
      } catch (error) {
        console.error("[SW] Failed to refresh:", request.url, error);
      }
    }
  }
}
```

**Expected Impact**:

- ✅ Offline support for all viewed images
- ✅ 50-70% reduction in bandwidth usage
- ✅ Faster load times with edge caching

---

### Phase 4: Optimization & Monitoring (Week 4)

**Goal**: Fine-tune performance and add monitoring

#### Tasks

1. **Performance Monitoring**

   - [ ] Add performance metrics tracking
   - [ ] Monitor cache hit rates
   - [ ] Track image load times
   - [ ] Set up alerts for degradation

2. **Optimization**

   - [ ] Implement image preloading hints
   - [ ] Add priority loading for visible images
   - [ ] Optimize cache eviction policies
   - [ ] Reduce cache storage overhead

3. **Error Handling**
   - [ ] Add retry logic with exponential backoff
   - [ ] Implement circuit breaker pattern
   - [ ] Add fallback images for all error states
   - [ ] Log cache errors to monitoring service

**Monitoring Code**:

```typescript
// frontend/src/services/imagePerformanceMonitor.ts
interface PerformanceMetric {
  userId: string;
  cacheLayer: "redux" | "localStorage" | "indexedDB" | "serviceWorker" | "network";
  loadTime: number;
  timestamp: number;
  success: boolean;
}

class ImagePerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly MAX_METRICS = 1000;

  recordLoad(
    userId: string,
    cacheLayer: PerformanceMetric["cacheLayer"],
    loadTime: number,
    success: boolean
  ) {
    this.metrics.push({
      userId,
      cacheLayer,
      loadTime,
      timestamp: Date.now(),
      success,
    });

    // Keep only recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    // Send to analytics
    this.sendToAnalytics({
      event: "profile_picture_load",
      properties: {
        cache_layer: cacheLayer,
        load_time: loadTime,
        success,
      },
    });
  }

  getCacheHitRate(layer: PerformanceMetric["cacheLayer"]): number {
    const layerMetrics = this.metrics.filter((m) => m.cacheLayer === layer);
    if (layerMetrics.length === 0) return 0;

    const hits = layerMetrics.filter((m) => m.success).length;
    return (hits / layerMetrics.length) * 100;
  }

  getAverageLoadTime(layer: PerformanceMetric["cacheLayer"]): number {
    const layerMetrics = this.metrics.filter((m) => m.cacheLayer === layer && m.success);

    if (layerMetrics.length === 0) return 0;

    const total = layerMetrics.reduce((sum, m) => sum + m.loadTime, 0);
    return total / layerMetrics.length;
  }

  getStats() {
    return {
      redux: {
        hitRate: this.getCacheHitRate("redux"),
        avgLoadTime: this.getAverageLoadTime("redux"),
      },
      localStorage: {
        hitRate: this.getCacheHitRate("localStorage"),
        avgLoadTime: this.getAverageLoadTime("localStorage"),
      },
      indexedDB: {
        hitRate: this.getCacheHitRate("indexedDB"),
        avgLoadTime: this.getAverageLoadTime("indexedDB"),
      },
      serviceWorker: {
        hitRate: this.getCacheHitRate("serviceWorker"),
        avgLoadTime: this.getAverageLoadTime("serviceWorker"),
      },
      network: {
        hitRate: this.getCacheHitRate("network"),
        avgLoadTime: this.getAverageLoadTime("network"),
      },
    };
  }

  private sendToAnalytics(data: any) {
    // Send to your analytics service (Google Analytics, Mixpanel, etc.)
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", data.event, data.properties);
    }
  }
}

export const imagePerformanceMonitor = new ImagePerformanceMonitor();
```

**Expected Impact**:

- ✅ Real-time performance insights
- ✅ Proactive issue detection
- ✅ Data-driven optimization decisions

---

## Technical Specifications

### Cache Storage Limits

| Layer          | Max Size                   | Eviction Policy | Priority |
| -------------- | -------------------------- | --------------- | -------- |
| Redux          | ~10MB (in-memory)          | LRU             | Highest  |
| LocalStorage   | ~5MB                       | TTL expiration  | High     |
| IndexedDB      | ~50MB (configurable)       | LRU + TTL       | Medium   |
| Service Worker | ~100MB (browser-dependent) | Custom          | Low      |

### Cache Key Design

**Structure**: `profile_pic:<layer>:<id>:<version>`

**Versions**:

- `v1`: Initial implementation
- Increment on breaking changes to cache format

### API Endpoint Enhancements

**New Headers**:

```
Cache-Control: public, max-age=2700, s-maxage=2700
ETag: "abc123-v1"
Last-Modified: Mon, 14 Oct 2025 10:00:00 GMT
Vary: Accept-Encoding
Access-Control-Allow-Origin: *
Access-Control-Max-Age: 86400
```

### Image Optimization

**Formats**:

- Primary: WebP (smaller size, good quality)
- Fallback: JPEG (universal support)
- Original: PNG (lossless, transparency)

**Sizes**:

- Storage: 128x128px
- Display: Responsive (CSS scaling)
- Thumbnail: 64x64px (future enhancement)

---

## Testing Strategy

### Unit Tests

1. **Cache Manager**

   - [ ] Test LocalStorage read/write
   - [ ] Test IndexedDB read/write
   - [ ] Test cache expiration logic
   - [ ] Test LRU eviction
   - [ ] Test error handling

2. **Redux Slice**

   - [ ] Test fetch thunk
   - [ ] Test refresh thunk
   - [ ] Test invalidation action
   - [ ] Test cache hit scenarios

3. **Service Worker**
   - [ ] Test cache matching
   - [ ] Test background sync
   - [ ] Test offline fallback

### Integration Tests

1. **Cache Hierarchy**

   - [ ] Test fallback from Redux → LocalStorage → IndexedDB → Network
   - [ ] Test cache population across layers
   - [ ] Test invalidation propagation

2. **Component Integration**
   - [ ] Test ProfilePicture with cache
   - [ ] Test UserProfileModal with cache
   - [ ] Test EditProfileModal cache invalidation

### Performance Tests

1. **Load Time Benchmarks**

   - [ ] Measure cold start (no cache)
   - [ ] Measure warm start (all caches populated)
   - [ ] Measure different cache hit scenarios

2. **Stress Testing**
   - [ ] Test with 100+ profile pictures
   - [ ] Test rapid profile picture changes
   - [ ] Test concurrent cache access

### E2E Tests

1. **User Flows**
   - [ ] User opens profile modal (first time)
   - [ ] User opens profile modal (second time)
   - [ ] User uploads new profile picture
   - [ ] User goes offline and views cached images

---

## Rollout Plan

### Stage 1: Backend Only (Week 1)

**Deploy**:

- Redis presigned URL cache
- HTTP cache headers

**Validation**:

- Monitor MinIO API call reduction
- Check response time improvements

**Rollback Plan**:

- Feature flag to disable Redis cache
- Fallback to direct MinIO calls

### Stage 2: Frontend Cache (Week 2)

**Deploy**:

- LocalStorage + IndexedDB caching
- Enhanced Redux state

**Validation**:

- Monitor cache hit rates
- Check user-perceived performance
- Watch for storage quota errors

**Rollback Plan**:

- Feature flag to disable client cache
- Fall back to current API-only flow

### Stage 3: Service Worker (Week 3)

**Deploy**:

- Service worker with Cache API
- Offline support

**Validation**:

- Test offline functionality
- Monitor service worker errors
- Check browser compatibility

**Rollback Plan**:

- Unregister service worker
- Clear Cache API storage

### Stage 4: CDN (Week 4)

**Deploy**:

- CloudFlare or AWS CloudFront
- Edge caching rules

**Validation**:

- Monitor CDN hit rates
- Check global latency improvements

**Rollback Plan**:

- Disable CDN caching
- Direct to origin requests

---

## Success Metrics

### Performance KPIs

| Metric                              | Current   | Target | Measurement                 |
| ----------------------------------- | --------- | ------ | --------------------------- |
| Average load time                   | 200-500ms | <50ms  | P95 latency                 |
| Cache hit rate                      | 0%        | >90%   | Cache hits / total requests |
| API calls per user session          | ~10       | <2     | Analytics tracking          |
| Bandwidth usage                     | 100%      | <30%   | Network monitoring          |
| Time to first paint (profile modal) | ~300ms    | <100ms | Performance API             |

### User Experience KPIs

| Metric                | Current | Target  | Measurement        |
| --------------------- | ------- | ------- | ------------------ |
| Offline support       | No      | Yes     | Feature flag       |
| Images load instantly | No      | Yes     | User surveys       |
| Modal open speed      | Slow    | Instant | Performance timing |

---

## Risk Assessment

### Technical Risks

1. **Storage Quota Exceeded**

   - **Risk**: Browser storage limits (50MB)
   - **Mitigation**: LRU eviction, configurable limits
   - **Severity**: Medium

2. **Cache Invalidation Bugs**

   - **Risk**: Stale images shown after update
   - **Mitigation**: Event-driven invalidation, version bumping
   - **Severity**: High

3. **Browser Compatibility**
   - **Risk**: IndexedDB/Service Worker not supported in old browsers
   - **Mitigation**: Feature detection, graceful degradation
   - **Severity**: Low

### Operational Risks

1. **Redis Memory Usage**

   - **Risk**: Excessive memory consumption
   - **Mitigation**: TTL management, memory limits
   - **Severity**: Medium

2. **CDN Costs**
   - **Risk**: Unexpected bandwidth charges
   - **Mitigation**: Budget alerts, traffic monitoring
   - **Severity**: Low

---

## Next Steps

### Immediate Actions

1. **Week 1**: Implement backend Redis cache
2. **Week 2**: Implement frontend LocalStorage + IndexedDB cache
3. **Week 3**: Add Service Worker support
4. **Week 4**: Optimize and monitor

### Long-Term Enhancements

1. **WebP Image Support**: Reduce image sizes by 30-50%
2. **Progressive Web App**: Full offline support
3. **Image CDN**: CloudFlare Image Resizing
4. **Smart Preloading**: ML-based prediction of which images to preload
5. **WebSocket Events**: Real-time cache invalidation across tabs

---

## Conclusion

This implementation plan provides a comprehensive strategy to recreate and optimize the profile picture loading system with multi-layer caching. The phased approach allows for incremental improvements while minimizing risk.

**Expected Overall Impact**:

- ⚡ **100x faster** load times for cached images
- 📉 **95% reduction** in API calls
- 💾 **70% reduction** in bandwidth usage
- 🌐 **Full offline support** for viewed images
- 🎯 **Instant loading** when user profile modal opens

**Total Implementation Time**: 4 weeks  
**Required Resources**: 1 backend developer, 1 frontend developer  
**Risk Level**: Low-Medium  
**Business Impact**: High (significantly improved user experience)
