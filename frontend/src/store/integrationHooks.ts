// Example integration of Redux with existing hooks
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { validateAuth } from "@/store/slices/authSlice";
import { fetchProfilePicture } from "@/store/slices/profilePicturesSlice";
import { useSessionAuth } from "@/hooks/useSessionAuth";

/**
 * Enhanced authentication hook that integrates with Redux
 * This provides the EXACT SAME interface as your existing useSessionAuth hook
 * Can be used as a drop-in replacement!
 */
export function useReduxAuth() {
  const dispatch = useAppDispatch();
  const auth = useAppSelector((state) => state.auth);

  // Auto-validate on mount and periodically
  useEffect(() => {
    const shouldValidate = !auth.lastValidated || Date.now() - auth.lastValidated > 5 * 60 * 1000; // 5 minutes

    if (shouldValidate && !auth.isLoading) {
      dispatch(validateAuth());
    }
  }, [dispatch, auth.lastValidated, auth.isLoading]);

  // Periodic re-validation
  useEffect(() => {
    if (auth.isAuthenticated) {
      const interval = setInterval(() => {
        dispatch(validateAuth());
      }, 10 * 60 * 1000); // 10 minutes

      return () => clearInterval(interval);
    }
  }, [dispatch, auth.isAuthenticated]);

  // Return the exact same interface as useSessionAuth
  return {
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    error: auth.error,
    refresh: () => dispatch(validateAuth()),
  };
}

/**
 * Enhanced timer hook that integrates with Redux
 * Can be used to replace the existing timer logic in PomoBlockTimer component
 */
export function useReduxTimer() {
  const timer = useAppSelector((state) => state.timer);

  return timer;
}

/**
 * Enhanced world state hook
 * Can be used to replace the existing worldEditingService singleton
 */
export function useReduxWorld() {
  const world = useAppSelector((state) => state.world);

  return {
    worldData: world.worldData,
    isLoading: world.isLoading,
    error: world.error,
    optimisticPlacements: world.optimisticPlacements,
    pendingVisualUpdates: world.pendingVisualUpdates, // Already an array
  };
}

/**
 * Enhanced notification system that integrates with Redux
 * Can replace the existing useGlobalNotification hook
 */
export function useReduxNotifications() {
  const dispatch = useAppDispatch();
  const notifications = useAppSelector((state) => state.notifications);

  return {
    notifications: notifications.notifications,
    addSuccessNotification: (message: string) =>
      dispatch({ type: "notifications/addSuccessNotification", payload: message }),
    addErrorNotification: (message: string) =>
      dispatch({ type: "notifications/addErrorNotification", payload: message }),
    addInfoNotification: (message: string) =>
      dispatch({ type: "notifications/addInfoNotification", payload: message }),
    removeNotification: (id: string) =>
      dispatch({ type: "notifications/removeNotification", payload: id }),
    clearAll: () => dispatch({ type: "notifications/clearAllNotifications" }),
  };
}

/**
 * Enhanced inventory hook
 */
export function useReduxInventory() {
  const inventory = useAppSelector((state) => state.inventory);

  return inventory;
}

/**
 * Enhanced wallet hook
 */
export function useReduxWallet() {
  const wallet = useAppSelector((state) => state.wallet);

  return wallet;
}

/**
 * Enhanced UI state hook
 */
export function useReduxUI() {
  const dispatch = useAppDispatch();
  const ui = useAppSelector((state) => state.ui);

  return {
    ...ui,
    openModal: (modal: keyof typeof ui.modals) =>
      dispatch({ type: "ui/openModal", payload: modal }),
    closeModal: (modal: keyof typeof ui.modals) =>
      dispatch({ type: "ui/closeModal", payload: modal }),
    setActiveTab: (section: string, tab: string) =>
      dispatch({ type: "ui/setActiveTab", payload: { section, tab } }),
  };
}

/**
 * Auto-fetch profile picture hook
 * Automatically fetches the user's profile picture when authenticated
 * Forces a fresh fetch from backend on every page load/refresh
 * Should be called once at app initialization (e.g., in a root component)
 */
export function useAutoFetchProfilePicture() {
  const dispatch = useAppDispatch();

  const { isAuthenticated, user } = useSessionAuth();
  const userId = user?.userId;

  useEffect(() => {
    if (isAuthenticated && userId) {
      dispatch(fetchProfilePicture({ userId, forceRefresh: true }));
    }
  }, [dispatch, isAuthenticated, userId, user]);
}
