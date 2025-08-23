import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserSession, getFirestoreDb, FIRESTORE_USER_SESSIONS } from "@/lib/firestore";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;

    if (!userId) {
      return NextResponse.json(
        { error: "User not authenticated", redirect: "/login" },
        { status: 401 }
      );
    }

    // Get current user session
    const session = await getUserSession(userId);
    if (!session) {
      return NextResponse.json(
        { error: "User session not found", redirect: "/login" },
        { status: 404 }
      );
    }

    // Clear Notion tokens from Firestore
    try {
      const db = getFirestoreDb();
      await db.collection(FIRESTORE_USER_SESSIONS!).doc(userId).update({
        notionTokens: null,
        selectedDatabase: null, // Also clear selected database
        updated_at: new Date(),
      });
      console.log("Notion tokens cleared successfully for user:", userId);
    } catch (error) {
      console.error("Error clearing Notion tokens:", error);
      return NextResponse.json({ error: "Failed to clear Notion tokens" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Notion logout successful",
    });
  } catch (error) {
    console.error("Error in Notion logout:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
