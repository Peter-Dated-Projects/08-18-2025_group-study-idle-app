import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function PUT(request: NextRequest) {
  try {
    // Get the session token from cookies
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session");

    if (!sessionToken) {
      return NextResponse.json({ error: "No session found" }, { status: 401 });
    }

    // Get the request body
    const body = await request.json();

    // Forward the request to the backend
    const response = await fetch(`${BACKEND_URL}/api/inventory/bulk-update`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session=${sessionToken.value}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.detail || "Failed to bulk update inventory" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in bulk inventory update:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
