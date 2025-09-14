import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/api";

const backendURL = BACKEND_URL;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(`${backendURL}/api/hosting/leave`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Forward cookies for authentication
        Cookie: request.headers.get("cookie") || "",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
      return NextResponse.json(
        { error: errorData.detail || "Failed to leave lobby" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("Leave lobby proxy error:", error);

    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { error: "Request timeout - backend server may be unavailable" },
        { status: 504 }
      );
    }

    return NextResponse.json({ error: "Failed to connect to backend server" }, { status: 502 });
  }
}
