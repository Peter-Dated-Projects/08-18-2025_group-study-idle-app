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
      `${BACKEND_URL}/api/hosting/status/${encodeURIComponent(lobbyId)}`,
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

    // Handle specific cases where lobby doesn't exist or user is not a member
    if (!backendResponse.ok) {
      // If lobby doesn't exist (404) or user doesn't have access (403), 
      // return a successful response with specific flags so frontend can handle it gracefully
      if (backendResponse.status === 404 || backendResponse.status === 403) {
        return NextResponse.json({
          success: false,
          lobby_exists: false,
          is_member: false,
          message: responseData.detail || responseData.message || "Lobby not found or access denied",
          code: lobbyId
        }, { status: 200 }); // Return 200 so frontend can process the response
      }
      
      // For other errors, return the original error response
      return NextResponse.json(responseData, {
        status: backendResponse.status,
        headers: {
          // Forward any relevant headers from backend response
          ...(backendResponse.headers.get("set-cookie") && {
            "Set-Cookie": backendResponse.headers.get("set-cookie")!,
          }),
        },
      });
    }

    // Return the response with the same status code for successful requests
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
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { detail: "Request timeout - backend server is not responding" },
        { status: 504 }
      );
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
