import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserSession } from "@/lib/firestore";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("user_session")?.value;

    if (!sessionId) {
      return NextResponse.json({ success: false, error: "No session found" });
    }

    const session = await getUserSession(sessionId);

    if (!session) {
      // Clear invalid session cookie
      cookieStore.delete("user_session");
      return NextResponse.json({ success: false, error: "Invalid session" });
    }

    // Check if session is expired
    if (session.expires_at < new Date()) {
      cookieStore.delete("user_session");
      return NextResponse.json({ success: false, error: "Session expired" });
    }

    return NextResponse.json({
      success: true,
      userEmail: session.userId,
      sessionId: session.sessionId,
      hasNotionTokens: !!session.notionTokens,
      selectedDatabase: session.selectedDatabase,
    });
  } catch (error) {
    console.error("Error checking session:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
