import React from "react";
import { FONTCOLOR } from "../../constants";

export default function Instructions() {
  return (
    <div style={{ color: FONTCOLOR, padding: "10px", fontSize: "14px", lineHeight: "1.5" }}>
      <h3 style={{ marginBottom: "15px", fontWeight: "bold", fontSize: "16px" }}>
        How to use Study Garden:
      </h3>
      <ol style={{ paddingLeft: "20px", listStyle: "decimal" }}>
        <li style={{ marginBottom: "8px" }}>Log into Google</li>
        <li style={{ marginBottom: "8px" }}>Log into Notion</li>
        <li style={{ marginBottom: "8px" }}>Create a Session</li>
        <li style={{ marginBottom: "8px" }}>Create a Task</li>
        <li style={{ marginBottom: "8px" }}>Finish your task in real life</li>
        <li style={{ marginBottom: "8px" }}>Repeat!</li>
        <li style={{ marginBottom: "8px", fontWeight: "bold" }}>and watch your garden grow</li>
      </ol>
    </div>
  );
}
