import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/api";

const backendURL = BACKEND_URL;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    // Forward the request to the backend
    const backendResponse = await fetch(`${backendURL}/api/hosting/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Forward any relevant headers from the original request
        ...(request.headers.get("cookie") && {
          Cookie: request.headers.get("cookie")!,
        }),
      },
      body: JSON.stringify(body),
      signal: controller.signal, // Add timeout signal
    });

    clearTimeout(timeoutId); // Clear timeout if request completes

    const responseData = await backendResponse.json();

    // Return the response with the same status code
    return NextResponse.json(responseData, {
      status: backendResponse.status,
      headers: {
        // Forward any relevant headers from backend response
        ...(backendResponse.headers.get("set-cookie") && {
          "Set-Cookie": backendResponse.headers.get("set-cookie")!,
        }),
      },
    });
  } catch (error) {
    console.error("Error proxying create lobby request:", error);

    // Check if error is due to timeout
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { detail: "Request timeout - backend server is not responding" },
        { status: 504 }
      );
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
