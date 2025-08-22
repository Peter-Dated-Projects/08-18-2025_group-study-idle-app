import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const returnUrl = searchParams.get("returnUrl") || "/";

    // Generate a state parameter to prevent CSRF attacks
    const state = crypto.randomBytes(32).toString("hex");

    // Store the state and returnUrl in cookies for later verification
    const cookieStore = await cookies();
    console.log(cookieStore);
    cookieStore.set("notion_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
    });
    cookieStore.set("notion_oauth_return_url", returnUrl, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
    });

    // Construct the proper Notion OAuth URL

    // Build the callback URL dynamically based on the current request
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("host") || "localhost:3000";
    const redirectUri = `${protocol}://${host}/api/notion/callback`;

    const notionAuthUrl = new URL("https://api.notion.com/v1/oauth/authorize");
    notionAuthUrl.searchParams.set("client_id", process.env.NOTION_OAUTH_API_CLIENT_ID!);
    notionAuthUrl.searchParams.set("response_type", "code");
    notionAuthUrl.searchParams.set("owner", "user");
    notionAuthUrl.searchParams.set("redirect_uri", redirectUri);
    notionAuthUrl.searchParams.set("state", state);

    console.log("============================");
    console.log("Auth URL:", notionAuthUrl);
    console.log("Redirecting to Notion OAuth:", notionAuthUrl.toString());
    console.log("Callback URL:", redirectUri);
    console.log("Return URL:", returnUrl);
    console.log("============================");

    // Redirect to Notion OAuth
    return NextResponse.redirect(notionAuthUrl.toString());
  } catch (error) {
    console.error("Error starting Notion OAuth:", error);
    return NextResponse.json({ error: "Failed to start Notion authentication" }, { status: 500 });
  }
}
