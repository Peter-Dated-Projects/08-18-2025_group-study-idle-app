"use client";

import { useState, useEffect } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

// Client-side function to store user session via API
async function storeUserSessionAPI(userEmail: string, sessionId: string) {
  try {
    const response = await fetch("/api/auth/store-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId,
        userId: userEmail,
        notionTokens: null,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to store user session");
    }

    return await response.json();
  } catch (error) {
    console.error("Error storing user session:", error);
    throw error;
  }
}

// Generate session ID on client side
function generateSessionId(): string {
  // Use crypto.getRandomValues for client-side random generation
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<{
    userId: string;
    userEmail: string;
    userName: string | null;
    hasNotionTokens: boolean;
  } | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);

      if (user?.email) {
        // Create or update user session in Firestore
        try {
          const newSessionId = generateSessionId();

          await storeUserSessionAPI(user.email, newSessionId);
          setSessionId(newSessionId);

          // Set session data with proper types
          setSessionData({
            userId: user.email,
            userEmail: user.email,
            userName: user.displayName || null,
            hasNotionTokens: false, // Will be updated when Notion is connected
          });

          console.log(`User authenticated: ${user.email} with session: ${newSessionId}`);
        } catch (error) {
          console.error("Error storing user session:", error);
          setSessionData(null);
        }
      } else {
        setSessionId(null);
        setSessionData(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
      // User state will be updated via onAuthStateChanged
    } catch (error) {
      console.error("Error signing in with Google:", error);
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setSessionId(null);
      setSessionData(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return {
    user,
    email: user?.email || null,
    sessionId,
    sessionData,
    isLoading: loading,
    isAuthenticated: !!user,
    isUnauthenticated: !user && !loading,
    signInWithGoogle,
    signOut,
  };
}
