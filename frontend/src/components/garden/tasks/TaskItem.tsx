import React, { forwardRef } from "react";
import { Task } from "./types";
import {
  BORDERFILL,
  FONTCOLOR,
  SECONDARY_TEXT,
  SUCCESS_COLOR,
  ERROR_COLOR,
  ACCENT_COLOR,
  BodyFont,
  HOVER_COLOR,
} from "../../constants";

interface TaskItemProps {
  task: Task;
  isEditing: boolean;
  editingText: string;
  onEditingTextChange: (text: string) => void;
  onStartEditing: (task: Task) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, task: Task, index: number) => void;
  onToggleCompletion: (task: Task) => void;
  onDelete: (task: Task) => void;
  onSaveEdit: (taskId: string, newText: string) => void;
  onCancelEdit: () => void;
  taskIndex: number;
}

const TaskItem = forwardRef<HTMLTableRowElement, TaskItemProps>(
  (
    {
      task,
      isEditing,
      editingText,
      onEditingTextChange,
      onStartEditing,
      onKeyDown,
      onToggleCompletion,
      onDelete,
      onSaveEdit,
      onCancelEdit,
      taskIndex,
    },
    ref
  ) => {
    return (
      <tr
        key={task.id}
        ref={ref}
        className={`group cursor-pointer transition-all duration-200`}
        style={{
          backgroundColor: isEditing ? ACCENT_COLOR + "20" : "white", // Light accent color for selected
          borderBottom: `1px solid ${BORDERFILL}`,
        }}
        onMouseEnter={(e) => {
          if (!isEditing) {
            e.currentTarget.style.backgroundColor = HOVER_COLOR;
          }
        }}
        onMouseLeave={(e) => {
          if (!isEditing) {
            e.currentTarget.style.backgroundColor = "white";
          }
        }}
      >
        <td
          className="p-2 text-center"
          style={{ borderRight: `1px solid ${BORDERFILL}`, width: "60px" }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleCompletion(task);
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
            onStartEditing(task);
          }}
        >
          <div
            className="flex items-center"
            style={{ paddingLeft: `${(task.indent || 0) * 20}px` }}
          >
            {isEditing ? (
              <input
                type="text"
                value={editingText}
                onChange={(e) => onEditingTextChange(e.target.value)}
                onBlur={() => {
                  onSaveEdit(task.id, editingText);
                  onCancelEdit();
                }}
                onKeyDown={(e) => onKeyDown(e, task, taskIndex)}
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
                onDelete(task);
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
    );
  }
);

TaskItem.displayName = "TaskItem";

export default TaskItem;
