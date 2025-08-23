"use client";

import { useState, useEffect, useCallback } from "react";
import { HeaderFont, googleSVG } from "@/components/constants";

export const AUTH_TOKEN_KEY = "auth_token";

// Helper function to extract plain text from Notion rich text objects
const extractPlainText = (richTextArray: any): string => {
  if (!richTextArray || !Array.isArray(richTextArray)) {
    return "";
  }
  return richTextArray.map((textObj: any) => textObj.plain_text || "").join("");
};

interface NotionDatabase {
  id: string;
  title: any[]; // Rich text array from Notion API
  url?: string;
  created_time?: string;
  last_edited_time?: string;
}

interface SelectedDatabase {
  id: string;
  title: string;
  selectedAt: string;
}

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [databases, setDatabases] = useState<NotionDatabase[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<SelectedDatabase | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Google Auth state
  const [isGoogleSignedIn, setIsGoogleSignedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [previousEmail, setPreviousEmail] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [hasProcessedRedirect, setHasProcessedRedirect] = useState(false);

  // Notion Database states
  const [isNotionConnected, setIsNotionConnected] = useState(false);

  // Check session on component mount
  useEffect(() => {
    checkUserSession().finally(() => {
      setIsLoading(false);
    });
  }, []);

  // Handle OAuth redirect success
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authSuccess = urlParams.get("auth");
    const authError = urlParams.get("error");

    // Only process redirect once
    if (hasProcessedRedirect) return;

    if (authSuccess === "success") {
      setHasProcessedRedirect(true);

      // Clear URL parameters immediately to prevent multiple processing
      const url = new URL(window.location.href);
      url.search = ""; // Clear all search parameters
      window.history.replaceState({}, "", url.toString());

      // Check auth status and reload user data
      setIsLoading(true);
      checkUserSession().finally(() => {
        setIsLoading(false);
      });
    } else if (authError) {
      setHasProcessedRedirect(true);
      setError(`Authentication failed: ${decodeURIComponent(authError)}`);

      // Clear URL parameters
      const url = new URL(window.location.href);
      url.search = ""; // Clear all search parameters
      window.history.replaceState({}, "", url.toString());
    }
  }, [hasProcessedRedirect]);

  // Redirect to garden when fully authenticated
  useEffect(() => {
    if (isGoogleSignedIn && isNotionConnected && selectedDatabase) {
      window.location.href = "/garden";
    }
  }, [isGoogleSignedIn, isNotionConnected, selectedDatabase]);

  // Load databases when Notion is connected
  useEffect(() => {
    if (isNotionConnected) {
      loadDatabases();
    }
  }, [isNotionConnected]);

  // Check user session from server
  const checkUserSession = async () => {
    try {
      // Check if user is authed
      const response = await fetch("/api/auth/session", {
        credentials: "include",
      });
      const data = await response.json();
      if (response.ok && data.success && data.userEmail) {
        setIsGoogleSignedIn(true);
        setUserEmail(data.userEmail);
        setUserName(data.userName || null);
        setPreviousEmail(null); // Clear previous email since we have an active session

        // Check notion status
        await checkNotionStatus();
      } else {
        // No active session, but check if we have a previous email
        if (data.previousEmail) {
          setPreviousEmail(data.previousEmail);
        }
      }
    } catch (error) {
      console.error("Error checking user session:", error);
    }
  };

  const checkNotionStatus = useCallback(async () => {
    try {
      // Check if notion logged in
      const response = await fetch("/api/notion/session", {
        credentials: "include",
      });

      //   console.log(response);

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.hasValidTokens) {
          setIsNotionConnected(true);
          setIsLoading(false);

          console.log("/api/notion/session:", "Notion tokens found:", data.hasValidTokens);
        } else {
          setIsNotionConnected(false);
        }
      } else {
        setIsNotionConnected(false);
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      setIsNotionConnected(false);
    }
  }, [isGoogleSignedIn]);

  const loadDatabases = async () => {
    try {
      setError(null);
      const response = await fetch("/api/notion/databases", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setDatabases(data.databases || []);
      } else {
        const errorData = await response.json();

        // Handle token expiration specifically
        if (errorData.needsReauth) {
          setError("Your Notion connection has expired. Please reconnect your account.");
          setIsNotionConnected(false);
        } else {
          setError(errorData.error || "Failed to load databases");
        }
      }
    } catch (err) {
      console.error("Error loading databases:", err);
      setError("Failed to load databases");
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      setError(null);

      // Use redirect-based OAuth instead of popup
      const returnUrl = encodeURIComponent(window.location.href);
      window.location.href = `/api/gauth/start?returnUrl=${returnUrl}`;

      // Note: The page will redirect, so this code won't continue
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      setError(`Failed to start Google sign-in: ${error.message}`);
      setIsSigningIn(false);
    }
  };

  // Handle notion login
  const handleNotionLogin = async () => {
    try {
      setError(null);

      // Use redirect-based OAuth instead of popup
      const returnUrl = encodeURIComponent(window.location.href);
      window.location.href = `/api/notion/start?returnUrl=${returnUrl}`;

      // Note: The page will redirect, so this code won't continue
    } catch (error: any) {
      console.error("Notion sign-in error:", error);
      setError(`Failed to start Notion sign-in: ${error.message}`);
    }
  };

  const handleSelectDatabase = async (database: NotionDatabase) => {
    try {
      const plainTitle = extractPlainText(database.title);

      // Call the API endpoint to update the selected database
      const response = await fetch("/api/notion/databases/select", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          id: database.id,
          title: plainTitle,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to select database");
      }

      const data = await response.json();
      console.log("Database selected:", data);

      // Set selected database state
      setSelectedDatabase({
        id: database.id,
        title: plainTitle,
        selectedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Error selecting database:", err);
      setError("Failed to select database");
    }
  };

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-gray-700 text-3xl tracking-wide">
        Loading...
      </div>
    );
  }

  let stepContent;
  if (!isGoogleSignedIn) {
    // Step 1: Google Authentication
    stepContent = (
      <div className="text-center p-5">
        <h2 className="mb-5 text-2xl text-gray-700">Step 1: Sign in with Google</h2>
        {previousEmail ? (
          <>
            <p className="mb-2.5 text-gray-700">
              Welcome back! Continue as <strong>{previousEmail}</strong>?
            </p>
            <p className="mb-5 text-sm text-gray-500">
              Your session has expired. Sign in again to continue.
            </p>
          </>
        ) : (
          <p className="mb-5 text-gray-700">
            Sign in with Google to access your tasks and sync with Notion!
          </p>
        )}
        <div className="mt-4 text-center">
          <button
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            className={`inline-flex items-center justify-center gap-2 bg-gray-200 text-white px-6 py-3 rounded-lg font-bold transition-opacity border border-gray-300 shadow-[0_0_2px_#000] ${
              isSigningIn ? "opacity-70 cursor-not-allowed" : "hover:bg-blue-700"
            }`}
          >
            {googleSVG}
            {isSigningIn ? "Signing in..." : previousEmail ? "Continue" : "Sign in with Google"}
          </button>
          {previousEmail && (
            <p className="mt-2.5 text-xs text-gray-500">
              Or{" "}
              <button
                onClick={() => {
                  setPreviousEmail(null);
                  handleGoogleSignIn();
                }}
                className="bg-transparent border-0 text-blue-500 underline cursor-pointer text-xs p-0"
              >
                sign in with a different account
              </button>
            </p>
          )}
        </div>
      </div>
    );
  } else if (!isNotionConnected) {
    // Step 2: Notion Authentication
    stepContent = (
      <div className="text-center p-5">
        <h2 className="mb-5 text-2xl text-gray-700">Step 2: Connect to Notion</h2>
        <p className="mb-2.5 text-gray-700">Welcome, {userName || userEmail}!</p>
        <p className="mb-5 text-gray-700">Now connect your Notion workspace to sync tasks!</p>
        <button
          onClick={() => handleNotionLogin()}
          className="inline-block bg-black text-white px-6 py-3 rounded-lg font-bold cursor-pointer transition-colors hover:bg-gray-900"
        >
          Connect to Notion
        </button>
        <p className="mt-4 text-sm text-gray-500">
          After connecting, you will be able to sync your tasks between Google and Notion.
        </p>
      </div>
    );
  } else {
    // Step 3: Database Selection
    stepContent = (
      <div className="text-center p-5">
        <h2 className="mb-5 text-2xl text-gray-700">Step 3: Select a Database</h2>
        <p className="mb-2.5 text-gray-700">Welcome, {userName || userEmail}!</p>
        <p className="mb-5 text-gray-700">Choose a Notion database to sync your tasks with:</p>

        <div className="overflow-auto pr-2 max-h-96">
          {databases.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              {databases.map((db: NotionDatabase) => (
                <div
                  key={db.id}
                  onClick={() => handleSelectDatabase(db)}
                  className={`p-3 border border-gray-300 rounded-md cursor-pointer transition-colors hover:bg-gray-100 ${
                    selectedDatabase?.id === db.id ? "bg-blue-50" : "bg-gray-50"
                  }`}
                >
                  <div className="font-bold mb-1 text-gray-700">{extractPlainText(db.title)}</div>
                  <div className="text-xs text-gray-500">ID: {db.id}</div>
                  {db.url && (
                    <div className="text-xs text-gray-500 mt-1">
                      <a
                        href={db.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View in Notion
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 italic">Loading databases...</div>
          )}
        </div>

        {selectedDatabase && (
          <div className="mt-5 p-3 bg-green-50 rounded-md text-sm text-gray-700">
            <strong>Selected:</strong> {selectedDatabase.title}
            <br />
            <small>Redirecting to garden...</small>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex flex-col items-center justify-center min-h-screen p-5">
        <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full overflow-hidden">
          <div className="flex items-center justify-center py-7 px-5 pb-5 border-b border-gray-200">
            <img src="/icon.png" alt="Icon" className="w-10 h-10 mr-3" />
            <h1
              className="text-3xl font-bold text-gray-800 m-0"
              style={{
                fontFamily: HeaderFont,
              }}
            >
              Garden Setup
            </h1>
          </div>

          {stepContent}
        </div>
        {/* Floating Error Card */}
        {error && (
          <div className="fixed bottom-5 left-1/2 transform -translate-x-1/2 bg-red-50 border-2 border-red-200 rounded-xl px-5 py-4 text-red-600 text-sm font-medium shadow-xl z-50 max-w-[90vw] min-w-[300px] text-center animate-[slideUp_0.3s_ease-out]">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="bg-transparent border-none text-red-600 text-lg font-bold cursor-pointer ml-3 hover:text-red-800"
              >
                ×
              </button>
            </div>
          </div>
        )}{" "}
        <style jsx>{`
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateX(-50%) translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateX(-50%) translateY(0);
            }
          }
        `}</style>
      </div>
    </div>
  );
}
