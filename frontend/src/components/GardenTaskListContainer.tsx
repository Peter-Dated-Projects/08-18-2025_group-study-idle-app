import { useState, useEffect, useCallback } from "react";
import Task from "./Task";
import { useGlobalNotification } from "@/components/NotificationProvider";

const BORDERFILL = "#e5e5e5";

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
  onTaskClick?: (task: Task) => void;
  isAuthenticated: boolean;
  onRedirectToLogin: () => void;
  onDataLoaded: (data: { taskList: Task[] }) => void;
  onSessionRefresh: () => Promise<void>;
}

export default function GardenTaskListContainer({
  selectedSession,
  onTaskClick,
  isAuthenticated,
  onRedirectToLogin,
  onDataLoaded,
}: GardenTaskListContainerProps) {
  const { addNotification } = useGlobalNotification();
  const [taskList, setTaskList] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Notify parent when data changes
  useEffect(() => {
    onDataLoaded({
      taskList,
    });
  }, [taskList, onDataLoaded]);

  // Load tasks when session changes
  useEffect(() => {
    if (isAuthenticated && selectedSession) {
      loadTasksFromSession();
    } else {
      setTaskList([]);
    }
  }, [isAuthenticated, selectedSession]);

  const loadTasksFromSession = useCallback(async () => {
    if (!selectedSession) return;

    try {
      setIsLoading(true);

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
            });
          }
        });
      }

      setTaskList(tasks);
      console.log(`Loaded ${tasks.length} tasks from session: ${selectedSession.title}`);
    } catch (err) {
      console.error("Error loading tasks from session:", err);
      addNotification({
        type: "error",
        message: `Failed to load tasks: ${err instanceof Error ? err.message : "Unknown error"}`,
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedSession, addNotification, onRedirectToLogin]);

  const toggleTaskCompletion = async (task: Task) => {
    try {
      // Update the block in Notion
      const response = await fetch(`/api/notion/blocks/${task.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          to_do: {
            checked: !task.completed,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update task");
      }

      // Update local state
      setTaskList((prev: Task[]) =>
        prev.map((t: Task) => (t.id === task.id ? { ...t, completed: !t.completed } : t))
      );

      addNotification({
        type: "info",
        message: `Task ${!task.completed ? "completed" : "reopened"}!`,
      });
    } catch (error) {
      console.error("Error updating task:", error);
      addNotification({
        type: "error",
        message: `Failed to update task: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="h-full flex flex-col justify-center items-center text-center py-12 text-gray-500">
        <div className="text-4xl mb-3">⏳</div>
        <p className="text-sm">Loading tasks...</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col min-h-0">
      {selectedSession ? (
        <>
          {/* Task List */}
          {taskList.length > 0 ? (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="overflow-auto flex-1">
                <table className="w-full border-collapse">
                  <thead
                    className="sticky top-0 z-5"
                    style={{ backgroundColor: "white", borderBottom: `2px solid ${BORDERFILL}` }}
                  >
                    <tr>
                      <th
                        className="text-left p-3 font-medium text-gray-700 w-16"
                        style={{
                          borderRight: `1px solid ${BORDERFILL}`,
                          borderBottom: `1px solid ${BORDERFILL}`,
                        }}
                      >
                        Status
                      </th>
                      <th
                        className="text-left p-3 font-medium text-gray-700"
                        style={{ borderBottom: `1px solid ${BORDERFILL}` }}
                      >
                        Task
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {taskList.map((task: Task) => (
                      <tr
                        key={task.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        style={{
                          backgroundColor: "white",
                          borderBottom: `1px solid ${BORDERFILL}`,
                        }}
                        onClick={() => onTaskClick?.(task)}
                      >
                        <td
                          className="p-3 text-sm text-center"
                          style={{ borderRight: `1px solid ${BORDERFILL}` }}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTaskCompletion(task);
                          }}
                        >
                          <button
                            className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                              task.completed
                                ? "bg-green-500 border-green-500 text-white"
                                : "border-gray-300 hover:border-gray-400"
                            }`}
                          >
                            {task.completed && "✓"}
                          </button>
                        </td>
                        <td className="p-3 text-sm">
                          <div
                            className={`truncate ${
                              task.completed ? "line-through text-gray-500" : ""
                            }`}
                            title={task.title}
                          >
                            {task.title}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center text-center py-12 text-gray-500 min-h-0">
              <div className="text-4xl mb-3">📝</div>
              <p className="text-sm mb-2">No tasks found in this study session</p>
              <p className="text-xs text-gray-400">
                Add tasks to your Notion page to see them here
              </p>
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
