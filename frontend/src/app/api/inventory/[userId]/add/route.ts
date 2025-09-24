import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    const body = await request.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User ID is required" },
        { status: 400 }
      );
    }

    if (!body.structure_name || typeof body.structure_name !== "string") {
      return NextResponse.json(
        { success: false, message: "structure_name is required and must be a string" },
        { status: 400 }
      );
    }

    if (typeof body.count !== "number") {
      return NextResponse.json(
        { success: false, message: "count is required and must be a number" },
        { status: 400 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/api/inventory/${userId}/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Backend responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error adding inventory item:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to add inventory item" },
      { status: 500 }
    );
  }
}