# Read-Only Subscription Hook Implementation

## Change Summary

Created a **read-only** version of the subscription hook (`useReduxSubscriptionReadOnly`) that only reads cached data from Redux store without triggering any fetches or updates.

## Problem Solved

The User Profile Modal was causing subscription status updates/fetches every time it opened, which was unnecessary since:

1. The subscription data is already fetched by `GardenIcons` component
2. The modal should only display the cached status
3. No need to trigger additional API calls when modal opens

## Implementation

### New Hook: `useReduxSubscriptionReadOnly`

Created in `frontend/src/store/hooks/useReduxSubscription.ts`:

```typescript
/**
 * Read-only hook to access subscription status from Redux store
 * Does NOT trigger any fetches - only reads existing cached data
 * Use this when you want to display subscription status without causing updates
 *
 * Perfect for modals or components that should show cached data only
 */
export function useReduxSubscriptionReadOnly(): UseReduxSubscriptionReturn {
  const dispatch = useAppDispatch();

  // Get subscription data from Redux store (read-only)
  const { data, isLoading, error } = useAppSelector((state) => state.subscription);

  // Manual refetch and invalidate functions still available
  // But NO automatic fetching in useEffect

  return {
    isPaid: data?.is_paid ?? false,
    isLoading,
    error,
    refetch,
    invalidateCache: invalidateCacheFn,
    subscriptionData: data,
  };
}
```

### Key Differences

| Feature             | `useReduxSubscription`    | `useReduxSubscriptionReadOnly` |
| ------------------- | ------------------------- | ------------------------------ |
| Auto-fetch on mount | ✅ Yes (if no cache)      | ❌ No                          |
| Read cached data    | ✅ Yes                    | ✅ Yes                         |
| useEffect hook      | ✅ Yes (triggers fetches) | ❌ No                          |
| Manual refetch      | ✅ Yes                    | ✅ Yes                         |
| Cache invalidation  | ✅ Yes                    | ✅ Yes                         |
| Use case            | Initial data fetching     | Display cached data only       |

### Updated UserProfileModal

Now uses read-only hook:

```typescript
import { useReduxSubscriptionReadOnly } from "@/store/hooks/useReduxSubscription";

export default function UserProfile({ isVisible, onClose, user }: UserProfileProps) {
  // Use read-only subscription hook - does NOT trigger fetches
  // Only displays cached data from Redux store
  const { isPaid: hasSubscription, isLoading: subscriptionLoading } =
    useReduxSubscriptionReadOnly();

  // ... rest of component
}
```

## How It Works

### Data Flow

1. **App starts** → User logs in → Garden loads
2. **GardenIcons mounts** → Calls `useReduxSubscription()` → Fetches data → Stores in Redux
3. **User opens modal** → UserProfileModal mounts → Calls `useReduxSubscriptionReadOnly()`
4. **Read-only hook** → Reads from Redux store → **No fetch triggered**
5. **Modal displays** → Shows cached subscription status
6. **User closes modal** → Modal unmounts → **No cleanup needed**
7. **User reopens modal** → Same as step 3 → Still no fetch → Shows cached data

### Behavior Comparison

#### Before (with `useReduxSubscription`)

```
Modal Opens → Hook mounts → useEffect runs → Check cache
→ Cache exists → Log "Using cached subscription" → Return data
```

Even though no fetch happens, the useEffect still runs and logs.

#### After (with `useReduxSubscriptionReadOnly`)

```
Modal Opens → Hook mounts → Read Redux selector → Return data
```

No useEffect, no logs, purely reading state.

## Benefits

✅ **Cleaner behavior** - Modal doesn't trigger subscription logic  
✅ **Better separation of concerns** - Fetching happens in GardenIcons, displaying happens in modal  
✅ **Fewer console logs** - No "Using cached subscription" logs when modal opens  
✅ **More predictable** - Modal is purely presentational  
✅ **Performance** - Slightly faster (no useEffect overhead)  
✅ **Prevents bugs** - Can't accidentally trigger fetches from modal

## When to Use Each Hook

### Use `useReduxSubscription()` when:

- ✅ Component is responsible for fetching subscription data
- ✅ First component to need subscription in the render tree
- ✅ Want automatic fetching on mount
- ✅ Examples: GardenIcons, App initialization, Route guards

### Use `useReduxSubscriptionReadOnly()` when:

- ✅ Component only displays subscription status
- ✅ Data is already fetched elsewhere
- ✅ Don't want to trigger any fetches/updates
- ✅ Modal or popup that should show cached data
- ✅ Examples: UserProfileModal, subscription badges, status indicators

## Testing

### Expected Behavior

1. **Login and navigate to garden**

   - Console: `🔒 Fetching subscription status (no cache in Redux)`
   - GardenIcons fetches data

2. **Open User Profile Modal**

   - **No console logs from subscription hook**
   - Badge displays immediately with cached value
   - No fetch triggered

3. **Close and reopen modal**

   - **Still no console logs**
   - Still shows cached value
   - No fetch triggered

4. **Reload page and open modal**
   - No data in cache yet
   - Shows default (FREE) until GardenIcons fetches
   - Once fetched, modal can be opened/closed without triggering updates

## Code Changes

### Files Modified

1. **`frontend/src/store/hooks/useReduxSubscription.ts`**

   - Added `useReduxSubscriptionReadOnly()` function
   - Same interface as original hook
   - No useEffect, purely reads from store

2. **`frontend/src/components/garden/UserProfileModal.tsx`**
   - Changed from `useReduxSubscription` to `useReduxSubscriptionReadOnly`
   - Updated import
   - Updated comment to reflect read-only behavior

### Files NOT Changed

- `frontend/src/components/garden/GardenIcons.tsx` - Still uses `useReduxSubscription()` for fetching
- Other components continue to work as before

## API Compatibility

✅ **100% Compatible** - The read-only hook has the exact same interface:

```typescript
interface UseReduxSubscriptionReturn {
  isPaid: boolean;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  invalidateCache: () => Promise<void>;
  subscriptionData: any | null;
}
```

Both hooks return the same type, so they're interchangeable.

## Future Use Cases

This pattern can be extended to other read-only hooks:

```typescript
// Read-only hooks for other slices
export function useReduxInventoryReadOnly() { ... }
export function useReduxWalletReadOnly() { ... }
export function useReduxProfilePictureReadOnly() { ... }
```

Any time you want to display cached data without triggering fetches/updates.

## Edge Cases

### What if data is not cached when modal opens?

The hook returns default values:

- `isPaid`: `false` (default to free tier)
- `isLoading`: Whatever Redux store has (likely `false`)
- `error`: `null`

Modal will show "FREE" badge until GardenIcons fetches the data, then Redux will notify and modal will update via subscription.

### Can I still manually refetch from the modal?

Yes! The `refetch()` and `invalidateCache()` functions are still available:

```typescript
const { isPaid, refetch } = useReduxSubscriptionReadOnly();

// Later, if needed:
await refetch(); // Manually trigger fetch
```

### What if I want to force fetch from modal?

Use the original `useReduxSubscription()` hook, or call `refetch()` manually.

---

**Implemented:** October 15, 2025  
**Status:** ✅ Complete  
**Breaking Changes:** None  
**Performance Impact:** Positive (fewer useEffect calls)  
**User Impact:** Better UX (no status updates when modal opens)
