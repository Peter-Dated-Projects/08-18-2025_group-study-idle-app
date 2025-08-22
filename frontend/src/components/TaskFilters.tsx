"use client";

import React, { useState, useEffect } from "react";
import { useNotionFilters, useFilterBuilder } from "@/hooks/useNotionFilters";
import { DatabaseFilter, NotionFilterBuilder, CommonFilters } from "@/lib/notion-filters";

interface TaskFiltersProps {
  onFilterChange?: (filter: DatabaseFilter | null) => void;
  className?: string;
}

export default function TaskFilters({ onFilterChange, className = "" }: TaskFiltersProps) {
  const {
    filterOptions,
    isLoadingFilters,
    currentFilter,
    setFilter,
    resetFilter,
    applyCommonFilter,
    loadFilterOptions,
    error,
  } = useNotionFilters();

  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterValue, setFilterValue] = useState<string>("");
  const [customBuilderMode, setCustomBuilderMode] = useState<boolean>(false);

  const { builder, buildFilter, reset } = useFilterBuilder();

  // Load filter options when component mounts
  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  // Notify parent component when filter changes
  useEffect(() => {
    if (onFilterChange) {
      onFilterChange(currentFilter);
    }
  }, [currentFilter, onFilterChange]);

  // Quick filter buttons for common patterns
  const quickFilters = [
    {
      label: "Incomplete Tasks",
      action: () => {
        const completedProp = filterOptions.find(
          (opt) =>
            opt.name.toLowerCase().includes("completed") || opt.name.toLowerCase().includes("done")
        );
        if (completedProp) {
          applyCommonFilter("incomplete", completedProp.property);
        }
      },
    },
    {
      label: "Due Soon",
      action: () => {
        const dueProp = filterOptions.find(
          (opt) => opt.name.toLowerCase().includes("due") || opt.name.toLowerCase().includes("date")
        );
        if (dueProp) {
          applyCommonFilter("dueSoon", dueProp.property);
        }
      },
    },
    {
      label: "High Priority",
      action: () => {
        const priorityProp = filterOptions.find((opt) =>
          opt.name.toLowerCase().includes("priority")
        );
        if (priorityProp) {
          applyCommonFilter("priority", priorityProp.property, "High");
        }
      },
    },
    {
      label: "Recently Created",
      action: () => applyCommonFilter("recentlyCreated"),
    },
  ];

  // Handle manual filter creation
  const handleCreateFilter = () => {
    if (!selectedProperty || !filterType || !filterValue) return;

    const property = filterOptions.find((opt) => opt.property === selectedProperty);
    if (!property) return;

    const builder = new NotionFilterBuilder();

    switch (property.type) {
      case "checkbox":
        builder.checkboxEquals(selectedProperty, filterValue === "true");
        break;
      case "select":
        if (filterType === "equals") {
          builder.selectEquals(selectedProperty, filterValue);
        } else if (filterType === "does_not_equal") {
          builder.selectDoesNotEqual(selectedProperty, filterValue);
        }
        break;
      case "multi_select":
        builder.multiSelectContains(selectedProperty, filterValue);
        break;
      case "rich_text":
        if (filterType === "contains") {
          builder.textContains(selectedProperty, filterValue);
        } else if (filterType === "equals") {
          builder.textEquals(selectedProperty, filterValue);
        }
        break;
      case "title":
        builder.titleContains(selectedProperty, filterValue);
        break;
      case "number":
        const numValue = parseFloat(filterValue);
        if (filterType === "equals") {
          builder.numberEquals(selectedProperty, numValue);
        } else if (filterType === "greater_than") {
          builder.numberGreaterThan(selectedProperty, numValue);
        } else if (filterType === "less_than") {
          builder.numberLessThan(selectedProperty, numValue);
        }
        break;
      case "date":
        if (filterType === "after") {
          builder.dateAfter(selectedProperty, filterValue);
        } else if (filterType === "before") {
          builder.dateBefore(selectedProperty, filterValue);
        } else if (filterType === "equals") {
          builder.dateEquals(selectedProperty, filterValue);
        }
        break;
    }

    const filter = builder.build();
    if (filter) {
      setFilter(filter);
    }
  };

  // Clear all filters
  const handleClearFilters = () => {
    resetFilter();
    setSelectedProperty("");
    setFilterType("");
    setFilterValue("");
    reset();
  };

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-md p-4 ${className}`}>
        <p className="text-red-600 text-sm">Error loading filters: {error}</p>
        <button
          onClick={() => loadFilterOptions()}
          className="mt-2 text-red-600 underline text-sm hover:text-red-800"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Task Filters</h3>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          {quickFilters.map((filter, index) => (
            <button
              key={index}
              onClick={filter.action}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
              disabled={isLoadingFilters}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Custom Filter Builder Toggle */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setCustomBuilderMode(!customBuilderMode)}
            className="text-sm text-gray-600 hover:text-gray-800 underline"
          >
            {customBuilderMode ? "Hide" : "Show"} Custom Filter Builder
          </button>
        </div>

        {/* Custom Filter Builder */}
        {customBuilderMode && (
          <div className="space-y-3 p-3 bg-gray-50 rounded-md">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Property Selection */}
              <select
                value={selectedProperty}
                onChange={(e) => setSelectedProperty(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoadingFilters}
              >
                <option value="">Select Property</option>
                {filterOptions.map((option) => (
                  <option key={option.property} value={option.property}>
                    {option.name} ({option.type})
                  </option>
                ))}
              </select>

              {/* Filter Type Selection */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!selectedProperty}
              >
                <option value="">Select Filter Type</option>
                <option value="equals">Equals</option>
                <option value="does_not_equal">Does Not Equal</option>
                <option value="contains">Contains</option>
                <option value="greater_than">Greater Than</option>
                <option value="less_than">Less Than</option>
                <option value="after">After</option>
                <option value="before">Before</option>
              </select>

              {/* Filter Value Input */}
              {selectedProperty && filterType && (
                <input
                  type="text"
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  placeholder="Filter value"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleCreateFilter}
                disabled={!selectedProperty || !filterType || !filterValue}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
              >
                Apply Filter
              </button>
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
              >
                Clear All
              </button>
            </div>
          </div>
        )}

        {/* Current Filter Display */}
        {currentFilter && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Active Filter:</h4>
            <pre className="text-xs text-blue-700 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(currentFilter, null, 2)}
            </pre>
            <button
              onClick={() => setFilter(null)}
              className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Remove Filter
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoadingFilters && (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <p className="text-sm text-gray-600 mt-2">Loading filter options...</p>
          </div>
        )}
      </div>
    </div>
  );
}
