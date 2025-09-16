import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/api";

const backendURL = BACKEND_URL;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Forward the request to the FastAPI backend
    const response = await fetch(`${backendURL}/api/chat/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Forward authentication headers
        ...(request.headers.get("authorization") && {
          Authorization: request.headers.get("authorization")!,
        }),
        ...(request.headers.get("cookie") && {
          Cookie: request.headers.get("cookie")!,
        }),
        // Pass username in header if available
        ...(body.username && {
          "X-Username": body.username,
        }),
      },
      body: JSON.stringify({
        lobby_code: body.lobby_code,
        content: body.content,
      }),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error sending chat message:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
