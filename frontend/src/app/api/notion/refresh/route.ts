import { NextResponse } from "next/server";
import { cookies } from "next/headers";

interface TokenRefreshResponse {
  access_token: string;
  token_type: string;
  bot_id: string;
  workspace_name: string;
  workspace_icon?: string;
  workspace_id: string;
  owner: {
    type: string;
    user?: {
      object: string;
      id: string;
      name?: string;
      avatar_url?: string;
      type?: string;
      person?: Record<string, unknown>; // Replace 'any' with a more specific type
    };
  };
  duplicated_template_id?: string;
  request_id: string;
}

export async function POST() {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get("notion_token")?.value;

  if (!tokenCookie) {
    return NextResponse.json({ error: "No authentication token found" }, { status: 401 });
  }

  let tokenData;
  try {
    tokenData = JSON.parse(tokenCookie);
  } catch (error) {
    return NextResponse.json({ error: "Invalid token data" }, { status: 401 });
  }

  const { refresh_token } = tokenData;
  if (!refresh_token) {
    return NextResponse.json({ error: "No refresh token available" }, { status: 400 });
  }

  try {
    const response = await fetch("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Basic " +
          Buffer.from(
            process.env.NOTION_CLIENT_ID! + ":" + process.env.NOTION_CLIENT_SECRET!
          ).toString("base64"),
      },
      body: JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: refresh_token,
      }),
    });

    const newTokenData: TokenRefreshResponse = await response.json();

    if (!response.ok) {
      // If refresh fails, clear the stored token
      cookieStore.delete("notion_token");
      return NextResponse.json(
        {
          error: "Token refresh failed",
          details: newTokenData,
          requiresReauth: true,
        },
        { status: 401 }
      );
    }

    // Update stored token with new access token
    const updatedTokenData = {
      access_token: newTokenData.access_token,
      workspace_id: newTokenData.workspace_id,
      workspace_name: newTokenData.workspace_name,
      bot_id: newTokenData.bot_id,
      refresh_token: refresh_token, // Keep existing refresh token
    };

    cookieStore.set("notion_token", JSON.stringify(updatedTokenData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 86400, // 24 hours
    });

    return NextResponse.json({
      success: true,
      workspace_id: newTokenData.workspace_id,
      workspace_name: newTokenData.workspace_name,
    });
  } catch (error) {
    console.error("Error refreshing token:", error);
    cookieStore.delete("notion_token");
    return NextResponse.json(
      {
        error: "Internal server error during token refresh",
        requiresReauth: true,
      },
      { status: 500 }
    );
  }
}
