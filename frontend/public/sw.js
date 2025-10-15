/**
 * Service Worker for Profile Picture Caching
 *
 * Provides:
 * - Offline-first caching for profile pictures
 * - Background sync for expired URLs
 * - Network-first for uploads, cache-first for reads
 * - Automatic cache cleanup
 */

const CACHE_VERSION = "v1";
const CACHE_NAME = `profile-pictures-${CACHE_VERSION}`;
const IMAGE_CACHE_NAME = `profile-images-${CACHE_VERSION}`;
const MAX_CACHE_SIZE = 200; // Maximum number of cached images
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// URLs to cache on install
const PRECACHE_URLS = ["/default_pfp.png"];

// Install event - precache essential resources
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[SW] Precaching default resources");
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log("[SW] Service worker installed, skipping waiting");
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...");

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              // Delete old versions of our caches
              return (
                (name.startsWith("profile-pictures-") || name.startsWith("profile-images-")) &&
                name !== CACHE_NAME &&
                name !== IMAGE_CACHE_NAME
              );
            })
            .map((name) => {
              console.log("[SW] Deleting old cache:", name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log("[SW] Service worker activated, claiming clients");
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only handle GET requests
  if (event.request.method !== "GET") {
    return;
  }

  // Handle profile picture requests
  if (url.pathname.includes("/images/")) {
    event.respondWith(handleImageRequest(event.request));
    return;
  }

  // For all other requests, use network-first strategy
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

/**
 * Handle image requests with cache-first strategy
 */
async function handleImageRequest(request) {
  const url = new URL(request.url);

  // For image uploads, always use network
  if (request.method === "POST" || request.method === "PUT" || request.method === "DELETE") {
    console.log("[SW] Image upload/delete, using network only");
    return fetch(request);
  }

  try {
    // 1. Check cache first (Cache-First Strategy)
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      // Check if cache is expired
      const cachedDate = new Date(cachedResponse.headers.get("sw-cached-date"));
      const now = new Date();

      if (cachedDate && now - cachedDate < CACHE_EXPIRY) {
        console.log("[SW] Cache hit (valid):", url.pathname);

        // Update cache in background (stale-while-revalidate)
        updateCacheInBackground(request);

        return cachedResponse;
      } else {
        console.log("[SW] Cache hit (expired):", url.pathname);
      }
    }

    // 2. Fetch from network
    console.log("[SW] Fetching from network:", url.pathname);
    const networkResponse = await fetch(request);

    // 3. Cache the response if successful
    if (networkResponse.ok) {
      await cacheImageResponse(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error("[SW] Network fetch failed:", error);

    // 4. Return cached response even if expired (offline fallback)
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log("[SW] Using expired cache (offline):", url.pathname);
      return cachedResponse;
    }

    // 5. Return default profile picture if available
    const defaultPicture = await caches.match("/default_pfp.png");
    if (defaultPicture) {
      console.log("[SW] Using default picture (offline)");
      return defaultPicture;
    }

    // 6. Complete failure
    return new Response("Network error and no cache available", {
      status: 503,
      statusText: "Service Unavailable",
    });
  }
}

/**
 * Cache an image response with metadata
 */
async function cacheImageResponse(request, response) {
  try {
    const cache = await caches.open(IMAGE_CACHE_NAME);

    // Add custom header with cache date
    const headers = new Headers(response.headers);
    headers.set("sw-cached-date", new Date().toISOString());

    const cachedResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: headers,
    });

    await cache.put(request, cachedResponse);
    console.log("[SW] Cached image:", new URL(request.url).pathname);

    // Clean up old entries if cache is too large
    await cleanupCache();
  } catch (error) {
    console.error("[SW] Error caching image:", error);
  }
}

/**
 * Update cache in background (stale-while-revalidate)
 */
function updateCacheInBackground(request) {
  fetch(request)
    .then((response) => {
      if (response.ok) {
        return cacheImageResponse(request, response);
      }
    })
    .catch((error) => {
      console.warn("[SW] Background update failed:", error);
    });
}

/**
 * Clean up old cache entries
 */
async function cleanupCache() {
  try {
    const cache = await caches.open(IMAGE_CACHE_NAME);
    const keys = await cache.keys();

    if (keys.length <= MAX_CACHE_SIZE) {
      return;
    }

    // Get all cached responses with dates
    const entries = await Promise.all(
      keys.map(async (request) => {
        const response = await cache.match(request);
        const cachedDate = response.headers.get("sw-cached-date");
        return {
          request,
          date: cachedDate ? new Date(cachedDate) : new Date(0),
        };
      })
    );

    // Sort by date (oldest first)
    entries.sort((a, b) => a.date - b.date);

    // Delete oldest entries
    const toDelete = entries.slice(0, keys.length - MAX_CACHE_SIZE);
    await Promise.all(toDelete.map((entry) => cache.delete(entry.request)));

    console.log(`[SW] Cleaned up ${toDelete.length} old cache entries`);
  } catch (error) {
    console.error("[SW] Error cleaning up cache:", error);
  }
}

/**
 * Background sync event - refresh expired cache entries
 */
self.addEventListener("sync", (event) => {
  if (event.tag === "refresh-profile-pictures") {
    console.log("[SW] Background sync: refreshing profile pictures");

    event.waitUntil(refreshExpiredCaches());
  }
});

/**
 * Refresh expired cache entries in background
 */
async function refreshExpiredCaches() {
  try {
    const cache = await caches.open(IMAGE_CACHE_NAME);
    const keys = await cache.keys();
    const now = new Date();

    for (const request of keys) {
      const response = await cache.match(request);
      const cachedDate = new Date(response.headers.get("sw-cached-date"));

      // Refresh if expired or close to expiring (within 1 day)
      const expiryBuffer = 24 * 60 * 60 * 1000; // 1 day
      if (now - cachedDate > CACHE_EXPIRY - expiryBuffer) {
        console.log("[SW] Refreshing expired cache:", request.url);

        try {
          const freshResponse = await fetch(request);
          if (freshResponse.ok) {
            await cacheImageResponse(request, freshResponse);
          }
        } catch (error) {
          console.warn("[SW] Failed to refresh:", request.url, error);
        }
      }
    }

    console.log("[SW] Background refresh complete");
  } catch (error) {
    console.error("[SW] Error refreshing caches:", error);
  }
}

/**
 * Message event - handle commands from clients
 */
self.addEventListener("message", (event) => {
  console.log("[SW] Received message:", event.data);

  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data.type === "CLEAR_CACHE") {
    event.waitUntil(
      Promise.all([caches.delete(CACHE_NAME), caches.delete(IMAGE_CACHE_NAME)]).then(() => {
        console.log("[SW] All caches cleared");
        event.ports[0].postMessage({ success: true });
      })
    );
  }

  if (event.data.type === "GET_CACHE_STATS") {
    event.waitUntil(
      getCacheStats().then((stats) => {
        event.ports[0].postMessage({ stats });
      })
    );
  }

  if (event.data.type === "INVALIDATE_IMAGE") {
    const { imageUrl } = event.data;
    event.waitUntil(
      caches
        .open(IMAGE_CACHE_NAME)
        .then((cache) => {
          return cache.delete(imageUrl);
        })
        .then(() => {
          console.log("[SW] Invalidated image cache:", imageUrl);
          event.ports[0].postMessage({ success: true });
        })
    );
  }
});

/**
 * Get cache statistics
 */
async function getCacheStats() {
  try {
    const imageCache = await caches.open(IMAGE_CACHE_NAME);
    const imageKeys = await imageCache.keys();

    let totalSize = 0;
    let validCount = 0;
    let expiredCount = 0;
    const now = new Date();

    for (const request of imageKeys) {
      const response = await imageCache.match(request);
      const blob = await response.blob();
      totalSize += blob.size;

      const cachedDate = new Date(response.headers.get("sw-cached-date"));
      if (now - cachedDate < CACHE_EXPIRY) {
        validCount++;
      } else {
        expiredCount++;
      }
    }

    return {
      totalEntries: imageKeys.length,
      validEntries: validCount,
      expiredEntries: expiredCount,
      totalSizeKB: Math.round(totalSize / 1024),
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
    };
  } catch (error) {
    console.error("[SW] Error getting cache stats:", error);
    return {
      totalEntries: 0,
      validEntries: 0,
      expiredEntries: 0,
      totalSizeKB: 0,
      totalSizeMB: "0.00",
    };
  }
}

console.log("[SW] Service worker script loaded");
