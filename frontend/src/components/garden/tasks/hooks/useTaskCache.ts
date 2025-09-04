import { useState, useCallback } from "react";
import { Task } from "../types";

export function useTaskCache() {
  const [taskCache, setTaskCache] = useState<{ [sessionId: string]: Task[] }>({});
  const [taskCacheTimestamps, setTaskCacheTimestamps] = useState<{ [sessionId: string]: number }>(
    {}
  );
  const [taskCacheHashes, setTaskCacheHashes] = useState<{ [sessionId: string]: string }>({});

  const TASK_CACHE_EXPIRATION_TIME = 3 * 60 * 1000; // 3 minutes for tasks (shorter than sessions)

  // Generate a simple hash from task data for change detection
  const generateTasksHash = useCallback((tasks: Task[]): string => {
    const dataString = tasks
      .map((task) => `${task.id}-${task.title}-${task.completed}-${task.lastEditedTime}`)
      .sort()
      .join("|");

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }, []);

  const invalidateCache = useCallback((sessionId: string) => {
    setTaskCache((prev: Record<string, Task[]>) => {
      const updated = { ...prev };
      delete updated[sessionId];
      return updated;
    });
    setTaskCacheTimestamps((prev: Record<string, number>) => {
      const updated = { ...prev };
      delete updated[sessionId];
      return updated;
    });
    setTaskCacheHashes((prev: Record<string, string>) => {
      const updated = { ...prev };
      delete updated[sessionId];
      return updated;
    });
  }, []);

  const isCacheValid = useCallback(
    (sessionId: string, forceRefresh: boolean = false): boolean => {
      if (forceRefresh) return false;

      const cachedTasks = taskCache[sessionId];
      const cacheTimestamp = taskCacheTimestamps[sessionId] || 0;
      const now = Date.now();

      return (
        cachedTasks &&
        cachedTasks.length >= 0 && // Allow empty arrays to be cached
        now - cacheTimestamp < TASK_CACHE_EXPIRATION_TIME
      );
    },
    [taskCache, taskCacheTimestamps, TASK_CACHE_EXPIRATION_TIME]
  );

  const getCachedTasks = useCallback(
    (sessionId: string): Task[] | null => {
      return taskCache[sessionId] || null;
    },
    [taskCache]
  );

  const updateCache = useCallback(
    (sessionId: string, tasks: Task[]) => {
      const now = Date.now();
      const newHash = generateTasksHash(tasks);

      setTaskCache((prev: Record<string, Task[]>) => ({ ...prev, [sessionId]: [...tasks] }));
      setTaskCacheTimestamps((prev: Record<string, number>) => ({ ...prev, [sessionId]: now }));
      setTaskCacheHashes((prev: Record<string, string>) => ({ ...prev, [sessionId]: newHash }));
    },
    [generateTasksHash]
  );

  const hasDataChanged = useCallback(
    (sessionId: string, tasks: Task[]): boolean => {
      const newHash = generateTasksHash(tasks);
      const existingHash = taskCacheHashes[sessionId];
      return newHash !== existingHash;
    },
    [generateTasksHash, taskCacheHashes]
  );

  return {
    taskCache,
    taskCacheTimestamps,
    taskCacheHashes,
    generateTasksHash,
    invalidateCache,
    isCacheValid,
    getCachedTasks,
    updateCache,
    hasDataChanged,
  };
}
