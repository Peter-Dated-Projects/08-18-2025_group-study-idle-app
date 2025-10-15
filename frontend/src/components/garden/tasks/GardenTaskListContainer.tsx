import { useState, useEffect, useCallback, useRef } from "react";
import { useGlobalNotification } from "@/components/NotificationProvider";
import { useTaskSync } from "./hooks/useTaskSync";
import { useTaskCache } from "./hooks/useTaskCache";
import LoadingState from "./LoadingState";
import TaskList from "./TaskList";
import EmptyState from "./EmptyState";

// Import types from the centralized types file
import { Task, TaskCreate, TaskUpdate, StudySession } from "./types";

interface GardenTaskListContainerProps {
  selectedSession?: StudySession | null;
  isAuthenticated: boolean;
  onRedirectToLogin: () => void;
  onDataLoaded: (data: { taskList: Task[] }) => void;
  onSessionRefresh: () => Promise<void>;
}

export default function GardenTaskListContainer({
  selectedSession,
  isAuthenticated,
  onRedirectToLogin,
  onDataLoaded,
}: GardenTaskListContainerProps) {
  const { addNotification } = useGlobalNotification();
  const [taskList, setTaskList] = useState<Task[]>([]);
  const [isStartup, setIsStartup] = useState(true);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>("");

  // Sorting state
  const [taskDetailsSortMode, setTaskDetailsSortMode] = useState<"custom" | "asc" | "desc">(
    "custom"
  );
  const [completionSortMode, setCompletionSortMode] = useState<
    "custom" | "completed" | "uncompleted"
  >("custom");
  const [originalTaskOrder, setOriginalTaskOrder] = useState<Task[]>([]);

  // Refs for auto-scroll functionality
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const editingTaskRef = useRef<HTMLTableRowElement>(null);

  // Ref to track the last loaded session to prevent unnecessary reloads
  const lastLoadedSessionRef = useRef<string | null>(null);

  // Use our custom hooks
  const taskCache = useTaskCache();
  const taskSync = useTaskSync({
    selectedSession: selectedSession || null,
    onRedirectToLogin,
    addNotification: (type: string, message: string) =>
      addNotification(type as "error" | "info", message),
  });

  // Notify parent when data changes
  useEffect(() => {
    onDataLoaded({
      taskList,
    });
  }, [taskList, onDataLoaded]);

  // Store original order when tasks are loaded
  useEffect(() => {
    if (taskList.length > 0 && originalTaskOrder.length === 0) {
      setOriginalTaskOrder([...taskList]);
    }
  }, [taskList, originalTaskOrder.length]);

  // Sorting functions
  const handleTaskDetailsSortClick = () => {
    const nextMode =
      taskDetailsSortMode === "custom" ? "desc" : taskDetailsSortMode === "desc" ? "asc" : "custom";
    setTaskDetailsSortMode(nextMode);
    setCompletionSortMode("custom"); // Reset other sorting

    if (nextMode === "custom") {
      // Before restoring to custom order, update originalTaskOrder with current task states
      // to preserve any changes that happened while sorting was active
      const updatedOriginalOrder = originalTaskOrder.map((originalTask: Task) => {
        const currentTask = taskList.find((t: Task) => t.id === originalTask.id);
        return currentTask || originalTask; // Use current state if found, otherwise keep original
      });
      setOriginalTaskOrder(updatedOriginalOrder);
      setTaskList([...updatedOriginalOrder]);
    } else {
      const sorted = [...taskList].sort((a, b) => {
        const titleA = a.title.toLowerCase();
        const titleB = b.title.toLowerCase();
        return nextMode === "asc" ? titleA.localeCompare(titleB) : titleB.localeCompare(titleA);
      });
      setTaskList(sorted);
    }
  };

  const handleCompletionSortClick = () => {
    const nextMode =
      completionSortMode === "custom"
        ? "completed"
        : completionSortMode === "completed"
        ? "uncompleted"
        : "custom";
    setCompletionSortMode(nextMode);
    setTaskDetailsSortMode("custom"); // Reset other sorting

    if (nextMode === "custom") {
      // Before restoring to custom order, update originalTaskOrder with current task states
      // to preserve any completion changes that happened while sorting was active
      const updatedOriginalOrder = originalTaskOrder.map((originalTask: Task) => {
        const currentTask = taskList.find((t: Task) => t.id === originalTask.id);
        return currentTask || originalTask; // Use current state if found, otherwise keep original
      });
      setOriginalTaskOrder(updatedOriginalOrder);
      setTaskList([...updatedOriginalOrder]);
    } else {
      const sorted = [...taskList].sort((a, b) => {
        const aCompleted = a.completed || false;
        const bCompleted = b.completed || false;

        if (nextMode === "completed") {
          // Completed tasks first: completed (true) should come before uncompleted (false)
          if (aCompleted && !bCompleted) return -1; // a (completed) before b (uncompleted)
          if (!aCompleted && bCompleted) return 1; // b (completed) before a (uncompleted)
          return 0; // both same completion state
        } else {
          // Uncompleted tasks first: uncompleted (false) should come before completed (true)
          if (!aCompleted && bCompleted) return -1; // a (uncompleted) before b (completed)
          if (aCompleted && !bCompleted) return 1; // b (uncompleted) before a (completed)
          return 0; // both same completion state
        }
      });
      setTaskList(sorted);
    }
  };

  // Load tasks when session changes
  useEffect(() => {
    // Reset the session tracking when session changes
    if (selectedSession?.id !== lastLoadedSessionRef.current) {
      lastLoadedSessionRef.current = null;
    }

    if (isAuthenticated && selectedSession) {
      loadTasksFromSession();
    } else {
      setTaskList([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, selectedSession]);

  // Create the sync function
  const createSyncFunction = useCallback(() => {
    return async () => {
      if (!selectedSession || taskSync.isSyncing) {

        return;
      }
      if (
        taskSync.pendingCreates.length === 0 &&
        taskSync.pendingUpdates.length === 0 &&
        taskSync.pendingDeletes.length === 0
      ) {

        return;
      }

      // Use the hook's sync method
      try {
        await taskSync.syncTasksToServer(editingTaskId || undefined, editingText);

      } catch (error) {
        console.error("Sync failed:", error);
        addNotification("error", "Failed to sync changes to server");
        // Reschedule sync on failure - let the hook handle this
        taskSync.markAsChanged();
      }
    };
  }, [selectedSession, taskSync, addNotification, editingTaskId, editingText]);

  // Update the ref whenever the function changes
  useEffect(() => {
    // Hook handles sync functionality internally
  }, [createSyncFunction]);

  const scheduleSync = useCallback(() => {
    // Use the hook's markAsChanged method
    taskSync.markAsChanged();
  }, [taskSync]);

  const markAsChanged = useCallback(() => {

    scheduleSync();
  }, [scheduleSync]);

  // Helper to check if there are pending changes - handled by hook
  useEffect(() => {
    // Hook handles this internally
  }, [
    taskSync.pendingCreates.length,
    taskSync.pendingUpdates.length,
    taskSync.pendingDeletes.length,
  ]);

  // Cleanup sync timer on unmount - handled by hook
  useEffect(() => {
    return () => {
      // Hook handles cleanup
    };
  }, []);

  // Delta queue helpers
  const enqueuePendingCreate = useCallback(
    (task: TaskCreate) => {
      taskSync.enqueuePendingCreate(task);
    },
    [taskSync]
  );

  const upsertPendingUpdate = useCallback(
    (taskId: string, update: Partial<Omit<TaskUpdate, "id">>) => {
      taskSync.upsertPendingUpdate(taskId, update);
    },
    [taskSync]
  );

  const enqueuePendingDelete = useCallback(
    (taskId: string) => {
      taskSync.enqueuePendingDelete(taskId);
    },
    [taskSync]
  );

  const removeFromDeltas = useCallback(
    (taskId: string) => {
      taskSync.removeFromDeltas(taskId);
    },
    [taskSync]
  );

  const loadTasksFromSession = useCallback(
    async (forceRefresh: boolean = false) => {
      if (!selectedSession) return;

      const sessionId = selectedSession.id;

      // Prevent loading the same session multiple times unless forced
      if (!forceRefresh && lastLoadedSessionRef.current === sessionId) {
        return;
      }

      const now = Date.now();

      try {
        // Check if we can use cached data
        const cachedTasks = taskCache.taskCache[sessionId];
        const cacheTimestamp = taskCache.taskCacheTimestamps[sessionId] || 0;
        const isCacheValid =
          !forceRefresh &&
          cachedTasks &&
          cachedTasks.length >= 0 && // Allow empty arrays to be cached
          now - cacheTimestamp < 300000; // 5 minutes cache

        if (isCacheValid) {
          // Only log if there are actually tasks to show, to avoid spam for empty sessions
          if (cachedTasks.length > 0) {

          }
          setTaskList([...cachedTasks]);
          setOriginalTaskOrder([...cachedTasks]);
          setTaskDetailsSortMode("custom");
          setCompletionSortMode("custom");
          setIsStartup(false);
          lastLoadedSessionRef.current = sessionId; // Mark as loaded
          return;
        }

        // Get blocks from the selected study session page
        const response = await fetch(`/api/notion/blocks/${selectedSession.id}?children=true`, {
          credentials: "include",
        });

        if (!response.ok) {
          const errorData = await response.json();
          if (errorData.needsReauth) {
            addNotification(
              "error",
              "Your Notion connection has expired. Please reconnect your account."
            );
            onRedirectToLogin();
            return;
          }
          throw new Error(errorData.error || "Failed to load tasks from session");
        }

        const data = await response.json();

        // Convert blocks to tasks - focusing on to_do blocks
        const tasks: Task[] = [];

        if (data.results && Array.isArray(data.results)) {
          data.results.forEach((block: unknown) => {
            const blockObj = block as {
              type: string;
              id: string;
              to_do?: {
                rich_text?: Array<{ plain_text: string }>;
                checked?: boolean;
              };
              created_time: string;
              last_edited_time: string;
            };

            if (blockObj.type === "to_do") {
              const text =
                blockObj.to_do?.rich_text?.map((t) => t.plain_text).join("") || "Untitled Task";
              tasks.push({
                id: blockObj.id,
                title: text,
                completed: blockObj.to_do?.checked || false,
                deleted: false,
                notionUrl: `https://notion.so/${blockObj.id.replace(/-/g, "")}`,
                createdTime: blockObj.created_time,
                lastEditedTime: blockObj.last_edited_time,
                archived: false,
                indent: 0, // Default to main task level
                syncInstance: {
                  isSyncing: false,
                  prevSyncCall: null,
                },
              });
            }
          });
        }

        // Generate hash for change detection
        const newHash = taskCache.generateTasksHash(tasks);
        const existingHash = taskCache.taskCacheHashes[sessionId];

        // Only update if data has changed or it's the first load
        if (newHash !== existingHash || !cachedTasks) {

          // Update cache using hook methods
          taskCache.updateCache(sessionId, tasks);

          // Update UI
          setTaskList(tasks);
          setOriginalTaskOrder([...tasks]);
          setTaskDetailsSortMode("custom");
          setCompletionSortMode("custom");
          lastLoadedSessionRef.current = sessionId; // Mark as loaded

        } else {

          setTaskList([...cachedTasks]);
          setOriginalTaskOrder([...cachedTasks]);
          setTaskDetailsSortMode("custom");
          setCompletionSortMode("custom");
          lastLoadedSessionRef.current = sessionId; // Mark as loaded
        }
      } catch (err) {
        console.error("Error loading tasks from session:", err);
        addNotification(
          "error",
          `Failed to load tasks: ${err instanceof Error ? err.message : "Unknown error"}`
        );

        // Fall back to cache if available
        const cachedTasks = taskCache.taskCache[sessionId];
        if (cachedTasks) {

          setTaskList([...cachedTasks]);
          setOriginalTaskOrder([...cachedTasks]);
          setTaskDetailsSortMode("custom");
          setCompletionSortMode("custom");
        }
      } finally {
        setIsStartup(false);
      }
    },
    [selectedSession, addNotification, onRedirectToLogin, taskCache]
  );

  const createNewTask = (insertAfterTaskId?: string) => {
    if (!selectedSession) return;

    // Generate temporary ID and create task immediately on client side
    const tempTaskId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newTaskTitle = "New Task";

    // Find insertion index
    let insertionIndex = taskList.length;
    if (insertAfterTaskId) {
      const afterIndex = taskList.findIndex((task: Task) => task.id === insertAfterTaskId);
      if (afterIndex !== -1) {
        insertionIndex = afterIndex + 1;
      }
    }

    // Create temporary task object
    const tempTask: Task = {
      id: tempTaskId,
      title: newTaskTitle,
      completed: false,
      deleted: false,
      notionUrl: "",
      createdTime: new Date().toISOString(),
      lastEditedTime: new Date().toISOString(),
      archived: false,
      indent: 0, // Default indent level
      syncInstance: {
        isSyncing: false,
        prevSyncCall: null,
      },
    };

    // Add to client state immediately
    setTaskList((prev: Task[]) => {
      const newList = [...prev];
      newList.splice(insertionIndex, 0, tempTask);
      return newList;
    });

    // Also add to originalTaskOrder to keep it synchronized
    setOriginalTaskOrder((prev: Task[]) => {
      const newList = [...prev];
      newList.splice(insertionIndex, 0, tempTask);
      return newList;
    });

    // Invalidate task cache for current session
    if (selectedSession) {
      taskCache.invalidateCache(selectedSession.id);
    }

    // Start editing immediately
    setEditingTaskId(tempTask.id);
    setEditingText(newTaskTitle);

    // Auto-scroll to the new task after a brief delay to let the DOM update
    setTimeout(() => {
      if (editingTaskRef.current && scrollContainerRef.current) {
        editingTaskRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
      }
    }, 100);
  };

  const startEditing = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingText(task.title);
  };

  const saveTaskEdit = (taskId: string, newTitle: string) => {
    if (!newTitle.trim()) return;

    const trimmedTitle = newTitle.trim();

    // Check if there was a change in title value
    if (
      taskList.find((t) => t.id === taskId)?.title === trimmedTitle &&
      !taskId.startsWith("temp-")
    ) {
      setEditingTaskId(null);
      setEditingText("");
      return; // No change, exit early
    }

    // Update task locally
    setTaskList((prev: Task[]) =>
      prev.map((t: Task) => (t.id === taskId ? { ...t, title: trimmedTitle } : t))
    );

    // Also update originalTaskOrder to keep it synchronized
    setOriginalTaskOrder((prev: Task[]) =>
      prev.map((t: Task) => (t.id === taskId ? { ...t, title: trimmedTitle } : t))
    );

    // Invalidate task cache for current session
    if (selectedSession) {
      taskCache.invalidateCache(selectedSession.id);
    }

    // Queue for sync (only if not a temp task - temp tasks are already in pendingCreates)
    if (!taskId.startsWith("temp-")) {
      upsertPendingUpdate(taskId, { title: trimmedTitle, attemptCount: 0 });
    } else {
      // Update the pending create with new title
      taskSync.setPendingCreates((prev: TaskCreate[]) =>
        prev.map((c) =>
          c.clientTempId === taskId ? { ...c, title: trimmedTitle, attemptCount: 0 } : c
        )
      );

      // Find previous task in the current list to determine 'after' position
      const currentIndex = taskList.findIndex((t) => t.id === taskId);
      let insertAfterTaskId: string | undefined;
      for (let i = currentIndex - 1; i >= 0; i--) {
        if (!taskList[i].id.startsWith("temp-")) {
          insertAfterTaskId = taskList[i].id;
          break;
        }
      }

      // Queue for creation
      enqueuePendingCreate({
        title: trimmedTitle,
        completed: false,
        clientTempId: taskId,
        after: insertAfterTaskId || null,
        attemptCount: 0,
      });
    }

    // Mark as changed for sync
    markAsChanged();
  };

  const handleTaskKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, task: Task) => {
    if (e.key === "Enter") {
      e.preventDefault();

      // Save current edit
      saveTaskEdit(task.id, editingText);
      setEditingTaskId(null);
    } else if (e.key === "Escape") {
      // Cancel editing
      saveTaskEdit(task.id, editingText);
      setEditingTaskId(null);
      setEditingText("");
    } else if (e.key === "Backspace" || e.key === "Delete") {
      // Check if the current string is empty. if yes, delete it
      if (editingText.trim() === "") {
        handleDeleteTask(task);
      }
    }
  };

  // Wrapper function to match TaskList component interface
  const handleTaskKeyDownWithIndex = (
    e: React.KeyboardEvent<HTMLInputElement>,
    task: Task,
    _index: number
  ) => {
    handleTaskKeyDown(e, task);
  };

  const cancelEditing = () => {
    setEditingTaskId(null);
    setEditingText("");
  };

  const toggleTaskCompletion = (task: Task) => {
    // Update local state immediately
    const newTaskStatus = !task.completed;
    setTaskList((prev: Task[]) =>
      prev.map((t: Task) => (t.id === task.id ? { ...t, completed: newTaskStatus } : t))
    );

    // Also update originalTaskOrder to keep it synchronized
    setOriginalTaskOrder((prev: Task[]) =>
      prev.map((t: Task) => (t.id === task.id ? { ...t, completed: newTaskStatus } : t))
    );

    // Invalidate task cache for current session
    if (selectedSession) {
      taskCache.invalidateCache(selectedSession.id);
    }

    // Queue for sync
    if (!task.id.startsWith("temp-")) {
      upsertPendingUpdate(task.id, { completed: newTaskStatus, attemptCount: 0 });
    } else {
      // Update the pending create
      taskSync.setPendingCreates((prev: TaskCreate[]) =>
        prev.map((c) =>
          c.clientTempId === task.id ? { ...c, completed: newTaskStatus, attemptCount: 0 } : c
        )
      );
    }

    // Mark as changed for sync
    markAsChanged();
  };

  // New delete task function
  const handleDeleteTask = (task: Task) => {
    if (task.id.startsWith("temp-")) {
      // Temp task - just remove locally and clean up deltas
      setTaskList((prev: Task[]) => prev.filter((t) => t.id !== task.id));
      removeFromDeltas(task.id);
    } else {
      // Real task - remove locally and queue for deletion
      setTaskList((prev: Task[]) => prev.filter((t) => t.id !== task.id));
      enqueuePendingDelete(task.id);
    }

    // Also remove from originalTaskOrder to keep it synchronized
    setOriginalTaskOrder((prev: Task[]) => prev.filter((t) => t.id !== task.id));

    // Invalidate task cache for current session
    if (selectedSession) {
      taskCache.invalidateCache(selectedSession.id);
    }

    // Mark as changed for sync
    markAsChanged();
  };

  // Show loading state
  if (isStartup) {
    return <LoadingState />;
  }

  return (
    <div className="h-full w-full flex flex-col min-h-0">
      {selectedSession ? (
        <>
          {/* Task List */}
          {taskList.length > 0 ? (
            <TaskList
              tasks={taskList}
              editingTaskId={editingTaskId}
              editingText={editingText}
              taskDetailsSortMode={taskDetailsSortMode}
              completionSortMode={completionSortMode}
              onEditingTextChange={setEditingText}
              onStartEditing={startEditing}
              onTaskKeyDown={handleTaskKeyDownWithIndex}
              onToggleCompletion={toggleTaskCompletion}
              onDeleteTask={handleDeleteTask}
              onTaskDetailsSortClick={handleTaskDetailsSortClick}
              onCompletionSortClick={handleCompletionSortClick}
              onCreateNewTask={createNewTask}
              onSaveTaskEdit={saveTaskEdit}
              onCancelEditing={cancelEditing}
              scrollContainerRef={scrollContainerRef}
              editingTaskRef={editingTaskRef}
            />
          ) : (
            <EmptyState selectedSession={selectedSession} onCreateNewTask={createNewTask} />
          )}
        </>
      ) : (
        <div className="flex-1 flex flex-col justify-center items-center text-center py-12 text-gray-500 min-h-0">
          <div className="text-4xl mb-3">📚</div>
          <p className="text-sm">Select a study session to view tasks</p>
        </div>
      )}
    </div>
  );
}
