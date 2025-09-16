import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/api";

const backendURL = BACKEND_URL;

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    // Forward the request to the FastAPI backend
    const response = await fetch(`${backendURL}/api/chat/clear`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        // Forward authentication headers
        ...(request.headers.get("authorization") && {
          Authorization: request.headers.get("authorization")!,
        }),
        ...(request.headers.get("cookie") && {
          Cookie: request.headers.get("cookie")!,
        }),
      },
      body: JSON.stringify({
        lobby_code: body.lobby_code,
      }),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error clearing chat messages:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
