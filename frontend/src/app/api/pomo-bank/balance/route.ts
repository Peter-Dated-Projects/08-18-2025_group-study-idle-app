import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/api";

const backendURL = BACKEND_URL;

export async function GET(request: NextRequest) {
  try {
    // Forward the request to the FastAPI backend
    const response = await fetch(`${backendURL}/api/pomo-bank/balance`, {
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
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error getting pomo bank balance:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
