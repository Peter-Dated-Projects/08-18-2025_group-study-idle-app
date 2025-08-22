import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserSession } from "@/lib/firestore";

/**
 * Checks if user has a valid Notion Token
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;

    // Check if user is authenticated
    if (!userId) {
      console.error("No user ID found in cookies");
      return NextResponse.json(
        {
          success: false,
          authenticated: false,
          hasValidTokens: false,
          error: "No session found",
        },
        { status: 400 }
      );
    }

    // Request session
    const session = await getUserSession(userId);
    if (!session) {
      console.error("No session found");
      return NextResponse.json(
        {
          success: false,
          authenticated: false,
          hasValidTokens: false,
          error: "Invalid session",
        },
        { status: 400 }
      );
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date(Date.now())) {
      console.error("Session expired");
      return NextResponse.json(
        {
          success: false,
          authenticated: false,
          hasValidTokens: false,
          error: "Session expired",
        },
        { status: 400 }
      );
    }

    // Check if we have Notion tokens
    const hasNotionTokens = !!session.notionTokens?.access_token;

    // console.log("/api/notion/session:", "Notion tokens found:", hasNotionTokens);
    return NextResponse.json(
      {
        success: true,
        authenticated: true,
        hasValidTokens: hasNotionTokens,
        userEmail: session.userAccountInformation?.email || session.userId, // Fallback to userId if no account info
        userName: session.userAccountInformation?.userName,
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
