import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/api";

const backendURL = BACKEND_URL;

export async function GET(request: NextRequest, { params }: { params: { period: string } }) {
  try {
    const { period } = params;
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") || "10";

    if (!period) {
      return NextResponse.json({ success: false, message: "Period is required" }, { status: 400 });
    }

    // Validate period
    const validPeriods = ["daily", "weekly", "monthly", "yearly"];
    if (!validPeriods.includes(period)) {
      return NextResponse.json(
        { success: false, message: "Invalid period. Must be: daily, weekly, monthly, or yearly" },
        { status: 400 }
      );
    }

    // Make request to FastAPI backend
    const response = await fetch(`${backendURL}/api/leaderboard/${period}?limit=${limit}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
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
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
