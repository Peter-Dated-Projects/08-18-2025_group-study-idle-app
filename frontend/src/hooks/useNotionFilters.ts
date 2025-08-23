"use client";

import { useState, useEffect, useCallback } from "react";
import { DatabaseFilter, NotionFilterBuilder, CommonFilters } from "@/lib/notion-filters";

export interface FilterOption {
  property: string;
  type: string;
  name: string;
  options?: string[];
  examples?: any[];
}

export interface UseNotionFiltersReturn {
  // Available filter options for the current database
  filterOptions: FilterOption[];

  // Loading states
  isLoadingFilters: boolean;

  // Current active filter
  currentFilter: DatabaseFilter | null;

  // Filter builder instance
  filterBuilder: NotionFilterBuilder;

  // Functions
  loadFilterOptions: (databaseId?: string) => Promise<void>;
  setFilter: (filter: DatabaseFilter | null) => void;
  resetFilter: () => void;
  applyCommonFilter: (filterType: string, ...args: any[]) => void;

  // Error handling
  error: string | null;
}

export function useNotionFilters(initialDatabaseId?: string): UseNotionFiltersReturn {
  const [filterOptions, setFilterOptions] = useState<FilterOption[]>([]);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<DatabaseFilter | null>(null);
  const [filterBuilder] = useState(new NotionFilterBuilder());
  const [error, setError] = useState<string | null>(null);

  // Load available filter options for a database
  const loadFilterOptions = useCallback(async (databaseId?: string) => {
    if (!databaseId) {
      // Try to get from current session
      setIsLoadingFilters(true);
      try {
        const response = await fetch("/api/notion/filters");
        if (!response.ok) {
          throw new Error("Failed to load filter options");
        }
        const data = await response.json();
        const filterOptions = data.filterOptions || [];
        console.log("🔍 Filter options loaded from current session:", filterOptions);
        setFilterOptions(filterOptions);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load filters");
        setFilterOptions([]);
      } finally {
        setIsLoadingFilters(false);
      }
      return;
    }

    // Load for specific database
    setIsLoadingFilters(true);
    try {
      const response = await fetch(`/api/notion/databases/${databaseId}/filters`);
      if (!response.ok) {
        throw new Error("Failed to load filter options");
      }
      const data = await response.json();
      const filterOptions = data.filterOptions || [];
      console.log(`🔍 Filter options loaded for database ${databaseId}:`, filterOptions);
      console.log(
        `📋 Found ${filterOptions.length} filterable properties:`,
        filterOptions.map((opt: FilterOption) => `${opt.name} (${opt.type})`)
      );
      setFilterOptions(filterOptions);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load filters");
      setFilterOptions([]);
    } finally {
      setIsLoadingFilters(false);
    }
  }, []);

  // Set a filter
  const setFilter = useCallback(
    (filter: DatabaseFilter | null) => {
      console.log("🎯 Setting filter:", filter);
      setCurrentFilter(filter);
      if (filter === null) {
        console.log("🔄 Resetting filter builder");
        filterBuilder.reset();
      }
    },
    [filterBuilder]
  );

  // Reset current filter
  const resetFilter = useCallback(() => {
    setCurrentFilter(null);
    filterBuilder.reset();
  }, [filterBuilder]);

  // Apply common filter patterns
  const applyCommonFilter = useCallback((filterType: string, ...args: any[]) => {
    console.log(`🚀 Applying common filter: ${filterType}`, args);
    let filter: DatabaseFilter | null = null;

    switch (filterType) {
      case "completed":
        filter = CommonFilters.completedTasks(args[0]);
        break;
      case "incomplete":
        filter = CommonFilters.incompleteTasks(args[0]);
        break;
      case "status":
        filter = CommonFilters.tasksWithStatus(args[0], args[1]);
        break;
      case "dueSoon":
        filter = CommonFilters.tasksDueSoon(args[0]);
        break;
      case "overdue":
        filter = CommonFilters.overdueTasks(args[0]);
        break;
      case "priority":
        filter = CommonFilters.tasksWithPriority(args[0], args[1]);
        break;
      case "assignedToMe":
        filter = CommonFilters.tasksAssignedToMe(args[0], args[1]);
        break;
      case "containsText":
        filter = CommonFilters.tasksContainingText(args[0], args[1]);
        break;
      case "recentlyCreated":
        filter = CommonFilters.recentlyCreated(args[0]);
        break;
      case "highPriorityIncomplete":
        filter = CommonFilters.highPriorityIncomplete(args[0], args[1]);
        break;
      default:
        console.warn(`Unknown common filter type: ${filterType}`);
        return;
    }

    if (filter) {
      console.log("✅ Common filter applied successfully:", filter);
      setCurrentFilter(filter);
    } else {
      console.log("❌ No filter was created for the given type and args");
    }
  }, []);

  // Load filter options on mount if database ID provided
  useEffect(() => {
    if (initialDatabaseId) {
      loadFilterOptions(initialDatabaseId);
    }
  }, [initialDatabaseId, loadFilterOptions]);

  return {
    filterOptions,
    isLoadingFilters,
    currentFilter,
    filterBuilder,
    loadFilterOptions,
    setFilter,
    resetFilter,
    applyCommonFilter,
    error,
  };
}

// Hook for building custom filters with a fluent API
export function useFilterBuilder(operator: "and" | "or" = "and") {
  const [builder] = useState(new NotionFilterBuilder(operator));
  const [currentFilter, setCurrentFilter] = useState<DatabaseFilter | null>(null);

  // Build and set the current filter
  const buildFilter = useCallback(() => {
    const filter = builder.build();
    setCurrentFilter(filter);
    return filter;
  }, [builder]);

  // Reset the builder and current filter
  const reset = useCallback(() => {
    builder.reset();
    setCurrentFilter(null);
  }, [builder]);

  return {
    builder,
    currentFilter,
    buildFilter,
    reset,
  };
}

// Hook for managing multiple named filters
export function useNamedFilters() {
  const [namedFilters, setNamedFilters] = useState<Record<string, DatabaseFilter>>({});
  const [activeFilterName, setActiveFilterName] = useState<string | null>(null);

  const addFilter = useCallback((name: string, filter: DatabaseFilter) => {
    setNamedFilters((prev: Record<string, DatabaseFilter>) => ({
      ...prev,
      [name]: filter,
    }));
  }, []);

  const removeFilter = useCallback(
    (name: string) => {
      setNamedFilters((prev: Record<string, DatabaseFilter>) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });

      if (activeFilterName === name) {
        setActiveFilterName(null);
      }
    },
    [activeFilterName]
  );

  const activateFilter = useCallback(
    (name: string) => {
      if (namedFilters[name]) {
        setActiveFilterName(name);
        return namedFilters[name];
      }
      return null;
    },
    [namedFilters]
  );

  const getActiveFilter = useCallback(() => {
    return activeFilterName ? namedFilters[activeFilterName] : null;
  }, [activeFilterName, namedFilters]);

  return {
    namedFilters,
    activeFilterName,
    addFilter,
    removeFilter,
    activateFilter,
    getActiveFilter,
  };
}
