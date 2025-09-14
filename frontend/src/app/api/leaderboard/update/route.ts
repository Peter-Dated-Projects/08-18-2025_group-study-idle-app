import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/api";

const backendURL = BACKEND_URL;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.user_id) {
      return NextResponse.json({ success: false, message: "User ID is required" }, { status: 400 });
    }

    if (!body.duration || body.duration < 1) {
      return NextResponse.json(
        { success: false, message: "Duration must be at least 1 minute" },
        { status: 400 }
      );
    }

    // Make request to FastAPI backend
    const response = await fetch(`${backendURL}/api/leaderboard/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Backend request failed: ${response.status} - ${errorData.detail || "Unknown error"}`
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating leaderboard:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update leaderboard" },
      { status: 500 }
    );
  }
}
