import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/api";

const backendURL = BACKEND_URL;

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;

    const response = await fetch(`${backendURL}/api/users/info/${userId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error getting user info:", error);
    return NextResponse.json(
      {
        success: false,
        user: null,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
