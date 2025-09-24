import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function PATCH(
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

    if (typeof body.currently_in_use !== "number" || body.currently_in_use < 0) {
      return NextResponse.json(
        { success: false, message: "currently_in_use is required and must be a non-negative number" },
        { status: 400 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/api/inventory/${userId}/usage`, {
      method: "PATCH",
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
    console.error("Error updating structure usage:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to update structure usage" },
      { status: 500 }
    );
  }
}