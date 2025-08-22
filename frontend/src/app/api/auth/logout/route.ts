import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = await cookies();

    // Clear the session cookie
    cookieStore.delete("user_session");

    // Clear the encrypted email cookie
    cookieStore.delete("user_id");

    // Clear all notion tokens too
    cookieStore.delete("notion_token");
    cookieStore.delete("notion_session_id");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error during logout:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
