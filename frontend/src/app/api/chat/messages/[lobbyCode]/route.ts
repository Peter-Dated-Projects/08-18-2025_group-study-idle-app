import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/api";

const backendURL = BACKEND_URL;

export async function GET(request: NextRequest, { params }: { params: Promise<{ lobbyCode: string }> }) {
  try {
    const { lobbyCode } = await params;
    const { searchParams } = new URL(request.url);
    const startId = searchParams.get("start_id") || "-";
    const count = searchParams.get("count") || "50";

    // Forward the request to the FastAPI backend
    const response = await fetch(
      `${backendURL}/api/chat/messages/${encodeURIComponent(
        lobbyCode
      )}?start_id=${encodeURIComponent(startId)}&count=${count}`,
      {
        method: "GET",
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
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error getting chat messages:", error);
    return NextResponse.json({ success: false, messages: [], lobby_code: "" }, { status: 500 });
  }
}
