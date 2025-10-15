import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { fetchWithTokenRefresh } from "@/lib/notion-token-refresh";

/**
 * Test endpoint to verify automatic token refresh functionality
 * This endpoint will attempt to make a simple Notion API call and should
 * automatically refresh the token if it's expired.
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Make a simple API call that should trigger refresh if token is expired
    const response = await fetchWithTokenRefresh(userId, "https://api.notion.com/v1/users/me", {
      method: "GET",
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json({
        success: false,
        error: "API call failed",
        details: error,
        status: response.status,
      });
    }

    const userData = await response.json();

    return NextResponse.json({
      success: true,
      message: "Token refresh test completed successfully",
      user: userData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Token refresh test failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Token refresh test failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
