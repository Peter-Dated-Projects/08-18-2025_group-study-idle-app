import { useState, useCallback, useRef, useEffect } from "react";
import {
  TaskCreate,
  TaskUpdate,
  TaskDelete,
  SyncRequest,
  SyncResponse,
  StudySession,
} from "../types";

interface UseTaskSyncProps {
  selectedSession: StudySession | null;
  onRedirectToLogin: () => void;
  addNotification: (type: string, message: string) => void;
}

export function useTaskSync({
  selectedSession,
  onRedirectToLogin,
  addNotification,
}: UseTaskSyncProps) {
  const [pendingCreates, setPendingCreates] = useState<TaskCreate[]>([]);
  const [pendingUpdates, setPendingUpdates] = useState<TaskUpdate[]>([]);
  const [pendingDeletes, setPendingDeletes] = useState<TaskDelete[]>([]);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);
  const syncFunctionRef = useRef<(() => Promise<void>) | null>(null);

  const syncTasksToServer = useCallback(
    async (editingTaskId?: string, editingText?: string) => {
      if (!selectedSession) return;

      try {
        // If a task is being edited, save the current edit before syncing
        if (editingTaskId && editingText?.trim()) {
          const trimmedTitle = editingText.trim();

          // Update the pending create with new title if it's a temp task
          if (editingTaskId.startsWith("temp-")) {
            setPendingCreates((prev: TaskCreate[]) =>
              prev.map((c) =>
                c.clientTempId === editingTaskId ? { ...c, title: trimmedTitle } : c
              )
            );
          } else {
            // Update existing task - inline the upsertPendingUpdate logic
            setPendingUpdates((prev: TaskUpdate[]) => {
              const existing = prev.find((u) => u.id === editingTaskId);
              if (existing) {
                // Merge with existing update
                return prev.map((u) =>
                  u.id === editingTaskId ? { ...u, title: trimmedTitle } : u
                );
              } else {
                // Add new update
                return [...prev, { id: editingTaskId, title: trimmedTitle, attemptCount: 0 }];
              }
            });
          }
        }

        // Filter out temporary task IDs from deletes - they never existed on the server
        const realDeletes = pendingDeletes
          .filter((deleteItem) => !deleteItem.id.startsWith("temp-"))
          .filter((deleteItem) => deleteItem.id && deleteItem.id.trim() !== "") // Filter out undefined/null/empty
          .map((deleteItem) => deleteItem.id);

        // Debug logging to identify any problematic IDs
        if (realDeletes.some((id) => id === undefined || id === null || id === "")) {
          console.error("Found undefined/null/empty IDs in deletes:", realDeletes);
          console.error("Original pending deletes:", pendingDeletes);
        }

        // Additional safety: log what we're about to send

        const syncRequest: SyncRequest = {
          sessionPageId: selectedSession.id,
          creates: [...pendingCreates],
          updates: [...pendingUpdates],
          deletes: realDeletes.filter((id) => id && id !== ""), // Extra safety filter
        };

        // Send delta sync to the new endpoint
        const response = await fetch(`/api/notion/storage/pages/${selectedSession.id}/sync-delta`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(syncRequest),
        });

        if (!response.ok) {
          const errorData = await response.json();
          if (errorData.needsReauth) {
            onRedirectToLogin();
            return;
          }
          throw new Error(errorData.error || "Failed to sync tasks to server");
        }

        const responseData: SyncResponse = await response.json();

        // Clear successfully processed operations from delta queues
        if (responseData.created && responseData.created.length > 0) {
          setPendingCreates((prev: TaskCreate[]) =>
            prev.filter(
              (c) =>
                !responseData.created.some((created) => created.clientTempId === c.clientTempId)
            )
          );
        }

        if (responseData.updated && responseData.updated.length > 0) {
          setPendingUpdates((prev: TaskUpdate[]) =>
            prev.filter((u) => !responseData.updated.includes(u.id))
          );
        }

        if (responseData.deleted && responseData.deleted.length > 0) {
          setPendingDeletes((prev: TaskDelete[]) =>
            prev.filter((d) => !responseData.deleted.some((deleted) => deleted.id === d.id))
          );
        }

        // Also clean up any temporary IDs that may have gotten into pending deletes
        setPendingDeletes((prev: TaskDelete[]) => prev.filter((d) => !d.id.startsWith("temp-")));

        return responseData;
      } catch (error) {
        console.error("Error syncing tasks:", error);
        throw error;
      }
    },
    [selectedSession, pendingCreates, pendingUpdates, pendingDeletes, onRedirectToLogin]
  );

  // Create the sync function
  const createSyncFunction = useCallback(() => {
    return async () => {
      if (!selectedSession || isSyncing) {

        return;
      }
      if (
        pendingCreates.length === 0 &&
        pendingUpdates.length === 0 &&
        pendingDeletes.length === 0
      ) {

        return;
      }

      setIsSyncing(true);
      try {
        await syncTasksToServer();
        setHasPendingChanges(false);

      } catch (error) {
        console.error("Sync failed:", error);
        addNotification("error", "Failed to sync changes to server");
        // Reschedule sync on failure
        if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
        syncTimerRef.current = setTimeout(() => {
          syncFunctionRef.current?.();
        }, 4000); // Retry with backoff
      } finally {
        setIsSyncing(false);
      }
    };
  }, [
    selectedSession,
    isSyncing,
    pendingCreates,
    pendingUpdates,
    pendingDeletes,
    addNotification,
    syncTasksToServer,
  ]);

  // Update the ref whenever the function changes
  useEffect(() => {
    syncFunctionRef.current = createSyncFunction();
  }, [createSyncFunction]);

  const scheduleSync = useCallback(() => {

    if (syncTimerRef.current) {

      clearTimeout(syncTimerRef.current);
    }
    syncTimerRef.current = setTimeout(() => {

      syncFunctionRef.current?.();
    }, 2000);
  }, []);

  const markAsChanged = useCallback(() => {

    setHasPendingChanges(true);
    scheduleSync();
  }, [scheduleSync]);

  // Helper to check if there are pending changes
  useEffect(() => {
    const hasChanges =
      pendingCreates.length > 0 || pendingUpdates.length > 0 || pendingDeletes.length > 0;
    setHasPendingChanges(hasChanges);
  }, [pendingCreates.length, pendingUpdates.length, pendingDeletes.length]);

  // Cleanup sync timer on unmount
  useEffect(() => {
    return () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
    };
  }, []);

  // Delta queue helpers
  const enqueuePendingCreate = useCallback((task: TaskCreate) => {
    setPendingCreates((prev: TaskCreate[]) => [...prev, task]);
  }, []);

  const upsertPendingUpdate = useCallback(
    (taskId: string, update: Partial<Omit<TaskUpdate, "id">>) => {
      setPendingUpdates((prev: TaskUpdate[]) => {
        const existing = prev.find((u) => u.id === taskId);
        if (existing) {
          // Merge with existing update
          return prev.map((u) => (u.id === taskId ? { ...u, ...update } : u));
        } else {
          // Add new update
          return [...prev, { id: taskId, attemptCount: 0, ...update }];
        }
      });
    },
    []
  );

  const enqueuePendingDelete = useCallback((taskId: string) => {
    // Prevent undefined, null, or empty IDs from being queued
    if (!taskId || taskId.trim() === "") {
      console.warn("Attempted to queue invalid task ID for deletion:", taskId);
      return;
    }

    // Prevent temporary IDs from being queued for deletion (they don't exist on server)
    if (taskId.startsWith("temp-")) {
      console.warn("Attempted to queue temporary task for deletion:", taskId);
      return;
    }

    setPendingDeletes((prev: TaskDelete[]) => [...prev, { id: taskId, attemptCount: 0 }]);

    // Remove any pending updates for this task to avoid wasted work
    setPendingUpdates((prev: TaskUpdate[]) => prev.filter((u: TaskUpdate) => u.id !== taskId));
  }, []);

  const removeFromDeltas = useCallback((taskId: string) => {
    // Remove from all delta queues (for temp task cleanup)
    setPendingCreates((prev: TaskCreate[]) =>
      prev.filter((c: TaskCreate) => c.clientTempId !== taskId)
    );
    setPendingUpdates((prev: TaskUpdate[]) => prev.filter((u: TaskUpdate) => u.id !== taskId));
    setPendingDeletes((prev: TaskDelete[]) => prev.filter((d: TaskDelete) => d.id !== taskId));
  }, []);

  return {
    pendingCreates,
    pendingUpdates,
    pendingDeletes,
    hasPendingChanges,
    isSyncing,
    syncTasksToServer,
    markAsChanged,
    enqueuePendingCreate,
    upsertPendingUpdate,
    enqueuePendingDelete,
    removeFromDeltas,
    setPendingCreates,
  };
}
