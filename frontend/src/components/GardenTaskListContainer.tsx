import { useState, useEffect, useMemo } from "react";
import { BORDERFILL } from "./constants";
import { useGlobalNotification } from "./NotificationProvider";
import { UserEnabledDatabases } from "@/lib/firestore";
import style from "styled-jsx/style";

interface Task {
  id: string;
  title: string;
  completed?: boolean;
  status?: string;
  dueDate?: string;
  priority?: string;
  assignee?: any;
  notionUrl?: string;
  createdTime?: string;
  lastEditedTime?: string;
  archived?: boolean;
}

interface DatabasePage {
  id: string;
  title: string;
  properties?: Record<string, any>;
  notionUrl?: string;
  createdTime?: string;
  lastEditedTime?: string;
  archived?: boolean;
  icon?: any;
  cover?: any;
}

interface DatabaseProperty {
  id: string;
  name: string;
  type: string;
  key: string;
  options: DatabasePropertyOption[] | null;
}

interface DatabasePropertyOption {
  id: string;
  name: string;
  color: string;
  description: string;
}

interface GardenTaskListContainerProps {
  selectedDatabase?: any;
  currentFilter?: any;
  onFilterClear: () => void;
  onTaskClick?: (task: Task) => void;
  isAuthenticated: boolean;
  onRedirectToLogin: () => void;
  onDataLoaded: (data: { taskList: Task[] }) => void;
  filterOptions: any[];
  onFilterChange: (filter: any) => void;
}

