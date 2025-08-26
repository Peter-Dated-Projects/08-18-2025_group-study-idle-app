"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  const handleLoginClick = () => {
    router.push("/login");
  };

  // Show welcome page with login button if not authenticated
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        backgroundColor: "#f5f5f5",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          textAlign: "center",
          maxWidth: "400px",
          padding: "2rem",
          backgroundColor: "white",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
        }}
      >
        <img
          src="/icon.png"
          alt="App Icon"
          style={{
            width: 80,
            height: 80,
            marginBottom: 24,
            borderRadius: "12px",
          }}
        />
        <h1
          style={{
            fontSize: "2rem",
            color: "#333",
            marginBottom: "1rem",
            fontWeight: "600",
          }}
        >
          Welcome to Garden Study
        </h1>
        <p
          style={{
            fontSize: "1.1rem",
            color: "#666",
            marginBottom: "2rem",
            lineHeight: "1.5",
          }}
        >
          Transform your productivity with an interactive garden that grows with your tasks and
          achievements.
        </p>
        <button
          onClick={handleLoginClick}
          style={{
            fontSize: "1.1rem",
            padding: "12px 32px",
            backgroundColor: "#4285f4",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "500",
            transition: "background-color 0.2s ease",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = "#3367d6";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = "#4285f4";
          }}
        >
          Get Started
        </button>
      </div>
    </div>
  );
}
