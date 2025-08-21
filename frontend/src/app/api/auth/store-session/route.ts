import { NextResponse } from "next/server";
import { storeUserSession, type UserSession } from "@/lib/firestore";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Convert string dates back to Date objects
    const userSession: UserSession = {
      ...body,
      created_at: new Date(body.created_at),
      expires_at: new Date(body.expires_at),
    };

    await storeUserSession(userSession);

    return NextResponse.json({
      success: true,
      sessionId: userSession.sessionId,
    });
  } catch (error) {
    console.error("Error storing user session:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to store user session",
      },
      { status: 500 }
    );
  }
}
