import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserSession, NotionTokenData } from "@/lib/firestore";

interface NotionApiOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: Record<string, unknown>;
  endpoint: string;
}

interface NotionApiResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  status?: number;
  needsReauth?: boolean;
}

/**
 * Make an authenticated request to the Notion API using stored tokens
 * Automatically handles token expiration and prompts for re-authentication
 */
export async function makeNotionApiRequest(options: NotionApiOptions): Promise<NotionApiResult> {
  try {
    // Get user session from cookie
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("user_session")?.value;

    if (!sessionId) {
      return {
        success: false,
        error: "No session found",
        status: 401,
        needsReauth: true,
      };
    }

    // Get user session with tokens
    const session = await getUserSession(sessionId);

    if (!session) {
      return {
        success: false,
        error: "Invalid session",
        status: 401,
        needsReauth: true,
      };
    }

    // Check if session is expired
    if (session.expires_at < new Date()) {
      return {
        success: false,
        error: "Session expired",
        status: 401,
        needsReauth: true,
      };
    }

    // Check if we have Notion tokens
    if (!session.notionTokens) {
      return {
        success: false,
        error: "No Notion authentication found. Please connect your Notion account.",
        status: 401,
        needsReauth: true,
      };
    }

    // Decrypt the tokens (they're stored encrypted in Firestore)
    const { simpleDecrypt } = await import("@/lib/firestore");
    const accessToken = simpleDecrypt(session.notionTokens.access_token);

    // Make the Notion API request
    const requestOptions: RequestInit = {
      method: options.method || "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
    };

    if (options.body && (options.method === "POST" || options.method === "PATCH")) {
      requestOptions.body = JSON.stringify(options.body);
    }

    const response = await fetch(`https://api.notion.com/v1/${options.endpoint}`, requestOptions);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      // Check if it's an authentication error (token expired/invalid)
      if (response.status === 401) {
        return {
          success: false,
          error: "Notion token expired. Please reconnect your Notion account.",
          status: 401,
          needsReauth: true,
        };
      }

      return {
        success: false,
        error: errorData.message || `Notion API error: ${response.status}`,
        status: response.status,
        data: errorData,
      };
    }

    const data = await response.json();
    return {
      success: true,
      data,
      status: response.status,
    };
  } catch (error) {
    console.error("Error making Notion API request:", error);
    return {
      success: false,
      error: "Internal server error",
      status: 500,
    };
  }
}

/**
 * Helper to create a standardized response for Notion API endpoints
 */
export function createNotionApiResponse(result: NotionApiResult): NextResponse {
  if (!result.success) {
    return NextResponse.json(
      {
        error: result.error,
        needsReauth: result.needsReauth,
      },
      { status: result.status || 500 }
    );
  }

  return NextResponse.json(result.data);
}
