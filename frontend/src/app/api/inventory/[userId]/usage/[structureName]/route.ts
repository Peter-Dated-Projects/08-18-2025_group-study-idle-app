import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string; structureName: string } }
) {
  try {
    const { userId, structureName } = params;

    if (!userId) {
      return NextResponse.json({ success: false, message: "User ID is required" }, { status: 400 });
    }

    if (!structureName) {
      return NextResponse.json(
        { success: false, message: "Structure name is required" },
        { status: 400 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/api/inventory/${userId}/usage/${structureName}`, {
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
    console.error("Error getting structure usage:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to get structure usage",
      },
      { status: 500 }
    );
  }
}
