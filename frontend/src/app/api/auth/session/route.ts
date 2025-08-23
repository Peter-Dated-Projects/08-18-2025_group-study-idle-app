import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserSession, UserSession } from "@/lib/firestore";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;

    // console.log(cookieStore);

    // If we don't have a valid user id, then we can't retrieve the session
    if (!userId) {
      return NextResponse.json({ success: false, error: "No user ID found" });
    }

    // Try to retrieve user session using userId
    const session = await getUserSession(userId);
    // console.log("/api/auth/session: ", session);

    if (!session) {
      // Clear invalid session cookie and encrypted email
      console.warn("Session not found for user:", userId);
      cookieStore.delete("user_session");
      cookieStore.delete("user_id");
      return NextResponse.json({ success: false, error: "Invalid session" });
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date(Date.now())) {
      console.warn("Session expired for user:", userId);
      cookieStore.delete("user_session");
      cookieStore.delete("user_id");
      return NextResponse.json({ success: false, error: "Session expired" });
    }

    return NextResponse.json({
      success: true,
      userId: session.userId,
      userEmail: session.userAccountInformation?.email || session.userId, // Fallback to userId if no account info
      userName: session.userAccountInformation?.userName,
      sessionId: session.sessionId,
      hasNotionTokens: !!session.notionTokens,
    });
  } catch (error) {
    console.error("Error checking session:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
