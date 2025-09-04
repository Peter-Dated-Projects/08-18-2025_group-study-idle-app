import React from "react";
import { Task, SortMode, CompletionSortMode } from "./types";
import { FONTCOLOR, HOVER_COLOR, BodyFont } from "../../constants";

interface TaskSortingProps {
  taskDetailsSortMode: SortMode;
  completionSortMode: CompletionSortMode;
  onTaskDetailsSortClick: () => void;
  onCompletionSortClick: () => void;
}

export default function TaskSorting({
  taskDetailsSortMode,
  completionSortMode,
  onTaskDetailsSortClick,
  onCompletionSortClick,
}: TaskSortingProps) {
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

  return (
    <thead>
      <tr style={{ backgroundColor: "transparent" }}>
        <th style={{ width: "32px", padding: "8px 4px", textAlign: "center" }}>
          <button
            onClick={onCompletionSortClick}
            className="p-1 rounded hover:bg-opacity-20 transition-colors"
            style={{
              color: FONTCOLOR,
              backgroundColor: "transparent",
              fontFamily: BodyFont,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = HOVER_COLOR;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
            title="Sort by completion status"
          >
            <i className={getSortIcon(completionSortMode)} style={{ fontSize: "14px" }}></i>
          </button>
        </th>
        <th
          style={{
            padding: "8px 12px",
            textAlign: "left",
            color: FONTCOLOR,
            fontFamily: BodyFont,
            fontSize: "14px",
            fontWeight: "600",
          }}
        >
          <button
            onClick={onTaskDetailsSortClick}
            className="flex items-center gap-2 p-1 rounded hover:bg-opacity-20 transition-colors"
            style={{
              color: FONTCOLOR,
              backgroundColor: "transparent",
              fontFamily: BodyFont,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = HOVER_COLOR;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            Task Details
            <i className={getSortIcon(taskDetailsSortMode)} style={{ fontSize: "12px" }}></i>
          </button>
        </th>
        <th style={{ width: "80px", padding: "8px 4px", textAlign: "center" }}>
          <span
            style={{
              color: FONTCOLOR,
              fontFamily: BodyFont,
              fontSize: "14px",
              fontWeight: "600",
            }}
          >
            Actions
          </span>
        </th>
      </tr>
    </thead>
  );
}
