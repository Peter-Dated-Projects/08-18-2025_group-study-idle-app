"use client";

import { useState, useEffect, useCallback } from "react";
import { HeaderFont, googleSVG } from "@/components/constants";

// Helper function to extract plain text from Notion rich text objects
const extractPlainText = (richTextArray: Array<{ plain_text?: string }>): string => {
  if (!richTextArray || !Array.isArray(richTextArray)) {
    return "";
  }
  return richTextArray.map((textObj) => textObj.plain_text || "").join("");
};

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [databaseSynced, setDatabaseSynced] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google Auth state
  const [isGoogleSignedIn, setIsGoogleSignedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [previousEmail, setPreviousEmail] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [hasProcessedRedirect, setHasProcessedRedirect] = useState(false);
  const [justAuth, setJustAuth] = useState(false);

  // Notion Database states
  const [isNotionConnected, setIsNotionConnected] = useState(false);

  // Redirect to garden when fully authenticated
  useEffect(() => {
    if (isGoogleSignedIn && isNotionConnected && databaseSynced) {
      window.location.href = "/garden";
    }
  }, [isGoogleSignedIn, isNotionConnected, databaseSynced]);

  // Handle OAuth redirect success
  useEffect(() => {
    // Only process redirect once
    if (hasProcessedRedirect) return;

    const urlParams = new URLSearchParams(window.location.search);
    const authSuccess = urlParams.get("auth");
    const authError = urlParams.get("error");

    // if auth not in URL, perform basic check
    if (!authSuccess && !authError) {
      checkUserSession().finally(() => {
        setIsLoading(false);
      });
      return;
    }

    if (authSuccess === "success") {
      setHasProcessedRedirect(true);
      setJustAuth(true);

      // Check auth status and reload user data
      setIsLoading(true);
      checkUserSession().finally(() => {
        setIsLoading(false);
      });
    } else if (authError) {
      setHasProcessedRedirect(true);
      setError(`Authentication failed: ${decodeURIComponent(authError)}`);
    }
  }, [hasProcessedRedirect]);

  // Load databases when Notion is connected
  useEffect(() => {
    if (isNotionConnected) {
      checkSessionsDatabaseStatus();
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
        setUserName(data.userName ?? null); // Use nullish coalescing to handle undefined
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

  const checkNotionStatus = async () => {
    try {
      // Check if notion logged in
      const response = await fetch("/api/notion/session", {
        credentials: "include",
      });

      if (!response.ok) {
        setIsNotionConnected(false);
        // not a first time attempt to verify status
        if (!justAuth) {
          setError("Notion session confirmation failed.");
        }
        return;
      }

      const data = await response.json();
      if (!data.success || !data.hasValidTokens) {
        setIsNotionConnected(false);
        if (!justAuth) {
          setError("Failed to confirm Notion auth. Please try reconnecting.");
          return;
        }
        console.warn("Notion is not connected or tokens are invalid.");
        return;
      }

      // Check if duplicate block value exists
      if (!data.duplicatedBlockId) {
        setError(
          "You may have not used the Notion Template Provided. Please reconnect your Notion account."
        );
        setIsNotionConnected(false);
        return;
      }

      // If all checks pass, set the notion connection and database sync status
      setIsNotionConnected(true);
    } catch (error) {
      console.error("Error checking auth status:", error);
      setIsNotionConnected(false);
      setDatabaseSynced(false);
    }
  };

  const checkSessionsDatabaseStatus = async () => {
    const sessionCheck = async () => {
      // Check if the stored session_database_id is valid but in garbage or archived
      try {
        const response = await fetch("/api/notion/storage/verify");
        const responseData = await response.json();

        if (!response.ok) {
          console.warn("/api/notion/storage/verify: Notion database verification failed");

          setDatabaseSynced(false);
          setIsNotionConnected(false);

          // check if first time login
          if (responseData.showError !== false) {
            setError(responseData.error || "Failed to verify Notion database.");
          }
          return;
        }

        setDatabaseSynced(true);
      } catch (error) {
        console.error("/api/notion/storage/verify: Error verifying Notion database:", error);
        setDatabaseSynced(false);
        return;
      }
    };

    let attemptCount = 0;
    const maxAttempts = 5;
    const retryDelay = 1000; // 3 seconds

    const interval = setInterval(async () => {
      attemptCount++;
      await sessionCheck();

      if (databaseSynced || attemptCount >= maxAttempts) {
        clearInterval(interval);
        setIsLoading(false);
      }
    }, retryDelay);

    return () => clearInterval(interval);
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      setError(null);

      // Use redirect-based OAuth instead of popup
      const returnUrl = encodeURIComponent(window.location.href);
      window.location.href = `/api/gauth/start?returnUrl=${returnUrl}`;

      // Note: The page will redirect, so this code won't continue
    } catch (error: unknown) {
      console.error("Google sign-in error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      setError(`Failed to start Google sign-in: ${errorMessage}`);
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
    } catch (error: unknown) {
      console.error("Notion sign-in error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      setError(`Failed to start Notion sign-in: ${errorMessage}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-gray-700 text-3xl tracking-wide">
        Loading...
      </div>
    );
  }

  let stepContent;
  if (!isGoogleSignedIn) {
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
    stepContent = (
      <div className="text-center p-10 pb-15">
        <h2 className="mb-5 text-2xl text-gray-700">Step 2: Connect to Notion</h2>
        <p className="mb-2.5 text-gray-700">Welcome, {userName || userEmail}!</p>
        <div className="flex justify-center mt-5">
          <div className="text-left w-1/2">
            <p className="mb-5 text-gray-700">
              When connecting your Notion Database, please use the template provided!
              <br />
              <br />
              <strong>1.</strong> Notion will provide a template page.
              <br />
              <strong>2.</strong> Select the template page.
              <br />
              <strong>3.</strong> Follow the prompts to complete the setup.
            </p>
          </div>
        </div>
        <button
          onClick={() => handleNotionLogin()}
          className="inline-block bg-black text-white px-6 py-3 rounded-lg font-bold cursor-pointer transition-colors hover:bg-gray-900"
        >
          Connect to Notion
        </button>
      </div>
    );
  } else {
    stepContent = (
      <div className="text-center p-5">
        <h2 className="mb-5 text-2xl text-gray-700">Step 3: Sync Sessions Database with Notion</h2>
        <p className="mb-2.5 text-gray-700">Welcome, {userName || userEmail}!</p>
        {!databaseSynced ? (
          <div className="flex flex-col items-center justify-center min-h-[120px]">
            <svg
              className="animate-spin h-8 w-8 text-gray-400 mb-3"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              ></path>
            </svg>
            <span className="text-gray-500 text-base">Syncing database with Notion...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <p className="mb-5 text-gray-700">Database synced successfully!</p>
            <p className="text-gray-500 text-sm">Redirecting...</p>
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
