import { useState, useEffect, useCallback, useRef } from "react";
import { useGlobalNotification } from "@/components/NotificationProvider";
import {
  BORDERFILL,
  FONTCOLOR,
  SECONDARY_TEXT,
  SUCCESS_COLOR,
  ERROR_COLOR,
  ACCENT_COLOR,
  BodyFont,
  HeaderFont,
  HOVER_COLOR,
  PANELFILL,
} from "@/components/constants";

interface Task {
  id: string;
  title: string;
  completed?: boolean;
  status?: string;
  dueDate?: string;
  priority?: string;
  assignee?: unknown;
  notionUrl?: string;
  createdTime?: string;
  lastEditedTime?: string;
  archived?: boolean;
  indent?: number; // For subtask indentation (0 = main task, 1+ = subtask levels)
  syncInstance: {
    isSyncing: boolean;
    prevSyncCall: Promise<void> | null;
  };
  parentId?: string;
}

interface TaskCreate {
  title: string;
  completed: boolean;
  indent: number;
  clientTempId: string;
  after: string | null;
  attemptCount: number;
}

interface TaskUpdate {
  id: string;
  title?: string;
  completed?: boolean;
  attemptCount: number;
}

interface TaskDelete {
  id: string;
  attemptCount: number;
}

interface SyncRequest {
  sessionPageId: string;
  creates: TaskCreate[];
  updates: TaskUpdate[];
  deletes: string[];
}

interface SyncResponse {
  created: Array<{ clientTempId: string; id: string }>;
  updated: string[];
  deleted: string[];
}

