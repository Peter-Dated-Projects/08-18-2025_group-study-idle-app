import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserSession, simpleDecrypt } from "@/lib/firestore";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("user_session")?.value;
    const encryptedEmail = cookieStore.get("user_email_enc")?.value;

    console.log("============================================================");
    console.log(cookieStore);

    if (!sessionId) {
      // Check if we have an encrypted email from previous login
      let previousEmail = null;
      if (encryptedEmail) {
        try {
          previousEmail = simpleDecrypt(encryptedEmail);
        } catch (error) {
          console.error("Failed to decrypt email cookie:", error);
          // Clear invalid encrypted email cookie
          cookieStore.delete("user_email_enc");
        }
      }

      return NextResponse.json({
        success: false,
        error: "No session found",
        previousEmail: previousEmail, // This can be used by frontend for UX
      });
    }

    const session = await getUserSession(sessionId);
    console.log("Retrieved: ", session);

    if (!session) {
      // Clear invalid session cookie and encrypted email
      cookieStore.delete("user_session");
      cookieStore.delete("user_email_enc");
      return NextResponse.json({ success: false, error: "Invalid session" });
    }

    console.log("Session is expired!");

    // Check if session is expired
    if (new Date(session.expires_at) < new Date(Date.now())) {
      cookieStore.delete("user_session");
      cookieStore.delete("user_email_enc");
      return NextResponse.json({ success: false, error: "Session expired" });
    }

    console.log("Session is valid:", session);

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
