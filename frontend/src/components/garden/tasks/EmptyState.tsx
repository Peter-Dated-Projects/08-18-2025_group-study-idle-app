import React from "react";
import { StudySession } from "./types";
import { FONTCOLOR, ACCENT_COLOR, SECONDARY_TEXT, HeaderFont, BodyFont } from "../../constants";

interface EmptyStateProps {
  selectedSession: StudySession | null;
  onCreateNewTask: () => void;
}

export default function EmptyState({ selectedSession, onCreateNewTask }: EmptyStateProps) {
  if (!selectedSession) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center text-center py-12 text-gray-500 min-h-0">
        <div className="text-4xl mb-3">📚</div>
        <p className="text-sm">Select a study session to view tasks</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-center items-center text-center py-16 min-h-0">
      <div className="text-6xl mb-4">📝</div>
      <h3 className="text-xl font-medium mb-3" style={{ fontFamily: HeaderFont, color: FONTCOLOR }}>
        No tasks yet!
      </h3>
      <p className="text-sm mb-6 max-w-md" style={{ color: SECONDARY_TEXT, fontFamily: BodyFont }}>
        This study session doesn&apos;t have any tasks yet. Create your first task to get started
        with your study goals.
      </p>
      <button
        onClick={onCreateNewTask}
        className="px-6 py-2 rounded transition-all"
        style={{
          backgroundColor: ACCENT_COLOR,
          color: "white",
          fontFamily: BodyFont,
          fontSize: "14px",
          fontWeight: "500",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(64, 181, 173, 0.3)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        Create First Task
      </button>
      {selectedSession.notionUrl && (
        <p className="text-xs mt-4" style={{ color: SECONDARY_TEXT, fontFamily: BodyFont }}>
          Or{" "}
          <a
            href={selectedSession.notionUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: ACCENT_COLOR }}
            className="hover:underline"
          >
            open in Notion
          </a>{" "}
          to add tasks there
        </p>
      )}
    </div>
  );
}
