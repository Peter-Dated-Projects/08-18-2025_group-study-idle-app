"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuthAndRedirect();
  }, []);

  const checkAuthAndRedirect = async () => {
    try {
      // Check Google auth
      const authResponse = await fetch("/api/auth/session", {
        credentials: "include",
      });
      const authData = await authResponse.json();

      if (!authResponse.ok || !authData.success || !authData.userEmail) {
        // Not logged in with Google, redirect to login
        router.push("/login");
        return;
      }

      // Check Notion auth
      const notionResponse = await fetch("/api/notion/session", {
        credentials: "include",
      });

      if (!notionResponse.ok) {
        // Notion not connected, redirect to login
        router.push("/login");
        return;
      }

      const notionData = await notionResponse.json();
      if (!notionData.success || !notionData.hasValidTokens) {
        // Notion not connected, redirect to login
        router.push("/login");
        return;
      }

      // Fully authenticated, redirect to garden
      router.push("/garden");
    } catch (error) {
      console.error("Error checking authentication:", error);
      // On error, redirect to login to be safe
      router.push("/login");
    }
  };

  // Show loading while determining where to redirect
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        fontSize: "2rem",
        color: "#333",
        backgroundColor: "#f5f5f5",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <img src="/icon.png" alt="Icon" style={{ width: 60, height: 60, marginBottom: 20 }} />
        <div>Loading...</div>
      </div>
    </div>
  );
}
