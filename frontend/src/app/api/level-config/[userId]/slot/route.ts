import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function PATCH(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const { userId } = params;
    const body = await request.json();

    if (!userId) {
      return NextResponse.json({ success: false, message: "User ID is required" }, { status: 400 });
    }

    if (typeof body.slot_index !== "number" || body.slot_index < 0 || body.slot_index > 6) {
      return NextResponse.json(
        { success: false, message: "slot_index must be a number between 0 and 6" },
        { status: 400 }
      );
    }

    if (typeof body.structure_id !== "string") {
      return NextResponse.json(
        { success: false, message: "structure_id must be a string" },
        { status: 400 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/api/level-config/${userId}/slot`, {
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
    console.error("Error updating slot config:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to update slot config",
      },
      { status: 500 }
    );
  }
}
