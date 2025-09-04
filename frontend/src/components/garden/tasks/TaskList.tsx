import React, { useRef } from "react";
import { Task, SortMode, CompletionSortMode } from "./types";
import TaskItem from "./TaskItem";
import {
  BORDERFILL,
  FONTCOLOR,
  HeaderFont,
  HOVER_COLOR,
  PANELFILL,
  SUCCESS_COLOR,
} from "../../constants";

interface TaskListProps {
  tasks: Task[];
  editingTaskId: string | null;
  editingText: string;
  taskDetailsSortMode: SortMode;
  completionSortMode: CompletionSortMode;
  onEditingTextChange: (text: string) => void;
  onStartEditing: (task: Task) => void;
  onTaskKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, task: Task, index: number) => void;
  onToggleCompletion: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onTaskDetailsSortClick: () => void;
  onCompletionSortClick: () => void;
  onCreateNewTask: () => void;
  onSaveTaskEdit: (taskId: string, newText: string) => void;
  onCancelEditing: () => void;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  editingTaskRef?: React.RefObject<HTMLTableRowElement | null>;
}

export default function TaskList({
  tasks,
  editingTaskId,
  editingText,
  taskDetailsSortMode,
  completionSortMode,
  onEditingTextChange,
  onStartEditing,
  onTaskKeyDown,
  onToggleCompletion,
  onDeleteTask,
  onTaskDetailsSortClick,
  onCompletionSortClick,
  onCreateNewTask,
  onSaveTaskEdit,
  onCancelEditing,
  scrollContainerRef,
  editingTaskRef,
}: TaskListProps) {
  const internalScrollRef = useRef<HTMLDivElement>(null);
  const internalEditingRef = useRef<HTMLTableRowElement>(null);

  // Use provided refs or fallback to internal ones
  const scrollRef = scrollContainerRef || internalScrollRef;
  const editingRef = editingTaskRef || internalEditingRef;

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
    <div className="flex-1 flex flex-col min-h-0 relative">
      <div
        className="overflow-auto flex-1 hide-scrollbar"
        style={{
          scrollbarWidth: "none", // Firefox
          msOverflowStyle: "none", // IE 10+
        }}
        ref={scrollRef}
      >
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
                onClick={onCompletionSortClick}
                title={`Sort by completion (${completionSortMode})`}
              >
                <div className="flex items-center justify-center gap-1">
                  <i className="fi fi-rr-checkbox text-sm"></i>
                  <i className={`${getSortIcon(completionSortMode)} text-xs opacity-70`}></i>
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
                onClick={onTaskDetailsSortClick}
                title={`Sort by task name (${taskDetailsSortMode})`}
              >
                <div className="flex items-center gap-2">
                  <i className="fi fi-rr-list text-sm"></i>
                  Task Details
                  <i className={`${getSortIcon(taskDetailsSortMode)} text-xs opacity-70`}></i>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task, index) => (
              <TaskItem
                key={task.id}
                ref={editingTaskId === task.id ? editingRef : undefined}
                task={task}
                taskIndex={index}
                isEditing={editingTaskId === task.id}
                editingText={editingText}
                onEditingTextChange={onEditingTextChange}
                onStartEditing={onStartEditing}
                onKeyDown={onTaskKeyDown}
                onToggleCompletion={onToggleCompletion}
                onDelete={onDeleteTask}
                onSaveEdit={onSaveTaskEdit}
                onCancelEdit={onCancelEditing}
              />
            ))}
          </tbody>
        </table>
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
          onClick={onCreateNewTask}
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
  );
}
