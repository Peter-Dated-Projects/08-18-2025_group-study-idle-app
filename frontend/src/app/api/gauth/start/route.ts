import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const returnUrl = url.searchParams.get("returnUrl") || url.origin;

    // Generate CSRF protection state parameter
    const state = crypto.randomBytes(32).toString("hex");

    const cookieStore = await cookies();

    // If we're trying to log in, this means the notion cookies are invalid essentially
    // Delete them
    cookieStore.delete("notion_token");
    cookieStore.delete("notion_session_id");

    // Store state and return URL in HTTP-only cookies for verification
    cookieStore.set("google_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
    });

    cookieStore.set("google_return_url", returnUrl, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
    });

    // Build Google OAuth URL
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID!);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "email profile");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("redirect_uri", `${url.origin}/api/gauth/callback`);

    console.log("Callback URL: ", `${url.origin}/api/gauth/callback`);
    console.log("Redirecting to Google OAuth:", authUrl.toString());

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error("Error starting Google OAuth:", error);
    return NextResponse.json({ error: "Failed to start Google authentication" }, { status: 500 });
  }
}
