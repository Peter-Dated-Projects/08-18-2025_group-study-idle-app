import React, { useState } from "react";
import { FONTCOLOR, BORDERLINE, PANELFILL, BORDERFILL } from "../constants";

interface UserProfileProps {
  isVisible: boolean;
  onClose: () => void;
  user: {
    id: string;
    email: string;
    given_name?: string;
    family_name?: string;
  };
}

export default function UserProfile({ isVisible, onClose, user }: UserProfileProps) {
  const [copyMessage, setCopyMessage] = useState("");

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage("Copied!");
      setTimeout(() => setCopyMessage(""), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      setCopyMessage("Failed to copy");
      setTimeout(() => setCopyMessage(""), 2000);
    }
  };

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: PANELFILL,
          border: `3px solid ${BORDERLINE}`,
          borderRadius: "8px",
          width: "400px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            backgroundColor: BORDERFILL,
            borderBottom: `2px solid ${BORDERLINE}`,
            padding: "15px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2 style={{ color: FONTCOLOR, margin: 0, fontSize: "18px", fontWeight: "bold" }}>
            User Profile
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: FONTCOLOR,
              fontSize: "20px",
              cursor: "pointer",
              padding: "5px",
              borderRadius: "4px",
              backgroundColor: BORDERLINE,
            }}
          >
            ✕
          </button>
        </div>

        {/* Profile Content */}
        <div style={{ padding: "30px" }}>
          {/* Profile Picture Placeholder */}
          <div
            style={{
              width: "100px",
              height: "100px",
              backgroundColor: BORDERFILL,
              border: `2px solid ${BORDERLINE}`,
              borderRadius: "50%",
              margin: "0 auto 20px auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "40px",
              color: FONTCOLOR,
            }}
          >
            👤
          </div>

          {/* User Information */}
          <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            {/* Name */}
            <div>
              <label
                style={{
                  display: "block",
                  color: FONTCOLOR,
                  fontSize: "14px",
                  fontWeight: "bold",
                  marginBottom: "5px",
                }}
              >
                Name:
              </label>
              <div
                style={{
                  padding: "8px 12px",
                  backgroundColor: BORDERFILL,
                  border: `1px solid ${BORDERLINE}`,
                  borderRadius: "4px",
                  color: FONTCOLOR,
                  fontSize: "14px",
                }}
              >
                {user.given_name && user.family_name
                  ? `${user.given_name} ${user.family_name}`
                  : "Not specified"}
              </div>
            </div>

            {/* Email */}
            <div>
              <label
                style={{
                  display: "block",
                  color: FONTCOLOR,
                  fontSize: "14px",
                  fontWeight: "bold",
                  marginBottom: "5px",
                }}
              >
                Email:
              </label>
              <div
                style={{
                  padding: "8px 12px",
                  backgroundColor: BORDERFILL,
                  border: `1px solid ${BORDERLINE}`,
                  borderRadius: "4px",
                  color: FONTCOLOR,
                  fontSize: "14px",
                }}
              >
                {user.email}
              </div>
            </div>

            {/* User ID */}
            <div>
              <label
                style={{
                  display: "block",
                  color: FONTCOLOR,
                  fontSize: "14px",
                  fontWeight: "bold",
                  marginBottom: "5px",
                }}
              >
                User ID:
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    backgroundColor: BORDERFILL,
                    border: `1px solid ${BORDERLINE}`,
                    borderRadius: "4px",
                    color: FONTCOLOR,
                    fontSize: "12px",
                    fontFamily: "monospace",
                    wordBreak: "break-all",
                  }}
                >
                  {user.id}
                </div>
                <button
                  onClick={() => copyToClipboard(user.id)}
                  style={{
                    padding: "8px 12px",
                    border: `2px solid ${BORDERLINE}`,
                    borderRadius: "4px",
                    backgroundColor: BORDERLINE,
                    color: FONTCOLOR,
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "bold",
                    minWidth: "60px",
                  }}
                  title="Copy User ID"
                >
                  {copyMessage || "📋"}
                </button>
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: FONTCOLOR,
                  opacity: 0.7,
                  marginTop: "5px",
                }}
              >
                Share this ID with friends so they can add you!
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
