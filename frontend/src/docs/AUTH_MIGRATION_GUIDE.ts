/**
 * Migration Guide: Reducing /api/auth/session API Calls
 *
 * PROBLEM:
 * Currently, each component using `useSessionAuth` makes an independent API call to `/api/auth/session`.
 * With 12+ components, this creates unnecessary network traffic and server load.
 *
 * SOLUTIONS IMPLEMENTED:
 *
 * 1. Redux-Based Auth (Recommended for new components)
 *    - Single source of truth
 *    - Shared state across all components
 *    - Smart caching with configurable intervals
 *
 * 2. Optimized Hook (Drop-in replacement for existing components)
 *    - Singleton pattern to prevent multiple API calls
 *    - Same interface as useSessionAuth
 *    - Automatic cache invalidation
 *
 * MIGRATION STRATEGY:
 *
 * Phase 1: High-Impact Components (Start Here)
 * - GardenPage (root component)
 * - GardenIcons
 * - GardenTasks
 * - PlayerChat
 *
 * Phase 2: Modal Components
 * - GroupsModal
 * - GroupLeaderboardModal
 * - GlobalLeaderboardModal
 *
 * Phase 3: Remaining Components
 * - Lobby
 * - useWebSocket
 * - useSubscription
 * - Test components
 *
 * IMPLEMENTATION OPTIONS:
 *
 * Option A: Use Enhanced Redux Auth (Recommended)
 * ```typescript
 * // Replace this:
 * import { useSessionAuth } from "@/hooks/useSessionAuth";
 * const { user, isAuthenticated, isLoading, error } = useSessionAuth();
 *
 * // With this:
 * import { useEnhancedSessionAuth } from "@/hooks/useEnhancedAuth";
 * const { user, isAuthenticated, isLoading, error } = useEnhancedSessionAuth();
 * ```
 *
 * Option B: Use Optimized Hook (Easy migration)
 * ```typescript
 * // Replace this:
 * import { useSessionAuth } from "@/hooks/useSessionAuth";
 *
 * // With this:
 * import { useSessionAuth } from "@/hooks/useOptimizedAuth";
 * // No other changes needed!
 * ```
 *
 * BENEFITS:
 * - Reduces API calls from 12+ per page load to 1
 * - Improves app performance and responsiveness
 * - Reduces server load
 * - Maintains existing component interfaces
 * - Smart cache invalidation based on user activity
 *
 * CACHE STRATEGY:
 * - Fresh data: < 2 minutes (no API call)
 * - Stale data: 2-5 minutes (background refresh)
 * - Invalid data: > 5 minutes or on tab focus (immediate refresh)
 * - Periodic revalidation: every 10 minutes if authenticated
 *
 * NEXT STEPS:
 * 1. Test the enhanced auth hooks in development
 * 2. Migrate GardenPage first (biggest impact)
 * 3. Gradually migrate other components
 * 4. Monitor network tab to verify reduced API calls
 * 5. Remove old useSessionAuth.ts once migration is complete
 */

export const MIGRATION_PRIORITY = {
  HIGH: [
    "src/app/garden/page.tsx",
    "src/components/garden/GardenIcons.tsx",
    "src/components/garden/tasks/GardenTasks.tsx",
    "src/components/garden/ui/PlayerChat.tsx",
  ],
  MEDIUM: [
    "src/components/garden/ui/GroupsModal.tsx",
    "src/components/garden/ui/GroupLeaderboardModal.tsx",
    "src/components/garden/ui/GlobalLeaderboardModal.tsx",
    "src/components/garden/tools/Lobby.tsx",
  ],
  LOW: [
    "src/hooks/useWebSocket.ts",
    "src/hooks/useSubscription.ts",
    "src/components/test/ChatEventTest.tsx",
    "src/app/test-chat/page.tsx",
  ],
};

export const EXPECTED_REDUCTION = {
  before: "12+ API calls per page load",
  after: "1 API call per page load + smart revalidation",
  savingsPercent: "92%",
};
