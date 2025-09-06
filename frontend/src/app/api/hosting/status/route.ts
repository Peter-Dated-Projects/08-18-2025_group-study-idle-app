import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

export async function GET(request: NextRequest) {
  try {
    // Get the lobby_id from the query parameters
    const { searchParams } = new URL(request.url);
    const lobbyId = searchParams.get("lobby_id");

    if (!lobbyId) {
      return NextResponse.json({ error: "lobby_id parameter is required" }, { status: 400 });
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    // Forward the request to the backend
    const backendResponse = await fetch(
      `${BACKEND_URL}/api/hosting/status?lobby_id=${encodeURIComponent(lobbyId)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          // Forward any relevant headers from the original request
          ...(request.headers.get("cookie") && {
            Cookie: request.headers.get("cookie")!,
          }),
        },
        signal: controller.signal, // Add timeout signal
      }
    );

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
    console.error("Error proxying lobby status request:", error);
    
    // Check if error is due to timeout
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { detail: "Request timeout - backend server is not responding" },
        { status: 504 }
      );
    }
    
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