interface StudySession {
  id: string;
  title: string;
  createdTime: string;
  lastEditedTime: string;
  notionUrl: string;
  properties?: Record<string, unknown>;
  archived: boolean;
}

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

  // Delta-based sync state
  const [pendingCreates, setPendingCreates] = useState<TaskCreate[]>([]);
  const [pendingUpdates, setPendingUpdates] = useState<TaskUpdate[]>([]);
  const [pendingDeletes, setPendingDeletes] = useState<string[]>([]);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync timer for debounced sync
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);
  const syncFunctionRef = useRef<(() => Promise<void>) | null>(null);

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

  const getSortIcon = (sortMode: string) => {
    switch (sortMode) {
      case "asc":
        return "fi fi-rr-sort-alpha-up";
      case "desc":
        return "fi fi-rr-sort-alpha-down";
      case "completed":
        return "fi fi-rr-sort-numeric-down";
      case "uncompleted":
        return "fi fi-rr-sort-numeric-up";
      default:
        return "fi fi-rr-sort";
    }
  };

  // Load tasks when session changes
  useEffect(() => {
    if (isAuthenticated && selectedSession) {
      loadTasksFromSession();
    } else {
      setTaskList([]);
    }
  }, [isAuthenticated, selectedSession]);

  const syncTasksToServer = useCallback(async () => {
    if (!selectedSession) return;

    try {
      const syncRequest: SyncRequest = {
        sessionPageId: selectedSession.id,
        creates: [...pendingCreates],
        updates: [...pendingUpdates],
        deletes: [...pendingDeletes],
      };

      console.log("Sending sync request:", syncRequest);

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

      // Reconcile temp IDs with real Notion IDs
      if (responseData.created && responseData.created.length > 0) {
        setTaskList((prev: Task[]) =>
          prev.map((task: Task) => {
            const created = responseData.created.find((c) => c.clientTempId === task.id);
            if (created) {
              return { ...task, id: created.id };
            }
            return task;
          })
        );
      }

      // Set delta queues to failed
      setPendingCreates((prev: TaskCreate[]) =>
        prev.map((c) => ({ ...c, attemptCount: c.attemptCount + 1 }))
      );
      setPendingUpdates((prev: TaskUpdate[]) =>
        prev.map((c) => ({ ...c, attemptCount: c.attemptCount + 1 }))
      );
      setPendingDeletes((prev: TaskDelete[]) =>
        prev.map((c) => ({ ...c, attemptCount: c.attemptCount + 1 }))
      );

      console.log(
        `Synced deltas: ${responseData.created?.length || 0} created, ${
          responseData.updated?.length || 0
        } updated, ${responseData.deleted?.length || 0} deleted`
      );
    } catch (error) {
      console.error("Error syncing tasks:", error);
      throw error;
    }
  }, [selectedSession, pendingCreates, pendingUpdates, pendingDeletes, onRedirectToLogin]);

  // Create the sync function
  const createSyncFunction = useCallback(() => {
    return async () => {
      if (!selectedSession || isSyncing) {
        console.log("Sync skipped:", { hasSession: !!selectedSession, isSyncing });
        return;
      }
      if (
        pendingCreates.length === 0 &&
        pendingUpdates.length === 0 &&
        pendingDeletes.length === 0
      ) {
        console.log("Sync skipped: no pending changes");
        return;
      }

      console.log("Starting sync with deltas:", {
        creates: pendingCreates.length,
        updates: pendingUpdates.length,
        deletes: pendingDeletes.length,
      });

      setIsSyncing(true);
      try {
        await syncTasksToServer();
        setHasPendingChanges(false);
        console.log("Sync completed successfully");
      } catch (error) {
        console.error("Sync failed:", error);
        addNotification({
          type: "error",
          message: "Failed to sync changes to server",
        });
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
    console.log("Scheduling sync in 2 seconds...");
    if (syncTimerRef.current) {
      console.log("Clearing previous sync timer");
      clearTimeout(syncTimerRef.current);
    }
    syncTimerRef.current = setTimeout(() => {
      console.log("Executing scheduled sync");
      syncFunctionRef.current?.();
    }, 2000);
  }, []);

  const markAsChanged = useCallback(() => {
    console.log("Marking as changed, scheduling sync");
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
          return [...prev, { id: taskId, ...update }];
        }
      });
    },
    []
  );

  const enqueuePendingDelete = useCallback((taskId: string) => {
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
    setPendingDeletes((prev: string[]) => prev.filter((d: string) => d !== taskId));
  }, []);

  const loadTasksFromSession = useCallback(async () => {
    if (!selectedSession) return;

    try {
      // Get blocks from the selected study session page
      const response = await fetch(`/api/notion/blocks/${selectedSession.id}?children=true`, {
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.needsReauth) {
          addNotification({
            type: "error",
            message: "Your Notion connection has expired. Please reconnect your account.",
          });
          onRedirectToLogin();
          return;
        }
        throw new Error(errorData.error || "Failed to load tasks from session");
      }

      const data = await response.json();
      console.log("Session blocks data:", data);

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

      setTaskList(tasks);
      setOriginalTaskOrder([...tasks]); // Store original order
      setTaskDetailsSortMode("custom"); // Reset sorting modes
      setCompletionSortMode("custom");
      console.log(`Loaded ${tasks.length} tasks from session: ${selectedSession.title}`);
    } catch (err) {
      console.error("Error loading tasks from session:", err);
      addNotification({
        type: "error",
        message: `Failed to load tasks: ${err instanceof Error ? err.message : "Unknown error"}`,
      });
    } finally {
      setIsStartup(false);
    }
  }, [selectedSession, addNotification, onRedirectToLogin]);

  const createNewTask = (insertAfterTaskId?: string, indentLevel: number = 0) => {
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
      indent: indentLevel,
      notionUrl: "",
      createdTime: new Date().toISOString(),
      lastEditedTime: new Date().toISOString(),
      archived: false,
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

    // Queue for creation
    enqueuePendingCreate({
      title: newTaskTitle,
      completed: false,
      indent: indentLevel,
      clientTempId: tempTaskId,
      after: insertAfterTaskId || null,
      attemptCount: 0,
    });

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

    // Mark as changed for sync
    markAsChanged();
  };

  const startEditing = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingText(task.title);
  };

  const saveTaskEdit = (taskId: string, newTitle: string) => {
    if (!newTitle.trim()) return;

    const trimmedTitle = newTitle.trim();

    // Update task locally
    setTaskList((prev: Task[]) =>
      prev.map((t: Task) => (t.id === taskId ? { ...t, title: trimmedTitle } : t))
    );

    // Also update originalTaskOrder to keep it synchronized
    setOriginalTaskOrder((prev: Task[]) =>
      prev.map((t: Task) => (t.id === taskId ? { ...t, title: trimmedTitle } : t))
    );

    // Queue for sync (only if not a temp task - temp tasks are already in pendingCreates)
    if (!taskId.startsWith("temp-")) {
      upsertPendingUpdate(taskId, { title: trimmedTitle, attemptCount: 0 });
    } else {
      // Update the pending create with new title
      setPendingCreates((prev: TaskCreate[]) =>
        prev.map((c) =>
          c.clientTempId === taskId ? { ...c, title: trimmedTitle, attemptCount: 0 } : c
        )
      );
    }

    // Mark as changed for sync
    markAsChanged();
  };

  const handleTaskKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    task: Task,
    taskIndex: number
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();

      // Save current edit
      saveTaskEdit(task.id, editingText);
      setEditingTaskId(null);
    } else if (e.key === "Escape") {
      // Cancel editing
      setEditingTaskId(null);
      setEditingText("");
    } else if (e.key === "Backspace" || e.key === "Delete") {
      // Check if the current string is empty. if yes, delete it
      if (editingText.trim() === "") {
        handleDeleteTask(task);
      }
    }
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

    // Queue for sync
    if (!task.id.startsWith("temp-")) {
      upsertPendingUpdate(task.id, { completed: newTaskStatus, attemptCount: 0 });
    } else {
      // Update the pending create
      setPendingCreates((prev: TaskCreate[]) =>
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

    // Mark as changed for sync
    markAsChanged();
  };

  // Show loading state
  if (isStartup) {
    return (
      <div className="h-full flex flex-col justify-center items-center text-center py-16">
        <div className="flex justify-center mb-4">
          <i className="fi fi-rr-loading text-5xl animate-spin" style={{ color: ACCENT_COLOR }}></i>
        </div>
        <h3
          className="text-lg font-medium mb-2"
          style={{ fontFamily: HeaderFont, color: FONTCOLOR }}
        >
          Loading your tasks...
        </h3>
        <p className="text-sm" style={{ color: SECONDARY_TEXT, fontFamily: BodyFont }}>
          Please wait while we fetch your study session content
        </p>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col min-h-0">
      {selectedSession ? (
        <>
          {/* Task List */}
          {taskList.length > 0 ? (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
              <div
                className="overflow-auto flex-1"
                style={{
                  scrollbarWidth: "none", // Firefox
                  msOverflowStyle: "none", // IE 10+
                }}
                ref={scrollContainerRef}
              >
                <div className="overflow-auto flex-1">
                  <div className="hide-scrollbar">
                    <table className="w-full border-collapse relative">
                      <thead
                        className="sticky top-0 z-10"
                        style={{
                          backgroundColor: PANELFILL,
                          borderBottom: `3px solid ${BORDERFILL}`,
                        }}
                      >
                        <tr>
                          <th
                            className="text-center p-3 font-bold w-16 cursor-pointer select-none"
                            style={{
                              borderRight: `2px solid ${BORDERFILL}`,
                              borderBottom: `2px solid ${BORDERFILL}`,
                              color: FONTCOLOR,
                              fontFamily: HeaderFont,
                              fontSize: "1rem",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = HOVER_COLOR;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "transparent";
                            }}
                            onClick={handleCompletionSortClick}
                            title={`Sort by completion (${completionSortMode})`}
                          >
                            <div className="flex items-center justify-center gap-1">
                              <i className="fi fi-rr-checkbox text-sm"></i>
                              <i
                                className={`${getSortIcon(completionSortMode)} text-xs opacity-70`}
                              ></i>
                            </div>
                          </th>
                          <th
                            className="text-left p-3 font-bold cursor-pointer select-none"
                            style={{
                              borderBottom: `2px solid ${BORDERFILL}`,
                              color: FONTCOLOR,
                              fontFamily: HeaderFont,
                              fontSize: "1rem",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = HOVER_COLOR;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "transparent";
                            }}
                            onClick={handleTaskDetailsSortClick}
                            title={`Sort by task name (${taskDetailsSortMode})`}
                          >
                            <div className="flex items-center gap-2">
                              <i className="fi fi-rr-list text-sm"></i>
                              Task Details
                              <i
                                className={`${getSortIcon(taskDetailsSortMode)} text-xs opacity-70`}
                              ></i>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {taskList.map((task: Task, index: number) => (
                          <tr
                            key={task.id}
                            className={`group cursor-pointer transition-all duration-200`}
                            style={{
                              backgroundColor:
                                editingTaskId === task.id ? ACCENT_COLOR + "20" : "white", // Light accent color for selected
                              borderBottom: `1px solid ${BORDERFILL}`,
                            }}
                            ref={task.id === editingTaskId ? editingTaskRef : null}
                            onMouseEnter={(e) => {
                              if (editingTaskId !== task.id) {
                                e.currentTarget.style.backgroundColor = HOVER_COLOR;
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (editingTaskId !== task.id) {
                                e.currentTarget.style.backgroundColor = "white";
                              }
                            }}
                          >
                            <td
                              className="p-2 text-center"
                              style={{ borderRight: `1px solid ${BORDERFILL}`, width: "60px" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTaskCompletion(task);
                              }}
                            >
                              <button
                                className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all duration-200 hover:shadow-sm ${
                                  task.completed ? "text-white" : "hover:border-opacity-60"
                                }`}
                                style={{
                                  backgroundColor: task.completed ? SUCCESS_COLOR : "transparent",
                                  borderColor: task.completed ? SUCCESS_COLOR : ACCENT_COLOR,
                                }}
                              >
                                {task.completed && <i className="fi fi-rr-check text-xs"></i>}
                              </button>
                            </td>
                            <td
                              className="p-2 relative"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditing(task);
                              }}
                            >
                              <div
                                className="flex items-center"
                                style={{ paddingLeft: `${(task.indent || 0) * 20}px` }}
                              >
                                {editingTaskId === task.id ? (
                                  <input
                                    type="text"
                                    value={editingText}
                                    onChange={(e) => setEditingText(e.target.value)}
                                    onBlur={() => {
                                      saveTaskEdit(task.id, editingText);
                                      cancelEditing();
                                    }}
                                    onKeyDown={(e) => handleTaskKeyDown(e, task, index)}
                                    className={`flex-1 border-none outline-none ${
                                      task.completed ? "line-through" : ""
                                    }`}
                                    style={{
                                      minHeight: "24px",
                                      fontSize: "14px",
                                      color: task.completed ? SECONDARY_TEXT : FONTCOLOR,
                                      fontFamily: BodyFont,
                                      backgroundColor: "transparent",
                                    }}
                                    autoFocus
                                    onClick={(e) => e.stopPropagation()}
                                    placeholder="Enter task description..."
                                  />
                                ) : (
                                  <div
                                    className={`flex-1 cursor-text ${
                                      task.completed ? "line-through" : ""
                                    }`}
                                    title={task.title}
                                    style={{
                                      color: task.completed ? SECONDARY_TEXT : FONTCOLOR,
                                      fontFamily: BodyFont,
                                      fontSize: "14px",
                                      lineHeight: "1.5",
                                    }}
                                  >
                                    {task.title || "Untitled task"}
                                  </div>
                                )}

                                {/* Delete button - only show on hover */}
                                <button
                                  className="opacity-0 group-hover:opacity-100 absolute right-2 top-1/2 transform -translate-y-1/2 w-6 h-6 rounded flex items-center justify-center transition-all duration-200 hover:shadow-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTask(task);
                                  }}
                                  title="Delete task"
                                  style={{
                                    backgroundColor: ERROR_COLOR,
                                    color: "white",
                                  }}
                                >
                                  <i className="fi fi-rr-trash text-xs"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Sticky Footer for Add New Task */}
              <div
                className="sticky bottom-0 z-10"
                style={{
                  borderTop: `3px solid ${BORDERFILL}`,
                  backgroundColor: PANELFILL,
                }}
              >
                <button
                  onClick={() => createNewTask()}
                  className="w-full py-3 px-4 font-bold transition-all duration-200 border-none outline-none cursor-pointer text-left hover:shadow-sm"
                  style={{
                    backgroundColor: PANELFILL,
                    color: FONTCOLOR,
                    fontFamily: HeaderFont,
                    fontSize: "1rem",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = SUCCESS_COLOR;
                    e.currentTarget.style.color = "white";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = PANELFILL;
                    e.currentTarget.style.color = FONTCOLOR;
                  }}
                >
                  <div className="flex items-center gap-2">
                    <i className="fi fi-rr-plus text-sm"></i>
                    Add New Task
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center text-center py-16 min-h-0">
              <div className="flex justify-center mb-6">
                <i
                  className="fi fi-rr-document-circle-wrong text-6xl"
                  style={{ color: ACCENT_COLOR }}
                ></i>
              </div>
              <h3
                className="text-lg font-medium mb-2"
                style={{ fontFamily: HeaderFont, color: FONTCOLOR }}
              >
                No tasks found in this session
              </h3>
              <p
                className="text-sm mb-6 max-w-md"
                style={{ color: SECONDARY_TEXT, fontFamily: BodyFont }}
              >
                Start organizing your study session by adding your first task. Break down your goals
                into manageable pieces!
              </p>
              <button
                onClick={() => createNewTask()}
                className="flex items-center gap-2 px-6 py-3 rounded-lg transition-all duration-200 hover:shadow-md"
                style={{
                  backgroundColor: SUCCESS_COLOR,
                  color: "white",
                  fontFamily: HeaderFont,
                  fontSize: "1rem",
                }}
              >
                <i className="fi fi-rr-plus text-sm"></i>
                Create Your First Task
              </button>
              {selectedSession.notionUrl && (
                <a
                  href={selectedSession.notionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 text-blue-500 hover:text-blue-700 text-sm"
                >
                  Open in Notion →
                </a>
              )}
            </div>
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
