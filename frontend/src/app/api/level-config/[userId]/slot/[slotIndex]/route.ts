import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string; slotIndex: string } }
) {
  try {
    const { userId, slotIndex } = params;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User ID is required" },
        { status: 400 }
      );
    }

    const slotIndexNum = parseInt(slotIndex, 10);
    if (isNaN(slotIndexNum) || slotIndexNum < 0 || slotIndexNum > 6) {
      return NextResponse.json(
        { success: false, message: "Slot index must be a number between 0 and 6" },
        { status: 400 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/api/level-config/${userId}/slot/${slotIndex}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Backend responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching slot config:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to fetch slot config" },
      { status: 500 }
    );
  }
}