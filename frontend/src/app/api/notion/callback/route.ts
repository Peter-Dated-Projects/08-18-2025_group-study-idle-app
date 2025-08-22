import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { storeNotionTokens, getUserSession, NotionTokenData } from "@/lib/firestore";
import { NOTION_API_VERSION } from "@/components/constants";

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
          `${process.env.NOTION_OAUTH_API_CLIENT_ID}:${process.env.NOTION_OAUTH_API_CLIENT_SECRET}`
        ).toString("base64")}`,
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    // Check if we received a token response from Notion API
    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      return NextResponse.json(
        { error: "Failed to exchange code for token", details: error },
        { status: tokenResponse.status }
      );
    }

    // query notion for the token's status
    const tokenData = await tokenResponse.json();
    console.log("/api/notion/callback: tokenData:", tokenData);

    // Generate a user ID and store tokens in Firestore
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;

    // Check if valid user ID
    if (!userId) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    // Request to update the User Session data
    const notionTokenData: NotionTokenData = {
      access_token: tokenData.access_token,
      workspace_id: tokenData.workspace_id,
      workspace_name: tokenData.workspace_name || "Unknown Workspace",
      bot_id: tokenData.bot_id,
      refresh_token: tokenData.refresh_token,
      created_at: new Date(Date.now()),
      updated_at: new Date(Date.now()),
    };

    // Update the current user session with the new Notion tokens
    try {
      await storeNotionTokens(userId, notionTokenData);
      console.log("Notion tokens stored successfully");

      console.log("✅ OAuth completed - tokens stored, no automatic database discovery");
      console.log("🔍 User will manually select databases to enable in the UI");

      // Note: We no longer automatically discover and store databases
      // Users will manually select which databases to enable through the UI
    } catch (error) {
      console.error("Error storing Notion tokens:", error);
      return NextResponse.json({ error: "Failed to store Notion tokens" }, { status: 500 });
    }

    // Get return URL and clean up OAuth cookies
    const returnUrl = cookieStore.get("notion_oauth_return_url")?.value;
    cookieStore.delete("notion_oauth_state");
    cookieStore.delete("notion_oauth_return_url");

    return NextResponse.redirect(returnUrl!);
  } catch (error) {
    console.error("Error in OAuth callback:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
