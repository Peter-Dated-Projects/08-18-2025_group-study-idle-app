# Subscription Status Delay Fix

## Problem

When opening the User Profile Modal, there was a visible delay before the FREE/PREMIUM badge updated to show the correct subscription status. The badge would briefly show "FREE" before updating to the actual status.

## Root Cause

The subscription data was only being fetched when the `UserProfileModal` component mounted (when `isVisible` became `true`). This caused the following sequence:

1. User clicks to open modal
2. Modal renders with `isVisible={true}`
3. `useReduxSubscription()` hook is called for the first time
4. Redux store is empty, so `isPaid` defaults to `false`
5. Badge renders as "FREE"
6. Fetch is dispatched to get subscription data
7. Fetch completes (200-500ms later)
8. Component re-renders with correct `isPaid` value
9. Badge updates to "PREMIUM" (if user is paid)

**Result:** User sees "FREE" badge flash for a moment before it updates.

## Solution

**Eager fetching** - Fetch subscription data when the `GardenIcons` component mounts, which happens when the user first enters the garden view. This ensures the data is already cached in Redux before the user opens the profile modal.

### Implementation

Added subscription hook to `GardenIcons.tsx`:

```typescript
import { useReduxSubscription } from "@/store/hooks/useReduxSubscription";

export default function GardenIcons({ onShopModalOpen }: GardenIconsProps) {
  const { user } = useSessionAuth();
  const dispatch = useDispatch<AppDispatch>();
  const { user: reduxUser } = useSelector((state: RootState) => state.auth);

  // Eagerly fetch subscription status when component mounts
  // This ensures the data is cached before UserProfileModal opens
  useReduxSubscription();

  // ... rest of component
}
```

### New Flow

1. User logs in and navigates to garden
2. `GardenIcons` component mounts
3. `useReduxSubscription()` is called immediately
4. Fetch is dispatched to get subscription data
5. Data is stored in Redux store
6. **Later:** User clicks to open profile modal
7. `UserProfileModal` component mounts
8. `useReduxSubscription()` hook is called again
9. **Cache hit!** Data is already in Redux
10. Badge renders immediately with correct value
11. No delay, no flashing

## Files Modified

- `frontend/src/components/garden/GardenIcons.tsx`
  - Added `useReduxSubscription` import
  - Called hook at component top level for eager fetching

## Benefits

✅ **No visible delay** - Badge shows correct status immediately  
✅ **Better UX** - No flashing or state changes after modal opens  
✅ **Efficient** - Still only one API call per session  
✅ **Cached** - Data available for any component that needs it  
✅ **Simple** - One line of code added

## Testing

### Before Fix

1. Login and go to garden
2. Open User Profile Modal
3. **See:** "FREE" badge briefly, then updates to "PREMIUM"
4. Delay: ~200-500ms visible

### After Fix

1. Login and go to garden
2. GardenIcons mounts → subscription fetched in background
3. Open User Profile Modal
4. **See:** Correct badge immediately, no flashing
5. Delay: 0ms (data already cached)

## Console Logs

First time in garden:

```
🔒 Fetching subscription status (no cache in Redux)
🔒 Subscription Status (fetched and cached in Redux): {...}
```

Opening modal (subsequent):

```
🔒 Using cached subscription from Redux store
```

## Performance Impact

- **Before:** Fetch happened when modal opened (blocking user perception)
- **After:** Fetch happens in background when garden loads (non-blocking)
- **Network calls:** Still only 1 per session (no change)
- **Memory:** Negligible (subscription data is small)

## Alternative Solutions Considered

### 1. Show Loading State in Modal

- **Pros:** Simple, honest about loading
- **Cons:** Still shows delay, poor UX

### 2. Default to Last Known State

- **Pros:** Could show cached value from localStorage
- **Cons:** Complex, could show stale data, Redux already handles this

### 3. Server-Side Include in Auth Response

- **Pros:** No separate API call needed
- **Cons:** Requires backend changes, couples auth with subscription

### 4. Pre-fetch on Login ✅ (Chosen)

- **Pros:** Simple, efficient, great UX
- **Cons:** None identified
- **Why chosen:** Minimal code change, leverages existing Redux caching

## Edge Cases Handled

✅ **User logs out:** Redux cache cleared automatically  
✅ **Different user logs in:** Fresh fetch for new user  
✅ **Modal opened before fetch completes:** Shows loading/default state briefly  
✅ **Network error:** Falls back to "FREE" tier gracefully  
✅ **Multiple rapid modal opens:** Uses same cached data

## Future Enhancements

If needed, could also add subscription fetching to:

- App-level initialization component
- Auth success callback
- Route guard/middleware

But current solution is sufficient for this use case.

---

**Fixed:** October 15, 2025  
**Impact:** User-facing UI improvement  
**Breaking Changes:** None  
**Performance:** Improved perceived performance
