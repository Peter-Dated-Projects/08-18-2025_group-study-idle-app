import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserSession } from "@/lib/firestore";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function PUT(request: NextRequest) {
  try {
    // Get the correct session cookies
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;
    const userSessionId = cookieStore.get("user_session")?.value;

    if (!userId || !userSessionId) {
      return NextResponse.json(
        {
          code: "UNAUTHENTICATED",
          message: "Authentication required. Please log in.",
        },
        { status: 401 }
      );
    }

    // Verify the session is valid
    const session = await getUserSession(userId);
    if (!session || session.sessionId !== userSessionId) {
      // Clear invalid cookies
      cookieStore.delete("user_session");
      cookieStore.delete("user_id");

      return NextResponse.json(
        {
          code: "UNAUTHENTICATED",
          message: "Session invalid or expired. Please log in again.",
        },
        { status: 401 }
      );
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      cookieStore.delete("user_session");
      cookieStore.delete("user_id");

      return NextResponse.json(
        {
          code: "UNAUTHENTICATED",
          message: "Session expired. Please log in again.",
        },
        { status: 401 }
      );
    }

    // Get the request body
    const body = await request.json();

    // Forward the request to the backend with the actual user ID
    const response = await fetch(`${BACKEND_URL}/api/inventory/${userId}/bulk`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        {
          code: "BACKEND_ERROR",
          message: errorData.detail || "Failed to bulk update inventory",
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in bulk inventory update:", error);
    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}
