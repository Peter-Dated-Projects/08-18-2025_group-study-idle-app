import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function GET() {
  // Generate CSRF protection state parameter
  const state = crypto.randomBytes(32).toString("hex");

  // Store state in HTTP-only cookie for verification
  const cookieStore = await cookies();
  cookieStore.set("notion_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
  });

  // Build proper OAuth URL with all required parameters
  const authUrl = new URL("https://api.notion.com/v1/oauth/authorize");
  authUrl.searchParams.set("client_id", process.env.NOTION_CLIENT_ID!);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("owner", "user");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("redirect_uri", process.env.NOTION_REDIRECT_URI!);

  return NextResponse.redirect(authUrl.toString());
}
