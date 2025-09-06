import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Forward the request to the backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/hosting/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Forward any relevant headers from the original request
        ...(request.headers.get("cookie") && {
          Cookie: request.headers.get("cookie")!,
        }),
      },
      body: JSON.stringify(body),
    });

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
    console.error("Error proxying join lobby request:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
