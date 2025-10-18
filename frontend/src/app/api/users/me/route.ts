import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BACKEND_URL } from "@/config/api";

const backendURL = BACKEND_URL;

/**
 * GET /api/users/me
 * Get the current authenticated user's information including finished-tutorial flag
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          user: null,
          error: "User not authenticated",
        },
        { status: 401 }
      );
    }

    // Forward request to backend with user_id as query parameter
    const response = await fetch(`${backendURL}/api/users/me?user_id=${userId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error getting current user info:", error);
    return NextResponse.json(
      {
        success: false,
        user: null,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/users/me
 * Update the current authenticated user's fields (e.g., finished-tutorial)
 */
export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: "User not authenticated",
        },
        { status: 401 }
      );
    }

    // Get the request body (fields to update)
    const body = await request.json();

    // Forward request to backend with user_id as query parameter
    const response = await fetch(`${backendURL}/api/users/me?user_id=${userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error updating current user:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}
