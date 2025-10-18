import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/api";

const backendURL = BACKEND_URL;

export async function GET(request: NextRequest, { params }: { params: Promise<{ period: string }> }) {
  try {
    const { period } = await params;
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

    // Make request to FastAPI backend using Redis leaderboard endpoint
    const response = await fetch(`${backendURL}/api/redis-leaderboard/${period}?limit=${limit}`, {
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

    // Transform the backend response to match expected frontend format
    const transformedData = {
      success: data.success,
      leaderboard: data.entries || [], // Backend uses 'entries', frontend expects 'leaderboard'
      period: data.period,
      total_entries: data.total_entries,
      cached: data.cached,
    };

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
