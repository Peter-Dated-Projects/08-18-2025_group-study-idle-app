import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserSession } from "@/lib/firestore";

/**
 * Checks if user has a valid Notion Token
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("user_session")?.value;

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          authenticated: false,
          hasValidTokens: false,
          error: "No session found",
        },
        { status: 401 }
      );
    }

    const session = await getUserSession(sessionId);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          authenticated: false,
          hasValidTokens: false,
          error: "Invalid session",
        },
        { status: 401 }
      );
    }

    // Check if session is expired
    if (session.expires_at < new Date()) {
      return NextResponse.json(
        {
          success: false,
          authenticated: false,
          hasValidTokens: false,
          error: "Session expired",
        },
        { status: 401 }
      );
    }

    // Check if we have Notion tokens
    const hasNotionTokens = !!session.notionTokens?.access_token;

    return NextResponse.json(
      {
        success: true,
        authenticated: true,
        hasValidTokens: hasNotionTokens,
        userEmail: session.userId,
        selectedDatabase: session.selectedDatabase,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error checking Notion auth:", error);
    return NextResponse.json(
      {
        success: false,
        authenticated: false,
        hasValidTokens: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
