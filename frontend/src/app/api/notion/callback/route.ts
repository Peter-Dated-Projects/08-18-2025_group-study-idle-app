import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { storeNotionTokens, generateSessionId } from "@/lib/firestore";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });
  if (!state) return NextResponse.json({ error: "Missing state parameter" }, { status: 400 });

  // Verify CSRF state parameter
  const cookieStore = await cookies();
  const storedState = cookieStore.get("notion_oauth_state")?.value;

  if (!storedState || storedState !== state) {
    return NextResponse.json({ error: "Invalid state parameter" }, { status: 400 });
  }

  // Clear the state cookie
  cookieStore.delete("notion_oauth_state");

  try {
    // Build dynamic redirect URI
    const requestUrl = new URL(req.url);
    const redirectUri = `${requestUrl.origin}/api/notion/callback`;

    // Exchange authorization code for tokens
    const tokenResponse = await fetch("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(
          `${process.env.NOTION_API_CLIENT_ID}:${process.env.NOTION_API_CLIENT_SECRET}`
        ).toString("base64")}`,
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      return NextResponse.json(
        { error: "Failed to exchange code for token", details: error },
        { status: tokenResponse.status }
      );
    }

    const tokenData = await tokenResponse.json();

    // Generate a session ID and store tokens in Firestore
    const sessionId = generateSessionId();

    await storeNotionTokens(sessionId, {
      access_token: tokenData.access_token,
      workspace_id: tokenData.workspace_id,
      workspace_name: tokenData.workspace_name || "Unknown Workspace",
      bot_id: tokenData.bot_id,
      refresh_token: tokenData.refresh_token,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Store only the session ID in a secure cookie
    cookieStore.set("notion_session_id", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 86400 * 30, // 30 days
      path: "/",
    });

    // Get return URL and clean up OAuth cookies
    const returnUrl = cookieStore.get("notion_return_url")?.value;
    cookieStore.delete("notion_oauth_state");
    cookieStore.delete("notion_return_url");

    // Determine redirect destination with fallbacks
    let redirectUrl: string;
    if (returnUrl && returnUrl !== url.origin) {
      // Use stored return URL if it's different from the origin
      redirectUrl = returnUrl;
      console.log(`Redirecting user back to: ${returnUrl}`);
    } else {
      // Fallback to database selection page
      redirectUrl = `${url.origin}/notion/select-database?workspace=${tokenData.workspace_id}`;
      console.log(`No return URL found, redirecting to database selection`);
    }

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("Error in OAuth callback:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
