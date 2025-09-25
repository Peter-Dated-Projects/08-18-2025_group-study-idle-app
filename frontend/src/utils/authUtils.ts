/**
 * Standardized fetch utility with proper authentication handling
 */

interface APIErrorData {
  code: string;
  message: string;
}

interface FetchJSONOptions extends Omit<RequestInit, "body"> {
  body?: any;
}

export class AuthenticationError extends Error {
  constructor(message: string, public code: string = "UNAUTHENTICATED") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class APIError extends Error {
  constructor(message: string, public code: string, public status: number) {
    super(message);
    this.name = "APIError";
  }
}

/**
 * Standardized fetchJSON with proper auth and error handling
 */
export async function fetchJSON<T = any>(url: string, options: FetchJSONOptions = {}): Promise<T> {
  const { body, headers = {}, ...otherOptions } = options;

  const fetchOptions: RequestInit = {
    credentials: "include", // Essential for cookie-based auth
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    ...otherOptions,
  };

  if (body !== undefined) {
    fetchOptions.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      let errorData: any;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: `HTTP ${response.status}` };
      }

      if (response.status === 401) {
        throw new AuthenticationError(
          errorData.message || errorData.error || "Authentication required",
          errorData.code || "UNAUTHENTICATED"
        );
      }

      throw new APIError(
        errorData.message || errorData.error || `Request failed with status ${response.status}`,
        errorData.code || "API_ERROR",
        response.status
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof APIError) {
      throw error;
    }

    // Network or other errors
    throw new APIError(
      `Network error: ${error instanceof Error ? error.message : "Unknown error"}`,
      "NETWORK_ERROR",
      0
    );
  }
}

/**
 * Check if user is authenticated
 */
export async function checkAuth(): Promise<{
  isAuthenticated: boolean;
  userId?: string;
  userEmail?: string;
}> {
  try {
    const response = await fetchJSON("/api/auth/session");
    return {
      isAuthenticated: response.success,
      userId: response.userId,
      userEmail: response.userEmail,
    };
  } catch (error) {
    return { isAuthenticated: false };
  }
}

/**
 * Trigger authentication flow (redirect to login)
 */
export function triggerAuthFlow(): void {
  // Store current path for post-login redirect
  const currentPath = window.location.pathname + window.location.search;
  sessionStorage.setItem("postLoginRedirect", currentPath);

  // Redirect to login
  window.location.href = "/login";
}