export default function GardenTaskListContainer({
  selectedDatabase,
  currentFilter,
  onFilterClear,
  onTaskClick,
  isAuthenticated,
  onRedirectToLogin,
  onDataLoaded,
  filterOptions,
  onFilterChange,
}: GardenTaskListContainerProps) {
  const { addNotification } = useGlobalNotification();
  const [taskList, setTaskList] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [databaseSchema, setDatabaseSchema] = useState<DatabaseProperty[] | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [enabledDatabases, setEnabledDatabases] = useState<UserEnabledDatabases | null>(null);
  const [tableColumns, setTableColumns] = useState<DatabaseProperty[]>([]);

  // Helper function to retrieve all "Enabled" databases
  const loadEnabledDatabases = async () => {
    try {
      const response = await fetch("/api/notion/databases/enabled");
      const data = await response.json();
      setEnabledDatabases(data);
    } catch (error) {
      console.error("Error fetching enabled databases:", error);
      return null;
    }
  };

  // Helper function to get start of week (Sunday) - normalized to start of day
  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    const startOfWeek = new Date(d.setDate(diff));
    // Normalize to start of day (00:00:00)
    startOfWeek.setHours(0, 0, 0, 0);
    return startOfWeek;
  };

  // Helper function to create date range filters
  const createDateRangeFilter = (startDate: Date, endDate: Date) => {
    // Find date properties from database schema
    const dateProperties = getDateProperties();

    // If no date properties found, try common fallback names
    let primaryDateProperty = null;

    if (dateProperties.length > 0) {
      primaryDateProperty = dateProperties[0];
    } else {
      // Try common date property names as fallbacks
      const commonDateNames = [
        "Due Date",
        "Due",
        "Date",
        "Created",
        "Modified",
        "Last Edited",
        "Start Date",
        "End Date",
        "Deadline",
        "Created Time",
        "Last Edited Time",
      ];

      if (databaseSchema?.properties) {
        for (const commonName of commonDateNames) {
          if (databaseSchema.properties[commonName]) {
            primaryDateProperty = commonName;
            console.log(`Using fallback date property: ${commonName}`);
            break;
          }
        }
      }
    }

    // If still no date property found, return null (will trigger error message)
    if (!primaryDateProperty) {
      console.warn("No date properties found in database schema:", databaseSchema?.properties);
      return null;
    }

    // console.log(`Creating date filter using property: ${primaryDateProperty}`);

    return {
      and: [
        {
          property: primaryDateProperty,
          date: {
            on_or_after: startDate.toISOString().split("T")[0],
          },
        },
        {
          property: primaryDateProperty,
          date: {
            on_or_before: endDate.toISOString().split("T")[0],
          },
        },
      ],
    };
  };

  // Helper function to get date properties from database schema
  const getDateProperties = () => {
    if (!databaseSchema?.properties) {
      console.warn("Database schema not loaded or has no properties");
      return [];
    }

    const dateProps = Object.entries(databaseSchema.properties)
      .filter(([_, prop]: [string, any]) => prop.type === "date")
      .map(([key]) => key);

    return dateProps;
  };

  // Load up Enabled Databases and Schema when database is selected
  useEffect(() => {
    if (isAuthenticated && selectedDatabase) {
      console.log("Loading database schema and tasks/pages...");
      loadEnabledDatabases();
      loadDatabaseSchema();
    }
  }, [isAuthenticated, selectedDatabase, currentFilter]);

  // Load up tasks when database is selected
  useEffect(() => {
    if (isAuthenticated && selectedDatabase) {
      console.log("Loading tasks...");
      loadTableColumns();
      loadTasks();
    }
  }, [databaseSchema]);

  // Notify parent when data changes
  useEffect(() => {
    onDataLoaded({
      taskList,
    });
  }, [taskList, onDataLoaded]);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showFilters) {
        const target = event.target as Element;
        if (!target.closest(".filter-dropdown-container")) {
          setShowFilters(false);
        }
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showFilters]);

  const loadDatabaseSchema = async () => {
    if (!selectedDatabase) return;

    try {
      const response = await fetch(`/api/notion/databases/${selectedDatabase.id}`, {
        credentials: "include",
      });

      if (!response.ok) {
        console.warn("Could not load database schema");
        return;
      }

      const data = await response.json();
      setDatabaseSchema(data);
    } catch (err) {
      console.error("Error loading database schema:", err);
    }
  };

  const loadTasks = async () => {
    if (!selectedDatabase) return;

    console.log("Loading tasks...");

    try {
      setIsLoading(true);

      // Build query URL with filter if present
      let queryUrl = `/api/notion/tasks?databaseId=${selectedDatabase.id}`;
      if (currentFilter) {
        const filterParam = encodeURIComponent(JSON.stringify(currentFilter));
        queryUrl += `&filter=${filterParam}`;
      }

      const response = await fetch(queryUrl, {
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();

        if (errorData.needsReauth) {
          // Check if this is a Notion token issue or a complete auth failure
          if (errorData.error?.includes("Notion")) {
            // This is a Notion-specific issue - don't redirect to login
            addNotification({
              message:
                "Notion connection expired. Please reconnect to Notion to access your databases.",
              type: "error",
            });
            setTaskList([]);
            return;
          } else if (
            errorData.error?.includes("session") ||
            errorData.error?.includes("authenticated")
          ) {
            // This is a complete session failure - redirect to login
            onRedirectToLogin();
            return;
          }
        }

        // For other errors, show them without redirecting
        throw new Error(errorData.error || "Failed to load data");
      }

      const data = await response.json();
      console.log(data);

      if (data.is_task_database) {
        setTaskList(data.tasks || []);
      } else {
        setTaskList([]);
      }
    } catch (err) {
      console.error("Error loading data:", err);
      addNotification({
        message: `Failed to load data: ${err instanceof Error ? err.message : "Unknown error"}`,
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to get columns from database schema
  const loadTableColumns = () => {
    if (!databaseSchema?.properties) {
      // Default columns if schema not available

      console.warn("Database schema not available, using default columns");
      setTableColumns([
        { id: "0", name: "Completed", type: "checkbox", key: "completed" },
        { id: "1", name: "Title", type: "title", key: "title" },
      ]);

      return;
    }

    const columns: DatabaseProperty[] = [];

    // Add Checkbox column first
    Object.entries(databaseSchema.properties).forEach(([key, value]: [string, any]) => {
      if (value?.type === "checkbox") {
        columns.push(value);
        // only add one checkbox column
        return;
      }
    });

    // If not checkbox column found, create one + let user know
    if (columns.length === 0) {
      console.warn("No checkbox property found in database schema, adding default checkbox column");
      fetch(`/api/notion/databases/${selectedDatabase.id}/update`, {
        method: "POST",
        body: JSON.stringify({
          properties: {
            Completed: {
              checkbox: {},
            },
          },
        }),
      });

      columns.push({
        id: "0",
        name: "Completed",
        type: "checkbox",
        key: "completed",
        options: null,
      });

      // make a notification for the user so they know something happened
      addNotification({
        message: "No checkbox property found in database schema, adding default checkbox column",
        type: "info",
      });
    }

    addNotification({
      message: "You can customize columns in the database settings.",
      type: "info",
    });

    // Add Title column 2nd
    Object.entries(databaseSchema.properties).forEach(([key, value]: [string, any]) => {
      if (value?.type === "title") {
        columns.push(value);
        // Only add 1 title column
        return;
      }
    });

    console.log(columns);

    setTableColumns(columns);
  };

  // Helper function to render cell content based on property type
  const renderCellContent = (item: Task, column: any) => {
    if (!item) return "";

    switch (column.type) {
      case "title":
        return item.title || "";
      case "checkbox":
        return item.completed ? "✓" : "[ ]";
      default:
        return String(item[column.key]) || "";
    }
  };

  // Helper function to apply filter
  const applyFilter = (property: string, condition: string, value: any) => {
    const filter = {
      property,
      [condition]: value,
    };
    onFilterChange(filter);
    setShowFilters(false);
  };

  // Predefined time-based filters - memoized to only recalculate when database schema changes
  const predefinedFilters = useMemo(() => {
    if (!databaseSchema) return [];

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Start of today
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentWeek = getStartOfWeek(today);

    return [
      {
        name: "This Week",
        filter: createDateRangeFilter(
          currentWeek,
          new Date(currentWeek.getTime() + 6 * 24 * 60 * 60 * 1000)
        ),
      },
      {
        name: "This Month",
        filter: createDateRangeFilter(
          new Date(currentYear, currentMonth, 1),
          new Date(currentYear, currentMonth + 1, 0)
        ),
      },
      {
        name: "This Year",
        filter: createDateRangeFilter(new Date(currentYear, 0, 1), new Date(currentYear, 11, 31)),
      },
      {
        name: "Today",
        filter: createDateRangeFilter(today, new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)),
      },
      {
        name: "Yesterday",
        filter: createDateRangeFilter(
          new Date(today.getTime() - 24 * 60 * 60 * 1000),
          new Date(today.getTime() - 1)
        ),
      },
      {
        name: "Tomorrow",
        filter: createDateRangeFilter(
          new Date(today.getTime() + 24 * 60 * 60 * 1000),
          new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000 - 1)
        ),
      },
      {
        name: "Past 7 Days",
        filter: createDateRangeFilter(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000), today),
      },
      {
        name: "Next 7 Days",
        filter: createDateRangeFilter(today, new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)),
      },
      {
        name: "Past 14 Days",
        filter: createDateRangeFilter(new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000), today),
      },
      {
        name: "Next 14 Days",
        filter: createDateRangeFilter(today, new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)),
      },
      {
        name: "Past 30 Days",
        filter: createDateRangeFilter(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), today),
      },
      {
        name: "Next 30 Days",
        filter: createDateRangeFilter(today, new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)),
      },
    ];
  }, [databaseSchema]); // Only recalculate when database schema changes

  // Show loading state
  if (isLoading) {
    return (
      <div className="h-full flex flex-col justify-center items-center text-center py-12 text-gray-500">
        <div className="text-4xl mb-3">⏳</div>
        <p className="text-sm">Loading data...</p>
      </div>
    );
  }
  return (
    <div className="h-full w-full flex flex-col min-h-0">
      {selectedDatabase ? (
        <>
          {/* Filter Interface - Header Bar with Dropdown */}
          <div
            className="relative border-b filter-dropdown-container"
            style={{ borderColor: BORDERFILL }}
          >
            <div className="p-4 bg-white">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-700">Filters</h4>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  {showFilters ? "Hide" : "Show"} Filters
                </button>
              </div>
            </div>

            {/* Dropdown Overlay */}
            {showFilters && (
              <div
                className="absolute top-full left-0 right-0 bg-white shadow-xl border-l border-r border-b z-50 rounded-b-lg"
                style={{ borderColor: BORDERFILL, boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)" }}
              >
                <div
                  className="p-4 max-h-96 overflow-y-auto custom-scrollbar"
                  style={{
                    scrollbarWidth: "thin",
                    scrollbarColor: "transparent transparent",
                  }}
                >
                  <div className="space-y-4">
                    {/* Predefined Time-based Filters */}
                    {databaseSchema ? (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-xs font-medium text-gray-600">Quick Time Filters</h5>
                          {currentFilter && (
                            <button
                              onClick={() => {
                                onFilterClear();
                                setShowFilters(false);
                              }}
                              className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                            >
                              Clear Filter
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {predefinedFilters.map((predefinedFilter: any, index: number) => (
                            <button
                              key={index}
                              onClick={() => {
                                if (predefinedFilter.filter) {
                                  console.log(
                                    `Applying predefined filter: ${predefinedFilter.name}`,
                                    predefinedFilter.filter
                                  );
                                  onFilterChange(predefinedFilter.filter);
                                  setShowFilters(false); // Close dropdown after selection
                                } else {
                                  const availableProps = databaseSchema?.properties
                                    ? Object.keys(databaseSchema.properties).join(", ")
                                    : "none";
                                  addNotification({
                                    message: `${predefinedFilter.name} filter requires a date property. Available properties: ${availableProps}`,
                                    type: "error",
                                  });
                                }
                              }}
                              className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                            >
                              {predefinedFilter.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <div className="text-xs text-gray-500 mb-2">Loading time filters...</div>
                        <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                      </div>
                    )}

                    {/* Property-based Filters */}
                    {filterOptions.length > 0 && (
                      <div>
                        <h5 className="text-xs font-medium text-gray-600 mb-2">Property Filters</h5>
                        <div className="flex flex-wrap gap-2">
                          {filterOptions.map((option: any) => (
                            <div key={option.property} className="flex items-center gap-2">
                              <select
                                className="text-xs border rounded px-2 py-1"
                                onChange={(e) => {
                                  const [property, condition, value] = e.target.value.split("|");
                                  if (property && condition && value) {
                                    applyFilter(property, condition, value);
                                    setShowFilters(false); // Close dropdown after selection
                                  }
                                }}
                                defaultValue=""
                              >
                                <option value="" disabled>
                                  {option.name}
                                </option>
                                {option.type === "select" &&
                                  option.options?.map((opt: string) => (
                                    <option key={opt} value={`${option.property}|equals|${opt}`}>
                                      {option.name} = {opt}
                                    </option>
                                  ))}
                                {option.type === "checkbox" && (
                                  <>
                                    <option value={`${option.property}|checkbox|true`}>
                                      {option.name} = Checked
                                    </option>
                                    <option value={`${option.property}|checkbox|false`}>
                                      {option.name} = Unchecked
                                    </option>
                                  </>
                                )}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {currentFilter && (
                      <div
                        className="flex items-center gap-2 pt-2 border-t"
                        style={{ borderColor: BORDERFILL }}
                      >
                        <span className="text-xs text-gray-600">Active filter:</span>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded max-w-xs truncate">
                          {JSON.stringify(currentFilter)}
                        </code>
                        <button
                          onClick={() => {
                            onFilterClear();
                            setShowFilters(false);
                          }}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Task Database Table */}
          {taskList.length > 0 && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-auto">
                <table className="w-full border-collapse" style={{ backgroundColor: "white" }}>
                  <thead
                    className="sticky top-0 z-5"
                    style={{ backgroundColor: "white", borderBottom: `2px solid ${BORDERFILL}` }}
                  >
                    <tr>
                      {tableColumns.map((column: DatabaseProperty, index: number) => (
                        <th
                          key={column.key}
                          className={`text-left p-3 font-medium text-gray-700${
                            index === 0 ? " max-w-[100px]" : ""
                          }`}
                          style={{
                            borderRight:
                              index < tableColumns.length - 1 ? `1px solid ${BORDERFILL}` : "none",
                            borderBottom: `1px solid ${BORDERFILL}`,
                          }}
                        >
                          {column.name}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {taskList.map((task: Task, index: number) => (
                      <tr
                        key={task.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        style={{
                          backgroundColor: "white",
                          borderBottom: `1px solid ${BORDERFILL}`,
                        }}
                        onClick={() => onTaskClick?.(task)}
                      >
                        {tableColumns.map((column: DatabaseProperty, colIndex: number) => (
                          <td
                            key={column.key}
                            className="p-3 text-sm"
                            style={{
                              borderRight:
                                colIndex < tableColumns.length - 1
                                  ? `1px solid ${BORDERFILL}`
                                  : "none",
                            }}
                          >
                            <div
                              className="truncate"
                              title={String(renderCellContent(task, column))}
                            >
                              {renderCellContent(task, column)}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {/* Empty States */}
          {taskList.length === 0 && (
            <div className="flex-1 flex flex-col justify-center items-center text-center py-12 text-gray-500 min-h-0">
              <div className="text-4xl mb-3">📝</div>
              <p className="text-sm mb-2">No tasks found in this database</p>
              {currentFilter && (
                <button
                  onClick={onFilterClear}
                  className="text-blue-500 hover:text-blue-700 text-sm"
                >
                  Clear filters to see all tasks
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="flex-1 flex flex-col justify-center items-center text-center py-12 text-gray-500 min-h-0">
          <div className="text-4xl mb-3">🗃️</div>
          {!selectedDatabase ? (
            <p className="text-sm">Please select a database to view tasks and pages</p>
          ) : (
            <p className="text-sm">Loading Database from {selectedDatabase}</p>
          )}
        </div>
      )}

      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar {
          transition: scrollbar-color 0.3s ease;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: transparent;
          border-radius: 4px;
          transition: background-color 0.3s ease;
        }

        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.2);
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.4);
        }

        /* Firefox scrollbar styling */
        .custom-scrollbar:hover {
          scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
        }

        @supports (selector(::-webkit-scrollbar)) {
          .custom-scrollbar {
            scrollbar-width: auto;
          }
        }
      `}</style>
    </div>
  );
}
