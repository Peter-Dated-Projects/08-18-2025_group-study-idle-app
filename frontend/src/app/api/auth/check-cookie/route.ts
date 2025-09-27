import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;
    
    return NextResponse.json({
      hasUserCookie: !!userId
    });
  } catch (error) {
    console.error("Error checking user cookie:", error);
    return NextResponse.json({ hasUserCookie: false });
  }
}
